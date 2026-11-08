import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { DomainError } from "../../errors";
import { receiptSchema, toDraft } from "./normalize";

const DEFAULT_MODEL = "claude-opus-5-5";

const PROMPT = `Você recebe a foto de um cupom fiscal, nota ou recibo brasileiro.
Extraia os dados exatamente como aparecem no documento.
- date: data da compra no formato YYYY-MM-DD.
- Valores monetários como texto decimal com ponto, ex.: "1234.56".
- merchant_tax_id: CNPJ ou CPF do estabelecimento, só dígitos.
- payment_method: forma de pagamento escrita no cupom (ex.: "Cartão de crédito", "Pix", "Dinheiro").
- Use null para qualquer campo que não esteja legível. Nunca invente valores.
- is_receipt: false se a imagem não for um comprovante de compra.`;

let client: Anthropic | undefined;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new DomainError(
      "A leitura de fotos não está configurada. Defina ANTHROPIC_API_KEY no arquivo .env.",
    );
  }
  client ??= new Anthropic();
  return client;
}

export type ReceiptImage = { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" };

/** Sends the photo to Claude (server-side only) and returns a draft for user review. */
export async function extractReceipt(image: ReceiptImage, attachment: string | null) {
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      // Simple extraction: low effort keeps latency and cost down.
      output_config: { effort: "low", format: betaZodOutputFormat(receiptSchema) },
      // If the model declines, the API retries on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.data.toString("base64") },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new DomainError("A chave ANTHROPIC_API_KEY é inválida.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new DomainError("Muitas leituras seguidas. Tente de novo em instantes.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Receipt extraction failed: API error ${error.status}`);
      throw new DomainError("Não foi possível ler a foto agora. Tente de novo ou lance manualmente.");
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return toDraft(null, attachment);
  }
  return toDraft(response.parsed_output, attachment);
}
