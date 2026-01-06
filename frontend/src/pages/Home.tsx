import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { createCalculation, storeAdminToken } from "../api/client";

export default function Home() {
  const nav = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [member, setMember] = useState("");
  const [members, setMembers] = useState<string[]>(["Alice", "Bob"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => groupName.trim().length > 0 && members.length >= 1 && !loading, [groupName, members, loading]);

  function addMember() {
    const clean = member.trim().replace(/\s+/g, " ");
    if (!clean) return;
    if (members.some((m) => m.trim().toLowerCase() === clean.toLowerCase())) return;
    setMembers((prev) => [...prev, clean]);
    setMember("");
  }

  function removeMember(idx: number) {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await createCalculation({
        groupName: groupName.trim(),
        participants: members.map((m) => m.trim()).filter(Boolean),
        adminName: adminName.trim() || undefined,
      });
      const token = res.token!;
      if (res.adminToken) {
        storeAdminToken(token, res.adminToken);
        // carry the admin token in the URL so it can be copied/shared immediately
        nav(`/c/${token}?admin=${encodeURIComponent(res.adminToken)}`);
      } else {
        nav(`/c/${token}`);
      }
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold tracking-tight">Dividi le spese di gruppo 🧾</h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea un calcolo, aggiungi le spese, escludi chi non partecipa a una voce, e condividi un link per
          rivederlo o modificarlo più tardi.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome del gruppo</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Es. Weekend a Roma"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium">Il tuo nome (admin)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Es. Mario"
            />
            <p className="mt-2 text-xs text-slate-500">Chi crea il calcolo riceve un link admin per modificare le spese.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Aggiungi partecipanti</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                value={member}
                onChange={(e) => setMember(e.target.value)}
                placeholder="Nome"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
              <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={addMember}>
                Aggiungi
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {members.map((m, idx) => (
                <li key={`${m}-${idx}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">{m}</span>
                  <button
                    className="text-sm text-red-600 hover:text-red-700"
                    onClick={() => removeMember(idx)}
                    aria-label={`Rimuovi ${m}`}
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Suggerimento: puoi aggiungerne altri anche dopo.</p>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Nessuna registrazione. Il link è la chiave. 🔑</p>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={onCreate}
            disabled={!canSubmit}
          >
            {loading ? "Creo..." : "Crea calcolo"}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Come funziona</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Inserisci le spese con importo, pagatore e chi partecipa.</li>
          <li>Per una spesa, puoi deselezionare chi non deve contribuire.</li>
          <li>Il riepilogo calcola saldi e un set di trasferimenti chiaro (pochi pagamenti).</li>
          <li>Copia e condividi il link per continuare in seguito.</li>
        </ol>
      </Card>
    </div>
  );
}
