import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CheckboxField,
  FORM_CONTROL_CLASS,
  FORM_TEXTAREA_CLASS,
  FormField,
  FormGrid,
  SelectInput,
  TextInput,
  TextareaInput
} from "@/components/shared/form-layout";

describe("Form standards", () => {
  it("renders labels above standard inputs", () => {
    render(
      <FormGrid>
        <FormField label="First name">
          <TextInput aria-label="First name input" />
        </FormField>
        <FormField label="Role">
          <SelectInput aria-label="Role input">
            <option>Manager</option>
          </SelectInput>
        </FormField>
      </FormGrid>
    );

    const label = screen.getByText("First name");
    const input = screen.getByLabelText("First name input");
    expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses standardized textarea styling", () => {
    render(<TextareaInput aria-label="Notes textarea" />);
    const textarea = screen.getByLabelText("Notes textarea");
    for (const className of FORM_TEXTAREA_CLASS.split(" ")) {
      expect(textarea).toHaveClass(className);
    }
  });

  it("uses standardized control styling for text/select", () => {
    render(
      <div>
        <TextInput aria-label="Text control" />
        <SelectInput aria-label="Select control">
          <option>One</option>
        </SelectInput>
      </div>
    );

    const text = screen.getByLabelText("Text control");
    const select = screen.getByLabelText("Select control");
    for (const className of FORM_CONTROL_CLASS.split(" ")) {
      expect(text).toHaveClass(className);
      expect(select).toHaveClass(className);
    }
  });

  it("renders checkbox fields with inline label pattern", () => {
    render(<CheckboxField label="Allow refunds" checked={false} onChange={() => undefined} />);
    expect(screen.getByRole("checkbox", { name: "Allow refunds" })).toBeInTheDocument();
  });
});
