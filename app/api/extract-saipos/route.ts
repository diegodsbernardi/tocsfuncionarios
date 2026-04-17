import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Você é um assistente que lê fotos de relatórios do sistema ERP Saipos, usado em restaurantes.

Sua tarefa: extrair o TOTAL DE VENDAS EM DINHEIRO do dia. Esse valor costuma aparecer em seções tipo "Meios de pagamento", "Fechamento de caixa", "Recebimentos" ou similar, com rótulos como "Dinheiro", "Espécie", "Cash" ou "DIN".

IMPORTANTE:
- Extrair APENAS o total de vendas em DINHEIRO (cédulas/moedas). Ignore cartão (crédito/débito), PIX, voucher, etc.
- Se houver múltiplas entradas "Dinheiro" (por turno, por operador, etc), some todas.
- Se não encontrar o valor ou não conseguir ler com certeza, retorne 0.
- Retorne também uma descrição curta de onde encontrou o valor (pra o usuário conferir).

Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, sem code fences.

Formato exato:
{"cash_total": 0.00, "context": "string descrevendo onde achou o valor"}`;

type Extracted = {
  cash_total: number;
  context: string;
};

function parseResponse(text: string): Extracted {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta da IA sem JSON");
  const data = JSON.parse(match[0]);
  return {
    cash_total: Number(data.cash_total) || 0,
    context: typeof data.context === "string" ? data.context.trim() : "",
  };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await req.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Imagem não enviada" }, { status: 400 });
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mediaType = (image.type || "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extraia o total de vendas em DINHEIRO deste relatório Saipos.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta vazia da IA");
    }

    const extracted = parseResponse(textBlock.text);
    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[extract-saipos] erro:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Falha ao processar imagem",
      },
      { status: 500 },
    );
  }
}
