export type Participant = { id: string; name: string };
export type Expense = {
  id: string;
  description?: string;
  amountCents: number;
  payerId: string;
  participantIds: string[];
  createdAt?: Date | string;
};

export type Balance = {
  participantId: string;
  name: string;
  // Positive = should receive; Negative = should pay
  balanceCents: number;
};

export type Transfer = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
};

export type Summary = {
  totalExpensesCents: number;
  balances: Balance[];
  transfers: Transfer[];
};

function assertIntegerCents(n: number) {
  if (!Number.isInteger(n) || !Number.isFinite(n)) {
    throw new Error(`Invalid amountCents: ${n}`);
  }
}

/**
 * Compute balances (paid - owed) in integer cents.
 *
 * Splitting rule:
 * - The expense amount is divided equally across participantIds
 * - Any remaining cents are assigned +1 cent to the first participants, in the order given
 *   (deterministic, keeps total consistent).
 */
export function computeBalances(participants: Participant[], expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const p of participants) balances.set(p.id, 0);

  for (const e of expenses) {
    assertIntegerCents(e.amountCents);

    const payerBal = balances.get(e.payerId);
    if (payerBal === undefined) {
      // Unknown payer: skip silently (should be prevented by validation)
      continue;
    }

    const ids = (e.participantIds ?? []).filter((id) => balances.has(id));
    if (ids.length === 0) {
      // No participants: ignore the expense (should be prevented by validation)
      continue;
    }

    // Payer paid the full amount
    balances.set(e.payerId, payerBal + e.amountCents);

    const n = ids.length;
    const baseShare = Math.floor(e.amountCents / n);
    const remainder = e.amountCents % n;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const prev = balances.get(id)!;
      const share = baseShare + (i < remainder ? 1 : 0);
      balances.set(id, prev - share);
    }
  }

  return balances;
}

/**
 * Greedy settlement between debtors and creditors.
 * Produces a small set of transfers (usually close to minimal).
 */
export function computeTransfers(participants: Participant[], balances: Map<string, number>): Transfer[] {
  const nameById = new Map(participants.map((p) => [p.id, p.name] as const));

  const creditors = Array.from(balances.entries())
    .filter(([, bal]) => bal > 0)
    .map(([id, bal]) => ({ id, bal }))
    .sort((a, b) => b.bal - a.bal);

  const debtors = Array.from(balances.entries())
    .filter(([, bal]) => bal < 0)
    .map(([id, bal]) => ({ id, owed: -bal }))
    .sort((a, b) => b.owed - a.owed);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    const amount = Math.min(d.owed, c.bal);
    if (amount > 0) {
      transfers.push({
        fromId: d.id,
        fromName: nameById.get(d.id) ?? d.id,
        toId: c.id,
        toName: nameById.get(c.id) ?? c.id,
        amountCents: amount,
      });
    }

    d.owed -= amount;
    c.bal -= amount;

    if (d.owed === 0) i++;
    if (c.bal === 0) j++;
  }

  return transfers;
}

export function computeSummary(participants: Participant[], expenses: Expense[]): Summary {
  const balancesMap = computeBalances(participants, expenses);

  const balances: Balance[] = participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    balanceCents: balancesMap.get(p.id) ?? 0,
  }));

  const totalExpensesCents = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);

  const transfers = computeTransfers(participants, balancesMap);

  return {
    totalExpensesCents,
    balances,
    transfers,
  };
}
