import { useMemo, useState } from "react";
import { getStoredAdminToken } from "../api/client";

export default function ShareLink({ token, canEdit }: { token: string; canEdit: boolean }) {
  const viewLink = useMemo(() => `${window.location.origin}/c/${token}`, [token]);
  const adminToken = getStoredAdminToken(token);
  const adminLink = useMemo(
    () => (adminToken ? `${window.location.origin}/c/${token}?admin=${encodeURIComponent(adminToken)}` : null),
    [token, adminToken]
  );
  const [copied, setCopied] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(viewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback
      prompt("Copia il link:", viewLink);
    }
  }

  async function copyAdmin() {
    if (!adminLink) return;
    try {
      await navigator.clipboard.writeText(adminLink);
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 1200);
    } catch {
      // fallback
      prompt("Copia il link admin:", adminLink);
    }
  }

  async function nativeShare() {
    // @ts-expect-error - Web Share API not in all TS libs
    const canShare = typeof navigator.share === "function";
    if (!canShare) return;
    try {
      // @ts-expect-error - Web Share API
      await navigator.share({
        title: "Calcolo spese di gruppo",
        text: "Ecco il link del calcolo:",
        url: viewLink,
      });
    } catch {
      // user cancelled, ignore
    }
  }

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("Calcolo spese di gruppo");
    const body = encodeURIComponent(`Ecco il link per vedere il calcolo:

${viewLink}
`);
    return `mailto:?subject=${subject}&body=${body}`;
  }, [viewLink]);

  const whatsapp = useMemo(() => {
    const text = encodeURIComponent(`Ecco il link del calcolo spese (sola lettura):
${viewLink}`);
    return `https://wa.me/?text=${text}`;
  }, [viewLink]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Condivisione</h2>
        <span className="text-xs text-slate-500">token: {token}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={viewLink} readOnly aria-label="Link condivisibile" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" onClick={copy}>
          {copied ? "Copiato ✓" : "Copia link"}
        </button>
      </div>

      {adminLink ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            value={adminLink}
            readOnly
            aria-label="Link admin"
          />
          <button
            className="rounded-md border bg-white px-4 py-2 text-sm hover:bg-slate-50"
            onClick={copyAdmin}
            type="button"
          >
            {copiedAdmin ? "Copiato ✓" : "Copia link admin"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={nativeShare} type="button">
          Condividi…
        </button>
        <a className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" href={mailto}>
          Email
        </a>
        <a className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50" href={whatsapp} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>

      <p className="text-xs text-slate-500">
        Il <span className="font-medium">link principale</span> è per consultazione (sola lettura). Il <span className="font-medium">link admin</span> abilita le modifiche.
        {canEdit ? "" : " Se non vedi il link admin, significa che non sei admin."}
      </p>
    </div>
  );
}
