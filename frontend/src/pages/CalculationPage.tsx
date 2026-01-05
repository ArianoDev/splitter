import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { Calculation, Expense, Summary } from "../types";
import { fetchCalculation } from "../api/client";
import Card from "../components/Card";
import ParticipantsEditor from "../components/ParticipantsEditor";
import ExpenseForm from "../components/ExpenseForm";
import ExpensesList from "../components/ExpensesList";
import SummaryView from "../components/Summary";
import ShareLink from "../components/ShareLink";

export default function CalculationPage() {
  const { token = "" } = useParams();

  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCalculation(token);
      setCalculation(res.calculation);
      setSummary(res.summary);
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function onUpdate(calc: Calculation, sum: Summary) {
    setCalculation(calc);
    setSummary(sum);
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
          </div>
          <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={load}>
            Aggiorna
          </button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <ParticipantsEditor token={token} calculation={calculation} summary={summary} onUpdate={onUpdate} />
        </Card>

        <Card>
          <ShareLink token={token} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <ExpenseForm
            token={token}
            participants={calculation.participants}
            editing={editing}
            onUpdate={onUpdate}
            onCancelEdit={() => setEditing(null)}
          />
        </Card>

        <Card>
          <SummaryView summary={summary} />
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
            //window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Card>
    </div>
  );
}
