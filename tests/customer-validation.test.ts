import {
  getPhoneDigits,
  normalizeCustomerInput,
  normalizeCustomerSearchQuery,
  normalizePhone,
  validateCustomerInput
} from "@/lib/customer-validation";

describe("customer validation utilities", () => {
  it("normalizes customer search and phone input consistently", () => {
    expect(normalizeCustomerSearchQuery("  Nina    Stone  ")).toBe("Nina Stone");
    expect(normalizePhone("828 555 0101")).toBe("(828) 555-0101");
    expect(normalizePhone("1-828-555-0101")).toBe("+1 (828) 555-0101");
    expect(getPhoneDigits("+1 (828) 555-0101")).toBe("18285550101");
  });

  it("preserves entered values while returning clear validation errors", () => {
    const normalized = normalizeCustomerInput({
      firstName: "  ",
      lastName: "Stone",
      dateOfBirth: "2999-01-01",
      email: "not-email",
      phone: "828 555 0101",
      addressLine1: " 100 Main st ",
      city: " asheville ",
      state: "north carolina",
      postalCode: "28801",
      emergencyContactName: "Avery Stone",
      emergencyContactPhone: "8285550102"
    });
    const validation = validateCustomerInput(normalized);

    expect(normalized.lastName).toBe("Stone");
    expect(normalized.phone).toBe("(828) 555-0101");
    expect(normalized.addressLine1).toBe("100 Main St");
    expect(validation.ok).toBe(false);
    expect(validation.fieldErrors.firstName).toBe("First name is required.");
    expect(validation.fieldErrors.email).toBe("Enter a valid email address.");
    expect(validation.fieldErrors.dateOfBirth).toBe("Date of birth cannot be in the future.");
    expect(validation.fieldErrors.state).toBe("Use a valid 2-letter US state code.");
  });
});
