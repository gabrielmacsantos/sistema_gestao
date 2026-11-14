import { googleConfig } from "@/server/integrations/google-oauth";
import { GoogleButton } from "./google-button";

/** Google first, e-mail below; without a Google client in .env only the e-mail form shows. */
export function GoogleSignIn({ error }: { error?: string }) {
  if (!googleConfig()) return null;
  return (
    <div className="mb-5 flex flex-col gap-5">
      <GoogleButton error={error} />
      <div className="flex items-center gap-3 text-label-sm text-secondary" role="separator">
        <span className="h-px flex-1 bg-hairline" aria-hidden />
        ou entre com e-mail
        <span className="h-px flex-1 bg-hairline" aria-hidden />
      </div>
    </div>
  );
}
