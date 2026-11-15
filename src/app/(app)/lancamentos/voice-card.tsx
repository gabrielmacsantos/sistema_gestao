"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { parseSpokenTransaction, type SpokenTransaction, type VoiceCategory } from "@/lib/voice-parser";

// The browser's speech service (Google in Chrome/Android, Apple in Safari) turns the audio into text.
// parseSpokenTransaction only fills the form; nothing is saved until the user submits it.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const subscribeNone = () => () => {};

const CONSENT_KEY = "voice-ok";
const EXAMPLE = {
  EXPENSE: "Ex.: “Gastei 52,30 no mercado ontem”",
  INCOME: "Ex.: “Recebi 2500,00 de salário hoje”",
};
const ERRORS: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere o acesso nas configurações do navegador.",
  "service-not-allowed": "O reconhecimento de voz está bloqueado neste navegador.",
  "audio-capture": "Nenhum microfone encontrado neste aparelho.",
  network: "O reconhecimento de voz precisa de internet.",
  "language-not-supported": "Este navegador não reconhece fala em português.",
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const cssMs = (name: string, fallback: number) => {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

/** Caption swap: the old text blurs up and out, the new one comes in from below. */
function SwapText({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (value === shown) return;
    ref.current?.classList.add("is-exit");
    const t = setTimeout(() => setShown(value), cssMs("--text-swap-dur", 150));
    return () => clearTimeout(t);
  }, [value, shown]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.classList.contains("is-exit")) return;
    el.classList.remove("is-exit");
    el.classList.add("is-enter-start");
    void el.offsetHeight;
    el.classList.remove("is-enter-start");
  }, [shown]);
  return (
    <span ref={ref} className="va-swap" aria-live="polite">
      {shown}
    </span>
  );
}

function Word({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return <span className={cn("va-w", on && "is-in")}>{text}</span>;
}

type Mode = "idle" | "consent" | "listening" | "done";

export function VoiceCard({
  type,
  categories,
  onParsed,
}: {
  type: "EXPENSE" | "INCOME";
  categories: VoiceCategory[];
  onParsed: (parsed: SpokenTransaction) => void;
}) {
  const supported = useSyncExternalStore(
    subscribeNone,
    () => getCtor() !== null,
    () => false,
  );
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const session = useRef<{ rec: Recognition; text: string; error: string } | null>(null);
  const latest = useRef({ categories, onParsed });
  useEffect(() => {
    latest.current = { categories, onParsed };
  });

  const stopSilently = useCallback(() => {
    const s = session.current;
    session.current = null;
    try {
      s?.rec.abort();
    } catch {}
  }, []);
  useEffect(() => stopSilently, [stopSilently]);

  const finish = (s: { text: string; error: string }) => {
    if (!s.text) {
      setMode("idle");
      setText("");
      if (s.error !== "aborted") setError(ERRORS[s.error] ?? "Não ouvi nada. Toque no microfone e fale de novo.");
      return;
    }
    setMode("done");
    latest.current.onParsed(parseSpokenTransaction(s.text, latest.current.categories, todayISO()));
  };

  const start = () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    let rec: Recognition;
    try {
      rec = new Ctor();
    } catch {
      setError("Não foi possível usar o microfone neste navegador.");
      return;
    }
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    const s = { rec, text: "", error: "" };
    rec.onresult = (e) => {
      if (session.current !== s) return;
      s.text = Array.from(e.results, (r) => r[0].transcript)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      setText(s.text);
    };
    rec.onerror = (e) => {
      s.error = e.error;
    };
    rec.onend = () => {
      if (session.current !== s) return;
      session.current = null;
      finish(s);
    };
    session.current = s;
    setError("");
    setText("");
    setMode("listening");
    try {
      rec.start();
    } catch {
      session.current = null;
      setMode("idle");
      setError("Não foi possível usar o microfone neste navegador.");
    }
  };

  const onTap = () => {
    if (session.current) {
      try {
        session.current.rec.stop();
      } catch {}
      return;
    }
    let ok = false;
    try {
      ok = localStorage.getItem(CONSENT_KEY) === "1";
    } catch {}
    if (ok) start();
    else setMode("consent");
  };

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {}
    start();
  };

  if (!supported) return null;

  if (mode === "consent") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-container-low p-4 text-body-md text-on-surface">
        <p>
          <b>Antes de falar:</b> quem transforma sua fala em texto é o serviço de voz do navegador (Google no Chrome e
          no Android, Apple no Safari), que recebe o áudio. Os campos são só preenchidos: nada é salvo sem você
          conferir.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="rounded-lg border border-outline-variant px-3 py-2 text-label-lg"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={accept}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-label-lg text-on-primary"
          >
            <Mic size={16} aria-hidden /> Entendi, falar
          </button>
        </div>
      </div>
    );
  }

  const listening = mode === "listening";
  const words = text ? text.split(" ") : [];
  const caption = listening
    ? "Ouvindo… toque para parar"
    : mode === "done"
      ? "Toque para falar de novo"
      : "Toque para falar";

  return (
    <div className={cn("va-card", listening && "is-live")}>
      <div className="va-glow" aria-hidden />
      <div className="va-content">
        <header className="va-top">
          <span className="va-av" aria-hidden>
            <Mic size={18} />
          </span>
          <div className="va-top-text">
            <span className="va-name">Assistente de voz</span>
            <span className="va-meta">
              {error || (mode === "done" ? "Confira os campos antes de salvar." : EXAMPLE[type])}
            </span>
          </div>
        </header>
        <div className="va-divider" aria-hidden />
        <div className="va-body">
          <div className="va-bubble-row">
            <p className="va-bubble">
              <span>{type === "INCOME" ? "Qual receita você quer lançar?" : "Qual gasto você quer lançar?"}</span>
            </p>
          </div>
          <p className="va-transcript" aria-live="polite">
            {words.map((w, i) => (
              <span key={`${i}-${w}`}>
                <Word text={w} />
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>
        <div className="va-bottom">
          <span className="va-caption">
            <SwapText value={caption} />
          </span>
          <button
            type="button"
            className={cn("va-mic", listening && "is-live")}
            aria-label={listening ? "Parar de falar" : "Falar o lançamento"}
            aria-pressed={listening}
            onClick={onTap}
          >
            <span className="va-wave" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
