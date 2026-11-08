import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-container-low px-margin py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
            <Wallet className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-headline-md font-bold tracking-tight text-primary">Minhas Finanças</h1>
            <p className="mt-0.5 text-body-md text-secondary">Controle total do seu fluxo de caixa.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-6 shadow-overlay">
          {children}
        </div>
      </div>
    </main>
  );
}
