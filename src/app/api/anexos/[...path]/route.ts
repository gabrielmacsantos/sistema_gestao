import { getSession } from "@/server/session";
import { readUpload } from "@/server/storage";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session.userId) return new Response("Não autorizado", { status: 401 });

  const { path } = await params;
  const file = await readUpload(session.userId, path.join("/"));
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mediaType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
