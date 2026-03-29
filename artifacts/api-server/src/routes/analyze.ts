import { Router, type IRouter } from "express";
import { insertTransaction } from "../lib/db.js";
import { analyzeWithGemini } from "../lib/gemini.js";
import { AnalyzePaymentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  try {
    const body = AnalyzePaymentBody.parse(req.body);

    const geminiResult = await analyzeWithGemini({
      amount: body.amount,
      description: body.description,
      knp_code: body.knp_code,
      oked_code: body.oked_code,
      receiver_iin: body.receiver_iin,
      debtor_bin: body.debtor_bin,
    });

    const tx = insertTransaction({
      debtor_bin: body.debtor_bin,
      amount_kzt: body.amount,
      description: body.description,
      knp_code: body.knp_code,
      oked_code: body.oked_code,
      receiver_iin: body.receiver_iin,
      ai_decision: geminiResult.decision,
      withheld_percent: geminiResult.percent,
      ai_reason: geminiResult.reason,
      solana_signature: null,
      status: "pending",
    });

    res.json({
      success: true,
      transaction_id: tx.id,
      decision: geminiResult.decision,
      percent: geminiResult.percent,
      reason: geminiResult.reason,
      message: `Транзакция проанализирована. Решение: ${geminiResult.decision}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Analyze error");
    res.status(500).json({ error: "Analysis failed", details: message });
  }
});

export default router;
