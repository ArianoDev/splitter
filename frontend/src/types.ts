export type Participant = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  description?: string;
  amountCents: number;
  payerId: string;
  participantIds: string[];
  createdAt?: string;
};

export type Admin = {
  id: string;
  name: string;
  createdAt?: string;
};

export type Calculation = {
  token: string;
  groupName: string;
  participants: Participant[];
  expenses: Expense[];
  admins?: Admin[];
  createdAt?: string;
  updatedAt?: string;
};

export type Balance = {
  participantId: string;
  name: string;
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

export type ApiResponse<T> = {
  calculation: Calculation;
  summary: Summary;
} & Partial<{ token: string; adminToken: string; canEdit: boolean }>;
