import { useMemo, useState } from "react";
import type { Calculation, Expense, Summary } from "../types";
import { deleteExpense } from "../api/client";
import { formatCents } from "../utils/money";

export default function ExpensesList(props: {
  token: string;
  calculation: Calculation;
  summary: Summary;
  onUpdate: (calc: Calculation, summary: Summary) => void;
  onEdit: (expense: Expense) => void;
  canEdit: boolean;
}) {
  const { token, calculation, onUpdate, onEdit, canEdit } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const nameById = useMemo(() => new Map(calculation.participants.map((p) => [p.id, p.name] as const)), [calculation.participants]);

  async function onDelete(expenseId: string) {
    if (!canEdit) return;
    if (!confirm("Eliminare questa spesa?")) return;
    setErr(null);
    setBusyId(expenseId);
    try {
      const res = await deleteExpense(token, expenseId);
      onUpdate(res.calculation, res.summary);
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {!canEdit ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Sei in <span className="font-medium">sola lettura</span>. Serve un link admin per modificare o eliminare spese.
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Spese</h2>
        <p className="text-xs text-slate-500">{calculation.expenses.length} voci</p>
      </div>

      {calculation.expenses.length === 0 ? (
        <p className="rounded-md border bg-white px-3 py-2 text-sm text-slate-600">Nessuna spesa ancora. Aggiungine una qui sopra 👆</p>
      ) : (
        <ul className="space-y-2">
          {calculation.expenses.map((e) => {
            const payerName = nameById.get(e.payerId) ?? e.payerId;
            const involvedNames = e.participantIds.map((id) => nameById.get(id) ?? id);
            return (
              <li key={e.id} className="rounded-md border bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{e.description?.trim() ? e.description : "Spesa"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pagato da <span className="font-medium">{payerName}</span> · Ripartito su{" "}
                      <span className="font-medium">{involvedNames.length}</span> {involvedNames.length === 1 ? "persona" : "persone"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{involvedNames.join(", ")}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <p className="text-sm font-semibold">{formatCents(e.amountCents)}</p>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => onEdit(e)}
                        disabled={!canEdit || busyId !== null}
                      >
                        Modifica
                      </button>
                      <button
                        className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => onDelete(e.id)}
                        disabled={!canEdit || busyId === e.id}
                      >
                        {busyId === e.id ? "..." : "Elimina"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
