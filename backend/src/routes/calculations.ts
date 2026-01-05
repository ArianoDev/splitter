import { Router } from "express";
import { nanoid } from "nanoid";

import { CalculationModel } from "../models/Calculation";
import { validateBody } from "../middleware/validate";
import { addParticipantSchema, createCalculationSchema, upsertExpenseSchema } from "../validators/schemas";
import { HttpError } from "../utils/httpError";
import { computeSummary } from "../services/settlement";

export const calculationsRouter = Router();

function toPublicCalculation(doc: any) {
  const obj = doc.toObject({ versionKey: false });
  delete obj._id;
  return obj;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function ensureUniqueNames(names: string[]) {
  const seen = new Set<string>();
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (seen.has(key)) {
      throw new HttpError(400, `Duplicate participant name: "${n}"`);
    }
    seen.add(key);
  }
}

calculationsRouter.post("/", validateBody(createCalculationSchema), async (req, res, next) => {
  try {
    const { groupName, participants } = req.body as { groupName: string; participants: string[] };

    const cleanNames = participants.map(normalizeName).filter(Boolean);
    ensureUniqueNames(cleanNames);

    const token = nanoid(12);
    const participantDocs = cleanNames.map((name) => ({ id: nanoid(8), name }));

    const doc = await CalculationModel.create({
      token,
      groupName: normalizeName(groupName),
      participants: participantDocs,
      expenses: [],
    });

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.status(201).json({ token, calculation, summary });
  } catch (err) {
    next(err);
  }
});

calculationsRouter.get("/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.json({ calculation, summary });
  } catch (err) {
    next(err);
  }
});

calculationsRouter.patch(
  "/:token",
  validateBody(
    // Partial update: groupName only for now
    createCalculationSchema.pick({ groupName: true }).partial()
  ),
  async (req, res, next) => {
    try {
      const token = req.params.token;
      const doc = await CalculationModel.findOne({ token }).exec();
      if (!doc) throw new HttpError(404, "Calculation not found");

      if (typeof req.body.groupName === "string") doc.groupName = normalizeName(req.body.groupName);

      await doc.save();
      const calculation = toPublicCalculation(doc);
      const summary = computeSummary(calculation.participants, calculation.expenses);

      res.json({ calculation, summary });
    } catch (err) {
      next(err);
    }
  }
);

calculationsRouter.post(
  "/:token/participants",
  validateBody(addParticipantSchema),
  async (req, res, next) => {
    try {
      const token = req.params.token;
      const { name } = req.body as { name: string };

      const doc = await CalculationModel.findOne({ token }).exec();
      if (!doc) throw new HttpError(404, "Calculation not found");

      const clean = normalizeName(name);
      const existing = doc.participants.some((p: any) => p.name.trim().toLowerCase() === clean.toLowerCase());
      if (existing) throw new HttpError(400, `Participant "${clean}" already exists`);

      doc.participants.push({ id: nanoid(8), name: clean });
      await doc.save();

      const calculation = toPublicCalculation(doc);
      const summary = computeSummary(calculation.participants, calculation.expenses);

      res.status(201).json({ calculation, summary });
    } catch (err) {
      next(err);
    }
  }
);

calculationsRouter.delete("/:token/participants/:participantId", async (req, res, next) => {
  try {
    const token = req.params.token;
    const participantId = req.params.participantId;

    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    const participant = doc.participants.find((p: any) => p.id === participantId);
    if (!participant) throw new HttpError(404, "Participant not found");

    const isPayerSomewhere = doc.expenses.some((e: any) => e.payerId === participantId);
    if (isPayerSomewhere) {
      throw new HttpError(
        400,
        `Cannot remove "${participant.name}" because they are payer in one or more expenses. Edit those expenses first.`
      );
    }

    // Remove participant
    doc.participants = doc.participants.filter((p: any) => p.id !== participantId);

    // Remove from participantIds in all expenses; keep expenses valid
    doc.expenses = doc.expenses.map((e: any) => {
      const nextIds = (e.participantIds ?? []).filter((id: string) => id !== participantId);
      if (nextIds.length === 0) {
        // If no participants left, fallback to payer only (payer still exists by check above)
        return { ...e.toObject?.() ?? e, participantIds: [e.payerId] };
      }
      return { ...e.toObject?.() ?? e, participantIds: nextIds };
    });

    await doc.save();

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.json({ calculation, summary });
  } catch (err) {
    next(err);
  }
});

