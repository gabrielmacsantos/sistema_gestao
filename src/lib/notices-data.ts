import type { AppNotice } from "./notifications";

// Update notes shown in the bell. Add new ones at the end; the bell sorts them newest first.
// Keep `actionUrl` empty until the store listings exist.
export const NOTICES: AppNotice[] = [
  {
    id: "2026-11-15-quick-assistant",
    title: "Atalhos rápidos",
    body: "O balão no canto da tela abre o chat de lançamentos (fale ou escreva) e uma calculadora que funciona sem internet.",
    date: "2026-11-15",
  },
  {
    id: "2026-11-15-google-login",
    title: "Entrar com o Google",
    body: "Agora você entra com a sua conta Google, sem criar token nem senha extra.",
    date: "2026-11-15",
  },
  {
    id: "2026-11-14-voice-assistant",
    title: "Assistente de voz",
    body: "Fale o lançamento no formulário e o app preenche valor, categoria e data para você revisar.",
    date: "2026-11-14",
  },
  {
    id: "2026-11-10-hide-values",
    title: "Ocultar valores",
    body: "Toque no olho do cabeçalho para esconder os valores da tela quando houver alguém por perto.",
    date: "2026-11-10",
  },
];
