import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../transactions.db");

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    debtor_bin TEXT NOT NULL,
    amount_kzt REAL NOT NULL,
    description TEXT NOT NULL,
    knp_code TEXT NOT NULL,
    oked_code TEXT NOT NULL,
    receiver_iin TEXT NOT NULL,
    ai_decision TEXT NOT NULL,
    withheld_percent INTEGER NOT NULL DEFAULT 0,
    ai_reason TEXT NOT NULL,
    solana_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  )
`);

export interface Transaction {
  id: string;
  created_at: string;
  debtor_bin: string;
  amount_kzt: number;
  description: string;
  knp_code: string;
  oked_code: string;
  receiver_iin: string;
  ai_decision: string;
  withheld_percent: number;
  ai_reason: string;
  solana_signature: string | null;
  status: "pending" | "approved" | "blocked";
}

export function insertTransaction(data: Omit<Transaction, "id" | "created_at">): Transaction {
  const id = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO transactions
      (id, debtor_bin, amount_kzt, description, knp_code, oked_code, receiver_iin,
       ai_decision, withheld_percent, ai_reason, solana_signature, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.debtor_bin,
    data.amount_kzt,
    data.description,
    data.knp_code,
    data.oked_code,
    data.receiver_iin,
    data.ai_decision,
    data.withheld_percent,
    data.ai_reason,
    data.solana_signature ?? null,
    data.status
  );
  return getTransaction(id)!;
}

export function getTransaction(id: string): Transaction | null {
  const stmt = db.prepare("SELECT * FROM transactions WHERE id = ?");
  return stmt.get(id) as Transaction | null;
}

export function updateTransaction(id: string, updates: Partial<Transaction>): void {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const fields = keys.map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), id];
  db.prepare(`UPDATE transactions SET ${fields} WHERE id = ?`).run(...values);
}

export function getAllTransactions(): Transaction[] {
  return db.prepare("SELECT * FROM transactions ORDER BY created_at DESC").all() as Transaction[];
}
