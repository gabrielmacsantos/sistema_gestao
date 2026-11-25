import type { AppNotice } from "./notifications";

// Update notes shown in the bell. Add new ones at the end; the bell sorts them newest first.
// Keep `actionUrl` empty until the store listings exist.
export const NOTICES: AppNotice[] = [
  {
    id: "2026-11-24-due-calendar",
    title: "Calendário e avisos de vencimento",
    body: "Agora você pode informar o vencimento de cada gasto e escolher ser avisado antes dele (no dia, 1, 3 ou 7 dias antes). As contas perto de vencer aparecem aqui no sino, e a nova aba Calendário mostra os vencimentos do mês: toque em um dia para ver as contas, dar baixa ou adicionar um gasto. No app, o aviso também chega como lembrete no celular.",
    date: "2026-11-24",
  },
  {
    id: "2026-11-18-shared-panel",
    title: "Painel compartilhado",
    body: "Crie um painel e convide quem mora com você pelo e-mail Google: todos veem e lançam no mesmo lugar, e cada lançamento mostra quem o fez. Abra em Perfil › Painéis compartilhados.",
    date: "2026-11-18",
  },
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