calculationsRouter.post(
  "/:token/expenses",
  validateBody(upsertExpenseSchema),
  async (req, res, next) => {
    try {
      const token = req.params.token;
      const body = req.body as {
        description?: string;
        amountCents: number;
        payerId: string;
        participantIds: string[];
      };

      const doc = await CalculationModel.findOne({ token }).exec();
      if (!doc) throw new HttpError(404, "Calculation not found");

      const participantIdsSet = new Set(doc.participants.map((p: any) => p.id));

      if (!participantIdsSet.has(body.payerId)) throw new HttpError(400, "payerId is not a participant");
      const uniqueParticipantIds = Array.from(new Set(body.participantIds));
      for (const id of uniqueParticipantIds) {
        if (!participantIdsSet.has(id)) throw new HttpError(400, `Unknown participantId in expense: ${id}`);
      }
      if (uniqueParticipantIds.length === 0) throw new HttpError(400, "participantIds cannot be empty");

      doc.expenses.push({
        id: nanoid(10),
        description: body.description?.trim() ?? "",
        amountCents: body.amountCents,
        payerId: body.payerId,
        participantIds: uniqueParticipantIds,
        createdAt: new Date(),
      });

      await doc.save();

      const calculation = toPublicCalculation(doc);
      const summary = computeSummary(calculation.participants, calculation.expenses);

      res.status(201).json({ calculation, summary });
    } catch (err) {
      next(err);
    }
  }
);

calculationsRouter.put(
  "/:token/expenses/:expenseId",
  validateBody(upsertExpenseSchema),
  async (req, res, next) => {
    try {
      const token = req.params.token;
      const expenseId = req.params.expenseId;
      const body = req.body as {
        description?: string;
        amountCents: number;
        payerId: string;
        participantIds: string[];
      };

      const doc = await CalculationModel.findOne({ token }).exec();
      if (!doc) throw new HttpError(404, "Calculation not found");

      const expense = doc.expenses.find((e: any) => e.id === expenseId);
      if (!expense) throw new HttpError(404, "Expense not found");

      const participantIdsSet = new Set(doc.participants.map((p: any) => p.id));
      if (!participantIdsSet.has(body.payerId)) throw new HttpError(400, "payerId is not a participant");
      const uniqueParticipantIds = Array.from(new Set(body.participantIds));
      for (const id of uniqueParticipantIds) {
        if (!participantIdsSet.has(id)) throw new HttpError(400, `Unknown participantId in expense: ${id}`);
      }
      if (uniqueParticipantIds.length === 0) throw new HttpError(400, "participantIds cannot be empty");

      expense.description = body.description?.trim() ?? "";
      expense.amountCents = body.amountCents;
      expense.payerId = body.payerId;
      expense.participantIds = uniqueParticipantIds;

      await doc.save();

      const calculation = toPublicCalculation(doc);
      const summary = computeSummary(calculation.participants, calculation.expenses);

      res.json({ calculation, summary });
    } catch (err) {
      next(err);
    }
  }
);

calculationsRouter.delete("/:token/expenses/:expenseId", async (req, res, next) => {
  try {
    const token = req.params.token;
    const expenseId = req.params.expenseId;

    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    const before = doc.expenses.length;
    doc.expenses = doc.expenses.filter((e: any) => e.id !== expenseId);
    const after = doc.expenses.length;

    if (before === after) throw new HttpError(404, "Expense not found");

    await doc.save();

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.json({ calculation, summary });
  } catch (err) {
    next(err);
  }
});
