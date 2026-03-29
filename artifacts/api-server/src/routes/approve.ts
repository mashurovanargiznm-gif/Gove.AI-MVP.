import { Router, type IRouter } from "express";
import { getTransaction, updateTransaction } from "../lib/db.js";
import { executeTransfer } from "../lib/solana.js";
import { sendTelegramNotification } from "../lib/telegram.js";
import { ApproveTransactionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/approve", async (req, res) => {
  try {
    const body = ApproveTransactionBody.parse(req.body);
    const tx = getTransaction(body.transaction_id);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    if (tx.status !== "pending") {
      res.status(400).json({ error: "Transaction already processed", status: tx.status });
      return;
    }

    if (tx.ai_decision === "block") {
      updateTransaction(tx.id, { status: "blocked" });

      try {
        await sendTelegramNotification(
          `⚖️ <b>Gove.AI | Удержание исполнено</b>\n🏢 Должник: <b>БИН: ${tx.debtor_bin}</b>\n🛑 Вердикт: ${tx.ai_decision.toUpperCase()} (${tx.withheld_percent}%)\n💸 Платёж заблокирован системой ЧСИ`
        );
      } catch (tgErr) {
        req.log.warn({ tgErr }, "Telegram notification failed");
      }

      res.json({
        success: true,
        status: "blocked",
        percent: tx.withheld_percent,
        message: "Транзакция заблокирована согласно решению AI",
      });
      return;
    }

    let solanaSignature = "";
    try {
      solanaSignature = await executeTransfer();
    } catch (solanaErr) {
      const msg = solanaErr instanceof Error ? solanaErr.message : String(solanaErr);
      req.log.error({ solanaErrMsg: msg, solanaErrType: solanaErr?.constructor?.name }, "Solana transfer failed");

      const isInsufficientFunds =
        msg.toLowerCase().includes("insufficient") ||
        msg.toLowerCase().includes("0x1") ||
        msg.toLowerCase().includes("custom program error") ||
        msg.toLowerCase().includes("lamports") ||
        msg.toLowerCase().includes("airdrop");

      if (isInsufficientFunds) {
        res.status(402).json({
          error: "INSUFFICIENT_SOL",
          details: `Ошибка блокчейна: ${msg}`,
          faucet_url: "https://faucet.solana.com",
        });
      } else {
        res.status(500).json({ error: "Solana transfer failed", details: msg });
      }
      return;
    }

    updateTransaction(tx.id, { status: "approved", solana_signature: solanaSignature });

    try {
      const decisionLabel =
        tx.ai_decision === "split" ? "УДЕРЖАНИЕ" :
        tx.ai_decision === "allow" ? "РАЗРЕШЕНО" :
        tx.ai_decision.toUpperCase();

      await sendTelegramNotification(
        `⚖️ <b>Gove.AI | Удержание исполнено</b>\n🏢 Должник: БИН: <code>${tx.debtor_bin}</code>\n🛑 Вердикт: ${decisionLabel} (${tx.withheld_percent}%)\n💸 Удержано в бюджет: 0.2 SOL (Демо-транзакция)\n\n🔗 Чек операции (Блокчейн): <code>${solanaSignature}</code>`
      );
    } catch (tgErr) {
      req.log.warn({ tgErr }, "Telegram notification failed");
    }

    const withheldAmount = (tx.amount_kzt * tx.withheld_percent) / 100;

    res.json({
      success: true,
      status: "approved",
      solana_signature: solanaSignature,
      withheld_amount: withheldAmount,
      percent: tx.withheld_percent,
      message: `Транзакция утверждена. Удержано 0.2 SOL в бюджет.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Approve error");
    res.status(500).json({ error: "Approval failed", details: message });
  }
});

export default router;
