import { FileText, Fingerprint, Link as LinkIcon, Send, AlertTriangle, CheckCircle } from "lucide-react";

interface CopilotPanelProps {
  transaction: any | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0 pr-2">{label}</span>
      <span className="font-mono text-xs text-slate-800 text-right break-all">{value}</span>
    </div>
  );
}

export function CopilotPanel({ transaction }: CopilotPanelProps) {
  const formatAiReason = (text: string) => {
    if (!text) return null;
    return text.split(/([.;])/g).map((s, i) => s.trim() ? (
      <li key={i} className="text-slate-600 text-xs leading-relaxed">{s.replace(/^[.;]+/, "").trim()}</li>
    ) : null).filter(Boolean);
  };

  return (
    <div
      className="w-[320px] h-full flex flex-col bg-white border-l border-slate-200 flex-shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <FileText className="h-4 w-4 text-blue-600" />
        <h2 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
          Аналитическая справка ИИ
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!transaction ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <Fingerprint className="h-12 w-12 mb-3 stroke-1 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">Выберите транзакцию</p>
            <p className="text-xs text-slate-300 mt-1">для просмотра аналитики</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">

            {/* Verdict block */}
            <div className={`rounded border p-3 ${
              transaction.ai_decision === "block"
                ? "bg-red-50 border-red-200"
                : transaction.withheld_percent > 0
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Вердикт системы</span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                  transaction.ai_decision === "block"
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : transaction.withheld_percent > 0
                    ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    : "bg-green-100 text-green-700 border border-green-200"
                }`}>
                  {transaction.ai_decision === "block" ? "Блокировка" :
                   transaction.withheld_percent > 0 ? "Удержание" : "Разрешено"}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 mb-0.5">Процент удержания</div>
                  <div className="font-mono text-2xl font-bold text-slate-800">
                    {transaction.withheld_percent}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 mb-0.5">Сумма удержания</div>
                  <div className="font-mono text-sm font-semibold text-slate-700">
                    {(transaction.amount_kzt * (transaction.withheld_percent / 100)).toLocaleString("ru-KZ")} ₸
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-slate-50 rounded border border-slate-200 p-3">
              <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide mb-2">Реквизиты операции</div>
              <div>
                <DetailRow label="БИН должника" value={transaction.debtor_bin} />
                <DetailRow label="ИИН взыскателя" value={transaction.receiver_iin} />
                <DetailRow label="КНП" value={transaction.knp_code} />
                <DetailRow label="ОКЭД" value={transaction.oked_code} />
                <DetailRow label="Сумма" value={`${transaction.amount_kzt.toLocaleString("ru-KZ")} ₸`} />
              </div>
              {transaction.description && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Назначение платежа</div>
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2 font-mono leading-relaxed">
                    {transaction.description}
                  </div>
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            <div className="bg-white rounded border border-slate-200 p-3">
              <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide mb-2 flex items-center gap-1">
                {transaction.ai_decision === "block"
                  ? <AlertTriangle className="h-3 w-3 text-red-500" />
                  : <CheckCircle className="h-3 w-3 text-green-500" />
                }
                Обоснование ИИ (Gemini 2.5 Flash)
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {formatAiReason(transaction.ai_reason)}
              </ul>
            </div>

            {/* Blockchain & Telegram Status */}
            <div className="bg-slate-50 rounded border border-slate-200 p-3 space-y-2">
              <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide mb-1">Исполнение</div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Solana Devnet
                </div>
                {transaction.solana_signature ? (
                  <a
                    href={`https://explorer.solana.com/tx/${transaction.solana_signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] text-blue-600 hover:underline truncate max-w-[160px] text-right"
                  >
                    {transaction.solana_signature.slice(0, 20)}...
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Ожидание</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Send className="h-3.5 w-3.5" />
                  Telegram
                </div>
                {transaction.status === "approved" || transaction.status === "blocked" ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                    Отправлено
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Ожидание</span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
