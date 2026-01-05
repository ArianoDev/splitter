import type { Summary } from "../types";
import { formatCents } from "../utils/money";

export default function SummaryView({ summary }: { summary: Summary }) {
  const sortedBalances = [...summary.balances].sort((a, b) => b.balanceCents - a.balanceCents);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Riepilogo</h2>
        <p className="text-xs text-slate-500">Totale spese: {formatCents(summary.totalExpensesCents)}</p>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">Partecipante</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {sortedBalances.map((b) => {
              const status =
                b.balanceCents > 0 ? "Riceve" : b.balanceCents < 0 ? "Deve pagare" : "OK";
              return (
                <tr key={b.participantId} className="border-t">
                  <td className="px-3 py-2">{b.name}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCents(b.balanceCents)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border bg-white p-4">
        <h3 className="text-sm font-semibold">Chi paga chi</h3>
        {summary.transfers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Tutto a posto: nessun trasferimento necessario 🎉</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {summary.transfers.map((t, idx) => (
              <li key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{t.fromName}</span> → <span className="font-medium">{t.toName}</span>
                </span>
                <span className="font-semibold">{formatCents(t.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Nota: l'algoritmo cerca di ridurre il numero di transazioni.
        </p>
      </div>
    </div>
  );
}
