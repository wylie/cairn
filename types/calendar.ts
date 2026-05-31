export type SessionActivityAction =
  | "registered"
  | "waitlisted"
  | "removed"
  | "promoted"
  | "checked_in"
  | "marked_absent"
  | "rescheduled";

export type SessionActivityEvent = {
  id: string;
  sessionId: string;
  customerId?: string;
  customerName?: string;
  staffId?: string;
  staffName?: string;
  action: SessionActivityAction;
  note?: string;
  createdAt: string;
};

