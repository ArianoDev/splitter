import { useMemo, useState } from "react";

export default function ShareLink({ token }: { token: string }) {
  const link = useMemo(() => `${window.location.origin}/c/${token}`, [token]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback
      prompt("Copia il link:", link);
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
        url: link,
      });
    } catch {
      // user cancelled, ignore
    }
  }

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("Calcolo spese di gruppo");
    const body = encodeURIComponent(`Ecco il link per vedere/modificare il calcolo:

${link}
`);
    return `mailto:?subject=${subject}&body=${body}`;
  }, [link]);

  const whatsapp = useMemo(() => {
    const text = encodeURIComponent(`Ecco il link del calcolo spese:
${link}`);
    return `https://wa.me/?text=${text}`;
  }, [link]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Condivisione</h2>
        <span className="text-xs text-slate-500">token: {token}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={link} readOnly aria-label="Link condivisibile" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" onClick={copy}>
          {copied ? "Copiato ✓" : "Copia link"}
        </button>
      </div>

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
        Chi ha il link può consultare e modificare il calcolo. Trattalo come una chiave condivisa 🔐
      </p>
    </div>
  );
}
