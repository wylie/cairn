import type { Registration } from "@/types/domain";
import { isoAtOffset } from "@/lib/demo/dates";

export const registrations: Registration[] = [
  { id: "reg_001", customerId: "cust_002", sessionId: "sess_001", status: "confirmed", registeredAt: isoAtOffset(0, 7, 50), registrationSource: "front_desk", paymentStatus: "paid" },
  { id: "reg_002", customerId: "cust_004", sessionId: "sess_002", status: "confirmed", registeredAt: isoAtOffset(0, 8, 20), registrationSource: "online", paymentStatus: "paid" },
  { id: "reg_003", customerId: "cust_003", sessionId: "sess_002", status: "confirmed", registeredAt: isoAtOffset(-1, 10, 15), registrationSource: "online", paymentStatus: "paid" },
  { id: "reg_004", customerId: "cust_007", sessionId: "sess_008", status: "waitlisted", waitlistPosition: 1, registeredAt: isoAtOffset(0, 9, 5), registrationSource: "online", paymentStatus: "unpaid" },
  { id: "reg_005", customerId: "cust_001", sessionId: "sess_003", status: "attended", registeredAt: isoAtOffset(-4, 12, 5), registrationSource: "front_desk", paymentStatus: "included" },
  { id: "reg_006", customerId: "cust_006", sessionId: "sess_006", status: "confirmed", registeredAt: isoAtOffset(-2, 14, 10), registrationSource: "front_desk", paymentStatus: "paid" },
  { id: "reg_007", customerId: "cust_005", sessionId: "sess_006", status: "waitlisted", waitlistPosition: 2, registeredAt: isoAtOffset(-1, 16, 0), registrationSource: "online", paymentStatus: "unpaid" },
  { id: "reg_008", customerId: "cust_003", sessionId: "sess_005", status: "confirmed", registeredAt: isoAtOffset(-3, 11, 35), registrationSource: "admin", paymentStatus: "paid" },
  { id: "reg_009", customerId: "cust_004", sessionId: "sess_005", status: "confirmed", registeredAt: isoAtOffset(-3, 11, 40), registrationSource: "admin", paymentStatus: "included" },
  { id: "reg_010", customerId: "cust_001", sessionId: "sess_007", status: "confirmed", registeredAt: isoAtOffset(0, 10, 30), registrationSource: "front_desk", paymentStatus: "paid" }
];
