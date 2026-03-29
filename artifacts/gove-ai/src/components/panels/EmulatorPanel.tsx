import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { X, TerminalSquare, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAnalyzePayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  amount: z.coerce.number().positive("Введите сумму"),
  debtor_bin: z.string().min(6).max(12),
  receiver_iin: z.string().min(12).max(12),
  knp_code: z.string().min(1),
  oked_code: z.string().min(1),
  description: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

const inputClass = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono";
const labelClass = "block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide";

export function EmulatorPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 1500000,
      debtor_bin: "123456789012",
      receiver_iin: "098765432109",
      knp_code: "110",
      oked_code: "62010",
      description: "Оплата по договору №42 за услуги",
    },
  });

  const analyzeMutation = useAnalyzePayment({
    mutation: {
      onSuccess: (data) => {
        setLastResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        form.reset({
          ...form.getValues(),
          amount: Math.floor(Math.random() * 5000000) + 100000,
        });
      },
    },
  });

  const onSubmit = (data: FormValues) => {
    setLastResult(null);
    analyzeMutation.mutate({ data });
  };

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="w-[340px] h-full flex flex-col bg-white border-r border-slate-200 flex-shrink-0 z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Банк-Эмулятор</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <p className="text-xs text-slate-400 mb-4 border border-slate-200 bg-slate-50 rounded p-2">
          Симуляция банковского запроса на списание. Данные передаются в ИИ-анализатор ЧСИ.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className={labelClass}>Сумма (KZT)</label>
            <input type="number" {...form.register("amount")} className={inputClass} />
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>БИН Должника</label>
            <input {...form.register("debtor_bin")} className={inputClass} placeholder="123456789012" />
          </div>

          <div>
            <label className={labelClass}>ИИН Взыскателя</label>
            <input {...form.register("receiver_iin")} className={inputClass} placeholder="098765432109" />
          </div>

          <div>
            <label className={labelClass}>КНП (Назначение платежа)</label>
            <select {...form.register("knp_code")} className={inputClass}>
              <option value="110">110 — Оплата труда (Зарплата)</option>
              <option value="911">911 — Налоги и сборы</option>
              <option value="710">710 — Оплата B2B услуг</option>
              <option value="220">220 — Консалтинговые услуги</option>
              <option value="421">421 — Платежи нерезидентам</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>ОКЭД (Вид деятельности)</label>
            <select {...form.register("oked_code")} className={inputClass}>
              <option value="62010">62.01 — Разработка ПО</option>
              <option value="41200">41.20 — Строительство</option>
              <option value="69100">69.10 — Юридические услуги</option>
              <option value="70220">70.22 — Управленческий консалтинг</option>
              <option value="47110">47.11 — Розничная торговля</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Назначение платежа</label>
            <input {...form.register("description")} className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={analyzeMutation.isPending}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded border border-blue-600 transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 mt-2"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Анализ ИИ...</>
            ) : (
              "Отправить в ЧСИ"
            )}
          </button>
        </form>

        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded border border-slate-200 bg-slate-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Результат анализа</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-slate-500">ID: {lastResult.transaction_id?.slice(0, 8)}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                lastResult.decision === "allow"
                  ? "bg-green-100 text-green-700"
                  : lastResult.decision === "block"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {lastResult.decision}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{lastResult.message}</p>
          </motion.div>
        )}

        {analyzeMutation.isError && (
          <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-600 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{analyzeMutation.error?.message || "Ошибка анализа."}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
