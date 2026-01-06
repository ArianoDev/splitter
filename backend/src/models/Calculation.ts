import mongoose, { Schema, InferSchemaType } from "mongoose";

const ParticipantSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const ExpenseSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, default: "" },
    amountCents: { type: Number, required: true, min: 1 },
    payerId: { type: String, required: true },
    participantIds: { type: [String], required: true, default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const AdminSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    // sha256(adminToken) in hex
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const CalculationSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    groupName: { type: String, required: true },
    participants: { type: [ParticipantSchema], required: true, default: [] },
    expenses: { type: [ExpenseSchema], required: true, default: [] },
    admins: { type: [AdminSchema], required: true, default: [] },
  },
  { timestamps: true }
);

export type CalculationDocument = InferSchemaType<typeof CalculationSchema>;

export const CalculationModel =
  mongoose.models.Calculation || mongoose.model("Calculation", CalculationSchema);
