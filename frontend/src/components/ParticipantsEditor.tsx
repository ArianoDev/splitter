import { useMemo, useState } from "react";
import type { Calculation, Summary } from "../types";
import { addParticipant, removeParticipant, updateGroupName } from "../api/client";

export default function ParticipantsEditor(props: {
  token: string;
  calculation: Calculation;
  summary: Summary;
  onUpdate: (calc: Calculation, summary: Summary) => void;
  canEdit: boolean;
}) {
  const { token, calculation, onUpdate, canEdit } = props;

  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [groupName, setGroupName] = useState(calculation.groupName);

  const groupChanged = useMemo(() => groupName.trim() !== calculation.groupName.trim(), [groupName, calculation.groupName]);

  async function onSaveGroupName() {
    if (!canEdit) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await updateGroupName(token, groupName.trim());
      onUpdate(res.calculation, res.summary);
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd() {
    if (!canEdit) return;
    const clean = newName.trim().replace(/\s+/g, " ");
    if (!clean) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await addParticipant(token, clean);
      onUpdate(res.calculation, res.summary);
      setNewName("");
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(participantId: string) {
    if (!canEdit) return;
    if (!confirm("Rimuovere questo partecipante?")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await removeParticipant(token, participantId);
      onUpdate(res.calculation, res.summary);
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Sei in <span className="font-medium">sola lettura</span>. Serve un link admin per modificare gruppo e partecipanti.
        </p>
      ) : null}
      <div>
        <label className="text-sm font-medium">Nome del gruppo</label>
        <div className="mt-1 flex gap-2">
          <input
            className="w-full rounded-md border px-3 py-2 disabled:bg-slate-50"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={!canEdit || busy}
          />
          <button
            className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={onSaveGroupName}
            disabled={!canEdit || busy || !groupChanged}
          >
            Salva
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div className="w-full">
            <label className="text-sm font-medium">Aggiungi partecipante</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome"
                disabled={!canEdit || busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAdd();
                  }
                }}
              />
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={onAdd}
                disabled={!canEdit || busy}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {calculation.participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">{p.name}</span>
              <button
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                onClick={() => onRemove(p.id)}
                disabled={!canEdit || busy}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Nota: se un partecipante è pagatore di una spesa, va prima cambiato/aggiustato nelle spese.
        </p>
      </div>

      {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
