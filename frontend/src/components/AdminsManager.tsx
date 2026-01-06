import { useMemo, useState } from "react";

import type { Calculation, Summary } from "../types";
import { createAdmin, deleteAdmin } from "../api/client";

export default function AdminsManager(props: {
  token: string;
  calculation: Calculation;
  onUpdate: (calc: Calculation, summary: Summary) => void;
}) {
  const { token, calculation, onUpdate } = props;

  const admins = calculation.admins ?? [];
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<null | { name: string; adminToken: string }>(null);

  const linkFor = useMemo(() => {
    return (adminToken: string) => `${window.location.origin}/c/${token}?admin=${encodeURIComponent(adminToken)}`;
  }, [token]);

  async function onAdd() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await createAdmin(token, clean);
      onUpdate(res.calculation, res.summary);
      setCreated({ name: clean, adminToken: res.adminToken });
      setName("");
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(adminId: string, adminName: string) {
    if (!confirm(`Rimuovere l'admin "${adminName}"?`)) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await deleteAdmin(token, adminId);
      onUpdate(res.calculation, res.summary);
    } catch (e: any) {
      setErr(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      prompt("Copia:", text);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Admin</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gli admin possono modificare spese e partecipanti. Puoi aggiungerne uno o più, ognuno con il suo link admin.
        </p>
      </div>

      {admins.length === 0 ? (
        <p className="rounded-md border bg-white px-3 py-2 text-sm text-slate-600">
          Nessun admin configurato. (Modalità legacy) Crea il primo admin per proteggere il calcolo.
        </p>
      ) : (
        <ul className="space-y-2">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                {a.createdAt ? <p className="text-xs text-slate-500">Creato: {new Date(a.createdAt).toLocaleString()}</p> : null}
              </div>
              <button
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                onClick={() => onRemove(a.id, a.name)}
                disabled={busy || admins.length <= 1}
                title={admins.length <= 1 ? "Serve almeno un admin" : "Rimuovi"}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-md border p-3">
        <p className="text-sm font-medium">Aggiungi un admin</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome admin (es. Giulia)"
          />
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={onAdd}
            disabled={busy}
            type="button"
          >
            {busy ? "..." : "Crea link admin"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Il token admin viene mostrato una sola volta: copialo e condividilo con la persona giusta. 🔐
        </p>
      </div>

      {created ? (
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">Link admin creato per {created.name}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={linkFor(created.adminToken)} readOnly />
            <button
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              type="button"
              onClick={() => copy(linkFor(created.adminToken))}
            >
              Copia
            </button>
          </div>
        </div>
      ) : null}

      {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
