import { describe, expect, it } from "vitest";
import { computeBalances, computeSummary } from "../src/services/settlement";

describe("settlement algorithm", () => {
  it("splits an expense equally and settles with 2 transfers", () => {
    const participants = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Carla" },
    ];

    const expenses = [{ id: "e1", amountCents: 3000, payerId: "a", participantIds: ["a", "b", "c"] }];

    const balances = computeBalances(participants, expenses);
    expect(balances.get("a")).toBe(2000);
    expect(balances.get("b")).toBe(-1000);
    expect(balances.get("c")).toBe(-1000);

    const summary = computeSummary(participants, expenses);
    expect(summary.transfers).toEqual([
      { fromId: "b", fromName: "Bob", toId: "a", toName: "Alice", amountCents: 1000 },
      { fromId: "c", fromName: "Carla", toId: "a", toName: "Alice", amountCents: 1000 },
    ]);
  });

  it("supports exclusions (payer not necessarily included)", () => {
    const participants = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Carla" },
    ];

    const expenses = [{ id: "e1", amountCents: 3000, payerId: "a", participantIds: ["b", "c"] }];

    const summary = computeSummary(participants, expenses);
    const bal = new Map(summary.balances.map((b) => [b.participantId, b.balanceCents]));
    expect(bal.get("a")).toBe(3000);
    expect(bal.get("b")).toBe(-1500);
    expect(bal.get("c")).toBe(-1500);

    expect(summary.transfers.length).toBe(2);
  });

  it("distributes remaining cents deterministically", () => {
    const participants = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Carla" },
    ];

    const expenses = [{ id: "e1", amountCents: 100, payerId: "a", participantIds: ["a", "b", "c"] }];

    const balances = computeBalances(participants, expenses);
    // Alice pays 100 and owes 34 => +66
    expect(balances.get("a")).toBe(66);
    // Bob owes 33
    expect(balances.get("b")).toBe(-33);
    // Carla owes 33
    expect(balances.get("c")).toBe(-33);

    // Sum must be 0
    const sum = Array.from(balances.values()).reduce((s, x) => s + x, 0);
    expect(sum).toBe(0);
  });
});
