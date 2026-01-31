import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import type { Calculation, Expense, Summary } from "../types";
import { clearStoredAdminToken, fetchCalculation, storeAdminToken } from "../api/client";
import Card from "../components/Card";
import ParticipantsEditor from "../components/ParticipantsEditor";
import ExpenseForm from "../components/ExpenseForm";
import ExpensesList from "../components/ExpensesList";
import SummaryView from "../components/Summary";
import ShareLink from "../components/ShareLink";
import AdminsManager from "../components/AdminsManager";

export default function CalculationPage() {
  const { token = "" } = useParams();
  const location = useLocation();

  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  const adminFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("admin");
  }, [location.search]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCalculation(token);
      setCalculation(res.calculation);
      setSummary(res.summary);
      setCanEdit(Boolean(res.canEdit));
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    if (adminFromUrl) {
      storeAdminToken(token, adminFromUrl);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, adminFromUrl]);

  function onUpdate(calc: Calculation, sum: Summary) {
    setCalculation(calc);
    setSummary(sum);
  }

  function onSetAdminToken(input: string) {
    const raw = input.trim();
    if (!raw) return;

    // allow pasting a full link
    try {
      const u = new URL(raw);
      const p = new URLSearchParams(u.search);
      const admin = p.get("admin");
      if (admin) {
        storeAdminToken(token, admin);
        load();
        return;
      }
    } catch {
      // ignore
    }

    // otherwise assume it's the raw token
    storeAdminToken(token, raw);
    load();
  }

  function onExitAdmin() {
    clearStoredAdminToken(token);
    setCanEdit(false);
    load();
  }

  if (!token) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Token mancante.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-slate-900 underline">
          Torna alla home
        </Link>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Caricamento…</p>
      </Card>
    );
  }

  if (error || !calculation || !summary) {
    return (
      <Card>
        <p className="text-sm text-red-700">Errore: {error ?? "Dati non disponibili"}</p>
        <div className="mt-3 flex gap-3">
          <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={load}>
            Riprova
          </button>
          <Link to="/" className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50">
            Home
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{calculation.groupName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Inserisci le spese, poi controlla il riepilogo. Il link resta valido per modifiche future.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canEdit ? (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Modalità admin ✓
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  Sola lettura
                </span>
              )}
              {canEdit ? (
                <button className="text-xs text-slate-600 underline hover:text-slate-900" onClick={onExitAdmin} type="button">
                  Esci da admin
                </button>
              ) : null}
            </div>
          </div>
          <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={load}>
            Aggiorna
          </button>
        </div>
      </Card>

      {!canEdit ? (
        <Card>
          <h2 className="text-base font-semibold">Vuoi modificare questo calcolo?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Per evitare modifiche accidentali, solo gli admin possono aggiungere/modificare spese e partecipanti.
            Incolla qui un <span className="font-medium">link admin</span> (o il token admin) per abilitare le modifiche.
          </p>
          <AdminUnlock onSetAdminToken={onSetAdminToken} />
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <ParticipantsEditor token={token} calculation={calculation} summary={summary} onUpdate={onUpdate} canEdit={canEdit} />
        </Card>

        <Card>
          <ShareLink token={token} canEdit={canEdit} />
        </Card>
      </div>

      {canEdit ? (
        <Card>
          <AdminsManager token={token} calculation={calculation} onUpdate={onUpdate} />
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <ExpenseForm
            token={token}
            participants={calculation.participants}
            editing={editing}
            onUpdate={onUpdate}
            onCancelEdit={() => setEditing(null)}
            canEdit={canEdit}
          />
        </Card>

        <Card>
          <SummaryView token={token} summary={summary} onUpdate={onUpdate} />
        </Card>
      </div>

      <Card>
        <ExpensesList
          token={token}
          calculation={calculation}
          summary={summary}
          onUpdate={onUpdate}
          onEdit={(e) => {
            setEditing(e);
            document.getElementById("expense-form")?.scrollIntoView({ block:"center", behavior: "smooth" }) ;
          }}
          canEdit={canEdit}
        />
      </Card>
    </div>
  );
}

function AdminUnlock({ onSetAdminToken }: { onSetAdminToken: (s: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        className="w-full rounded-md border bg-white px-3 py-2 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Incolla link admin o token…"
        aria-label="Link o token admin"
      />
      <button
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        onClick={() => onSetAdminToken(value)}
        type="button"
      >
        Attiva modifiche
      </button>
    </div>
  );
}
