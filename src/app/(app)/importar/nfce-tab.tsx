"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { decodeQrFromFile, decodeQrFromVideo } from "./image";

const noopSubscribe = () => () => {};

export function NfceTab({ onQr, busy }: { onQr: (text: string) => void; busy: boolean }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  // getUserMedia only exists on secure origins (https or localhost).
  const cameraSupported = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.mediaDevices?.getUserMedia,
    () => true,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | undefined;
    let frame = 0;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = () => {
          if (stopped || !videoRef.current || !canvasRef.current) return;
          const text = decodeQrFromVideo(videoRef.current, canvasRef.current);
          if (text) {
            setScanning(false);
            onQr(text);
            return;
          }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("Não foi possível acessar a câmera. Use a opção de enviar uma foto do QR Code.");
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, onQr]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const text = await decodeQrFromFile(file);
    if (text) onQr(text);
    else setError("Não encontramos um QR Code na imagem. Tente uma foto mais próxima e nítida.");
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-secondary">
        Leia o QR Code do cupom fiscal (NFC-e). Os dados da compra são buscados no site da SEFAZ.
      </p>

      {scanning ? (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} className="aspect-square w-full max-w-sm rounded-lg bg-black object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <Button variant="secondary" onClick={() => setScanning(false)} className="self-start">
            Parar câmera
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {cameraSupported && (
            <Button onClick={() => { setError(null); setScanning(true); }} disabled={busy}>
              <Camera className="size-4" aria-hidden /> Escanear com a câmera
            </Button>
          )}
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md font-medium hover:bg-surface-container-low">
            <ImageUp className="size-4" aria-hidden /> Foto do QR Code
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {error && <p className="text-body-md text-danger">{error}</p>}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onQr(manual.trim());
        }}
      >
        <Field label="Ou cole o link do QR Code" htmlFor="qr-url">
          <Input
            id="qr-url"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="https://...fazenda...gov.br/...?p=..."
            inputMode="url"
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy || !manual.trim()} className="self-start">
          Buscar nota
        </Button>
      </form>
    </div>
  );
}
