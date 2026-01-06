import { Router } from "express";
import { nanoid } from "nanoid";

import { CalculationModel } from "../models/Calculation";
import { validateBody } from "../middleware/validate";
import {
  addParticipantSchema,
  createAdminSchema,
  createCalculationSchema,
  upsertExpenseSchema,
} from "../validators/schemas";
import { HttpError } from "../utils/httpError";
import { computeSummary } from "../services/settlement";
import { generateAdminToken, hashAdminToken, safeEqualHash } from "../utils/adminToken";
import { log } from "console";

export const calculationsRouter = Router();

function toPublicCalculation(doc: any) {
  const obj = doc.toObject({ versionKey: false });
  delete obj._id;
  if (Array.isArray(obj.admins)) {
    // Never expose tokenHash to clients
    obj.admins = obj.admins.map((a: any) => ({ id: a.id, name: a.name, createdAt: a.createdAt }));
  }
  return obj;
}

function getAdminTokenFromReq(req: any): string | null {
  const h = req.header?.("x-admin-token");
  if (typeof h === "string" && h.trim()) return h.trim();

  // optional: allow admin token in query for quick manual testing
  const q = req.query?.admin;
  if (typeof q === "string" && q.trim()) return q.trim();
  const q2 = req.query?.adminToken;
  if (typeof q2 === "string" && q2.trim()) return q2.trim();
  return null;
}

function hasValidAdmin(doc: any, adminToken: string | null): boolean {
  const admins = doc?.admins ?? [];
  if (!Array.isArray(admins) || admins.length === 0) {
    // Legacy/open calculation (created before admins were introduced)
    return true;
  }
  if (!adminToken) return false;
  const hash = hashAdminToken(adminToken);
  return admins.some((a: any) => typeof a.tokenHash === "string" && safeEqualHash(a.tokenHash, hash));
}

function requireAdmin(doc: any, req: any) {
  const admins = doc?.admins ?? [];
  if (!Array.isArray(admins) || admins.length === 0) {
    // Legacy/open calculation
    return;
  }
  const token = getAdminTokenFromReq(req);
  if (!token) throw new HttpError(403, "Admin token required");
  if (!hasValidAdmin(doc, token)) throw new HttpError(403, "Invalid admin token");
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
    const { groupName, participants, adminName } = req.body as {
      groupName: string;
      participants: string[];
      adminName?: string;
    };

    const cleanNames = participants.map(normalizeName).filter(Boolean);
    ensureUniqueNames(cleanNames);

    const token = nanoid(12);
    const participantDocs = cleanNames.map((name) => ({ id: nanoid(8), name }));

    const adminToken = generateAdminToken();
    const adminDoc = {
      id: nanoid(8),
      name: normalizeName(adminName ?? "Admin"),
      tokenHash: hashAdminToken(adminToken),
      createdAt: new Date(),
    };

    const doc = await CalculationModel.create({
      token,
      groupName: normalizeName(groupName),
      participants: participantDocs,
      expenses: [],
      admins: [adminDoc],
    });

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.status(201).json({ token, adminToken, canEdit: true, calculation, summary });
  } catch (err) {
    next(err);
  }
});

calculationsRouter.get("/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    const adminToken = getAdminTokenFromReq(req);
    const canEdit = hasValidAdmin(doc, adminToken);

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);

    res.json({ calculation, summary, canEdit });
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

      requireAdmin(doc, req);

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

      requireAdmin(doc, req);

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

    requireAdmin(doc, req);

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

      requireAdmin(doc, req);

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

      requireAdmin(doc, req);

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

    requireAdmin(doc, req);

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

// ---- Admin management ----

calculationsRouter.get("/:token/admins", async (req, res, next) => {
  try {
    const token = req.params.token;
    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    requireAdmin(doc, req);

    const calculation = toPublicCalculation(doc);
    res.json({ admins: calculation.admins ?? [] });
  } catch (err) {
    next(err);
  }
});

calculationsRouter.post(
  "/:token/admins",
  validateBody(createAdminSchema),
  async (req, res, next) => {
    try {
      const token = req.params.token;
      const { name } = req.body as { name: string };

      const doc = await CalculationModel.findOne({ token }).exec();
      if (!doc) throw new HttpError(404, "Calculation not found");

      requireAdmin(doc, req);

      const clean = normalizeName(name);
      const existing = (doc.admins ?? []).some((a: any) => a.name?.trim?.().toLowerCase?.() === clean.toLowerCase());
      if (existing) throw new HttpError(400, `Admin "${clean}" already exists`);

      const newAdminToken = generateAdminToken();
      const newAdmin = {
        id: nanoid(8),
        name: clean,
        tokenHash: hashAdminToken(newAdminToken),
        createdAt: new Date(),
      };

      doc.admins = [...(doc.admins ?? []), newAdmin];
      await doc.save();

      const calculation = toPublicCalculation(doc);
      const summary = computeSummary(calculation.participants, calculation.expenses);

      res.status(201).json({ calculation, summary, adminToken: newAdminToken, admin: { id: newAdmin.id, name: newAdmin.name, createdAt: newAdmin.createdAt } });
    } catch (err) {
      next(err);
    }
  }
);

calculationsRouter.delete("/:token/admins/:adminId", async (req, res, next) => {
  try {
    const token = req.params.token;
    const adminId = req.params.adminId;

    const doc = await CalculationModel.findOne({ token }).exec();
    if (!doc) throw new HttpError(404, "Calculation not found");

    requireAdmin(doc, req);

    const admins = Array.isArray(doc.admins) ? doc.admins : [];
    const exists = admins.some((a: any) => a.id === adminId);
    if (!exists) throw new HttpError(404, "Admin not found");
    if (admins.length <= 1) throw new HttpError(400, "Cannot remove the last admin");

    doc.admins = admins.filter((a: any) => a.id !== adminId);
    await doc.save();

    const calculation = toPublicCalculation(doc);
    const summary = computeSummary(calculation.participants, calculation.expenses);
    res.json({ calculation, summary });
  } catch (err) {
    next(err);
  }
});
