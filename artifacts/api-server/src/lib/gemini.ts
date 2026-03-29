import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env["GOOGLE_API_KEY"];
if (!apiKey) throw new Error("GOOGLE_API_KEY must be set");

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface GeminiDecision {
  decision: "allow" | "split" | "block";
  percent: number;
  reason: string;
}

export async function analyzeWithGemini(params: {
  amount: number;
  description: string;
  knp_code: string;
  oked_code: string;
  receiver_iin: string;
  debtor_bin: string;
}): Promise<GeminiDecision> {
  const prompt = `Ты — AI-аналитик системы контроля платежей для судебных исполнителей Казахстана (ЧСИ).
Проанализируй входящий платёж и определи решение согласно правилам:

Правило 1 (Белый список): Если КНП связан с зарплатой ("110") или налогами ("911") → решение "allow", процент удержания 0%.
Правило 2 (B2B норма): Если это корректный B2B платёж (КНП "710") → решение "split", процент удержания 15%.
Правило 3 (Мошенничество): Если есть несоответствие КНП и ОКЭД (например, КНП "Консалтинг" но ОКЭД "Строительство"), ИЛИ ИИН получателя = "010101010101" → решение "block", процент 100%.

Параметры платежа:
- БИН должника: ${params.debtor_bin}
- Сумма: ${params.amount} KZT
- Описание: ${params.description}
- КНП (код назначения платежа): ${params.knp_code}
- ОКЭД (вид деятельности): ${params.oked_code}
- ИИН получателя: ${params.receiver_iin}

Верни СТРОГО JSON без markdown, без пояснений:
{"decision": "allow|split|block", "percent": 0|15|100, "reason": "Подробное объяснение на русском языке почему принято данное решение, с указанием конкретных КНП и ОКЭД кодов"}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Gemini returned invalid JSON: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as GeminiDecision;

  if (!["allow", "split", "block"].includes(parsed.decision)) {
    throw new Error(`Invalid decision from Gemini: ${parsed.decision}`);
  }

  return parsed;
}
