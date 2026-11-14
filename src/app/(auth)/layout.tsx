import { LockKeyhole, ScanEye, Wallet } from "lucide-react";

const PROMISES = [
  { icon: LockKeyhole, title: "Seus dados são só seus", text: "Tudo fica neste computador, separado por conta. Nada de anúncios ou rastreamento." },
  { icon: ScanEye, title: "Você confere antes", text: "Nota fiscal, foto e extrato passam por uma revisão antes de virar lançamento." },
  { icon: Wallet, title: "Contas exatas", text: "Valores em centavos, sem arredondamentos escondidos." },
];

/** Welcome screen: the value proposition beside the sign-in card from lg, stacked on phones. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container-low px-margin py-10 md:px-margin-tablet">
      {/* Big screens (TVs at full 4K) scale the whole block instead of leaving it tiny in the middle. */}
      <div className="grid w-full max-w-sm items-center gap-8 lg:max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:gap-16 2xl:max-w-6xl min-[2400px]:[zoom:1.5] min-[3200px]:[zoom:2]">
        <section className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm lg:size-14">
            <Wallet className="size-6 lg:size-7" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-headline-md font-bold tracking-tight text-primary lg:text-headline-lg">
              Minhas Finanças
            </h1>
            <p className="mt-1 text-body-md text-secondary lg:text-body-lg">
              Controle total do seu fluxo de caixa, com privacidade.
            </p>
          </div>
          <ul className="hidden flex-col gap-4 lg:flex">
            {PROMISES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-sm">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span>
                  <span className="block text-label-lg text-on-surface">{title}</span>
                  <span className="block text-body-md text-secondary">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="w-full rounded-2xl border border-hairline bg-surface-container-lowest p-6 shadow-overlay lg:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
