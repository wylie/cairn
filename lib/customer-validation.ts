import { isValidUsState, normalizeCity, normalizeStateInput, normalizeStreetAddress } from "@/lib/customer-input-format";

export type CustomerValidationInput = {
  firstName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
  pronouns?: string | null;
  customPronouns?: string | null;
  memberId?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  profilePhotoUrl?: string | null;
  householdId?: string | null;
  active?: boolean;
};

export type NormalizedCustomerInput = {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  pronouns: string | null;
  customPronouns: string | null;
  memberId: string | null;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  profilePhotoUrl: string | null;
  householdId?: string | null;
  active: boolean;
};

export type CustomerValidationResult = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCustomerSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

export function normalizePhone(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed.replace(/\s+/g, " ");
}

export function getPhoneDigits(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

export function normalizeCustomerInput(input: CustomerValidationInput): NormalizedCustomerInput {
  return {
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    preferredName: normalizeOptional(input.preferredName),
    pronouns: normalizeOptional(input.pronouns),
    customPronouns: normalizeOptional(input.customPronouns),
    memberId: normalizeOptional(input.memberId),
    birthDate: normalizeOptional(input.birthDate ?? input.dateOfBirth),
    email: normalizeOptional(input.email)?.toLowerCase() ?? null,
    phone: normalizePhone(input.phone),
    addressLine1: normalizeOptional(normalizeStreetAddress(input.addressLine1 ?? "")),
    addressLine2: normalizeOptional(normalizeStreetAddress(input.addressLine2 ?? "")),
    city: normalizeOptional(normalizeCity(input.city ?? "")),
    state: normalizeOptional(normalizeStateInput(input.state ?? "")),
    postalCode: normalizeOptional(input.postalCode),
    emergencyContactName: normalizeOptional(input.emergencyContactName),
    emergencyContactPhone: normalizePhone(input.emergencyContactPhone),
    notes: normalizeOptional(input.notes),
    profilePhotoUrl: normalizeOptional(input.profilePhotoUrl),
    householdId: input.householdId === undefined ? undefined : normalizeOptional(input.householdId),
    active: input.active ?? true
  };
}

export function validateCustomerInput(input: NormalizedCustomerInput): CustomerValidationResult {
  const fieldErrors: Record<string, string> = {};
  if (!input.firstName) fieldErrors.firstName = "First name is required.";
  if (!input.lastName) fieldErrors.lastName = "Last name is required.";
  if (!input.birthDate) fieldErrors.dateOfBirth = "Date of birth is required.";
  if (!input.phone) fieldErrors.phone = "Phone is required.";
  if (!input.addressLine1) fieldErrors.addressLine1 = "Address line 1 is required.";
  if (!input.city) fieldErrors.city = "City is required.";
  if (!input.state) fieldErrors.state = "State is required.";
  if (!input.postalCode) fieldErrors.postalCode = "ZIP/postal code is required.";
  if (!input.emergencyContactName) fieldErrors.emergencyContactName = "Emergency contact name is required.";
  if (!input.emergencyContactPhone) fieldErrors.emergencyContactPhone = "Emergency contact phone is required.";

  if (input.email && !EMAIL_PATTERN.test(input.email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (input.birthDate) {
    const birthDate = new Date(`${input.birthDate}T00:00:00Z`);
    if (Number.isNaN(birthDate.getTime())) {
      fieldErrors.dateOfBirth = "Enter a valid date of birth.";
    } else if (birthDate > new Date()) {
      fieldErrors.dateOfBirth = "Date of birth cannot be in the future.";
    }
  }

  if (input.state && !isValidUsState(input.state)) {
    fieldErrors.state = "Use a valid 2-letter US state code.";
  }

  const firstError = Object.values(fieldErrors)[0] ?? "";
  return {
    ok: !firstError,
    message: firstError,
    fieldErrors
  };
}
