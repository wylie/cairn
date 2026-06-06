import type { Customer, CustomerAccessRecord, MembershipCardEvent } from "@/types/domain";

export type MembershipCardStatus = "active" | "expiring_soon" | "expired" | "frozen" | "suspended" | "cancelled";

const BASE32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EXPIRING_SOON_DAYS = 30;

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function encodeHash(value: string, length: number) {
  let seed = hashString(value);
  let output = "";
  while (output.length < length) {
    output += BASE32_ALPHABET[seed % BASE32_ALPHABET.length];
    seed = Math.imul(seed ^ output.length, 1103515245) + 12345;
    seed >>>= 0;
  }
  return output.slice(0, length);
}

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(date: Date, today = new Date()) {
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMembershipCardStatus(record: Pick<CustomerAccessRecord, "status" | "expirationDate">, today = new Date()): MembershipCardStatus {
  if (record.status === "cancelled") return "cancelled";
  if (record.status === "suspended") return "suspended";
  if (record.status === "frozen" || record.status === "paused") return "frozen";
  if (record.status === "expired") return "expired";

  const expiration = toDate(record.expirationDate);
  if (expiration) {
    const remaining = daysUntil(expiration, today);
    if (remaining < 0) return "expired";
    if (remaining <= EXPIRING_SOON_DAYS) return "expiring_soon";
  }
  return "active";
}

export function getMembershipCardStatusLabel(status: MembershipCardStatus) {
  if (status === "expiring_soon") return "Expiring Soon";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getMembershipCardStatusTone(status: MembershipCardStatus): "success" | "warning" | "danger" | "muted" {
  if (status === "active") return "success";
  if (status === "expiring_soon" || status === "frozen") return "warning";
  if (status === "suspended") return "muted";
  return "danger";
}

export function getMembershipNumber(input: {
  customer: Pick<Customer, "id" | "memberId">;
  accessRecord: Pick<CustomerAccessRecord, "id">;
  orgSlug: string;
}) {
  const customerPart = encodeHash(`${input.orgSlug}:${input.customer.id}:${input.customer.memberId}`, 4);
  const membershipPart = encodeHash(`${input.accessRecord.id}:${input.customer.id}`, 6);
  return `${input.orgSlug.slice(0, 3).toUpperCase()}-${customerPart}-${membershipPart}`;
}

export function getMembershipQrToken(input: {
  customer: Pick<Customer, "id" | "memberId">;
  accessRecord: Pick<CustomerAccessRecord, "id">;
  orgSlug: string;
}) {
  return `CM-${encodeHash(`${input.orgSlug}:${input.accessRecord.id}:${input.customer.id}:${input.customer.memberId}`, 18)}`;
}

export function getMembershipBarcodeValue(input: {
  customer: Pick<Customer, "id" | "memberId">;
  accessRecord: Pick<CustomerAccessRecord, "id">;
  orgSlug: string;
}) {
  return `BAR-${encodeHash(`${input.orgSlug}:${input.customer.id}:${input.accessRecord.id}`, 16)}`;
}

export function buildMembershipCardSearchTerms(input: {
  customer: Pick<Customer, "id" | "memberId">;
  accessRecord: Pick<CustomerAccessRecord, "id">;
  orgSlug: string;
}) {
  const membershipNumber = getMembershipNumber(input);
  const qrToken = getMembershipQrToken(input);
  const barcodeValue = getMembershipBarcodeValue(input);
  return [membershipNumber, qrToken, barcodeValue];
}

export function buildMembershipCardRecord(
  customer: Pick<Customer, "id" | "memberId">,
  accessRecord: Pick<CustomerAccessRecord, "id">,
  orgSlug: string
) {
  return {
    membershipNumber: getMembershipNumber({ customer, accessRecord, orgSlug }),
    qrToken: getMembershipQrToken({ customer, accessRecord, orgSlug }),
    barcodeValue: getMembershipBarcodeValue({ customer, accessRecord, orgSlug })
  };
}

export function selectPrimaryMembershipCardRecord(records: CustomerAccessRecord[]) {
  const rank: Record<MembershipCardStatus, number> = {
    active: 0,
    expiring_soon: 1,
    frozen: 2,
    suspended: 3,
    expired: 4,
    cancelled: 5
  };

  return [...records]
    .filter((record) => record.type === "membership" || record.type === "household-membership" || record.type === "staff-access")
    .sort((left, right) => {
      const leftStatus = getMembershipCardStatus(left);
      const rightStatus = getMembershipCardStatus(right);
      if (rank[leftStatus] !== rank[rightStatus]) return rank[leftStatus] - rank[rightStatus];
      return (right.expirationDate ?? "").localeCompare(left.expirationDate ?? "");
    })[0];
}

export function isMembershipCardQueryMatch(
  query: string,
  customer: Pick<Customer, "id" | "memberId">,
  accessRecord: Pick<CustomerAccessRecord, "id">,
  orgSlug: string
) {
  const trimmed = query.trim().toUpperCase();
  if (!trimmed) return false;
  return buildMembershipCardSearchTerms({ customer, accessRecord, orgSlug }).some((value) => value.toUpperCase() === trimmed);
}

export function buildMembershipCardMatrix(token: string, size = 29) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const placeFinder = (x: number, y: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const edge = row === 0 || row === 6 || col === 0 || col === 6;
        const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[y + row][x + col] = edge || center;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  let bitCursor = 0;
  let hash = hashString(token);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);
      if (inFinder) continue;
      if ((row === 7 && col < 8) || (col === 7 && row < 8)) continue;
      if ((row === size - 8 && col < 8) || (col === size - 8 && row < 8)) continue;
      if ((row + col) % 7 === 0) {
        matrix[row][col] = true;
        continue;
      }
      const nextBit = (hash >> (bitCursor % 24)) & 1;
      matrix[row][col] = nextBit === 1;
      bitCursor += 1;
      if (bitCursor % 24 === 0) hash = hashString(`${token}:${row}:${col}:${hash}`);
    }
  }

  return matrix;
}

export function summarizeMembershipCardUsage(events: MembershipCardEvent[]) {
  return {
    viewed: events.filter((event) => event.action === "viewed").length,
    qrCheckIns: events.filter((event) => event.action === "qr_check_in").length
  };
}
