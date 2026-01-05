import { useEffect, useMemo, useState } from "react";
import type { Expense, Participant, Summary, Calculation } from "../types";
import { parseEuroToCents } from "../utils/money";
import { addExpense, updateExpense } from "../api/client";

export default function ExpenseForm(props: {
  token: string;
  participants: Participant[];
  editing?: Expense | null;
  onUpdate: (calc: Calculation, summary: Summary) => void;
  onCancelEdit?: () => void;
}) {
  const { token, participants, editing, onUpdate, onCancelEdit } = props;

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState(participants[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(participants.map((p) => p.id));

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setDescription(editing.description ?? "");
      setAmountStr((editing.amountCents / 100).toFixed(2).replace(".", ","));
      setPayerId(editing.payerId);
      setSelectedIds(editing.participantIds);
    } else {
      setDescription("");
      setAmountStr("");
      setPayerId(participants[0]?.id ?? "");
      setSelectedIds(participants.map((p) => p.id));
    }
  }, [editing, participants]);

  const amountCents = useMemo(() => parseEuroToCents(amountStr), [amountStr]);
  const canSubmit = useMemo(() => !busy && !!payerId && (amountCents ?? 0) > 0 && selectedIds.length > 0, [busy, payerId, amountCents, selectedIds.length]);

  function toggleParticipant(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(participants.map((p) => p.id));
  }
  function selectNone() {
    setSelectedIds([]);
  }

  async function onSubmit() {
    setErr(null);
    if (amountCents == null || amountCents <= 0) {
      setErr("Inserisci un importo valido (es. 12,50).");
      return;
    }
    if (selectedIds.length === 0) {
      setErr("Seleziona almeno un partecipante per la ripartizione.");
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        const res = await updateExpense(token, editing.id, {
          description: description.trim(),
          amountCents,
          payerId,
          participantIds: selectedIds,
        });
        onUpdate(res.calculation, res.summary);
        onCancelEdit?.();
      } else {
        const res = await addExpense(token, {
          description: description.trim(),
          amountCents,
          payerId,
          participantIds: selectedIds,
        });
        onUpdate(res.calculation, res.summary);
        setDescription("");
        setAmountStr("");
        setPayerId(participants[0]?.id ?? "");
        setSelectedIds(participants.map((p) => p.id));
      }
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="expense-form" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{editing ? "Modifica spesa" : "Aggiungi spesa"}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Descrizione</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Es. Cena, Benzina, Biglietti..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Importo</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="Es. 12,50"
            inputMode="decimal"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-sm font-medium">Pagato da</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Ripartisci su</p>
          <div className="flex gap-2">
            <button className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50" onClick={selectAll} type="button">
              Tutti
            </button>
            <button className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50" onClick={selectNone} type="button">
              Nessuno
            </button>
          </div>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {participants.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleParticipant(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Deseleziona chi è escluso da questa spesa. Il pagatore può anche essere escluso (es. regalo).
        </p>
      </div>

      {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}

      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <button className="rounded-md bg-red-700 px-4 py-2 text-smfont-medium text-white hover:bg-red-600" onClick={onCancelEdit}>
            Annulla
          </button>
        ) : null}
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {busy ? "Salvo..." : editing ? "Salva modifiche" : "Aggiungi"}
        </button>
      </div>
    </div>
  );
}
