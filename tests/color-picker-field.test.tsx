import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColorPickerField, isValidHexColor } from "@/components/shared/color-picker-field";

describe("ColorPickerField", () => {
  it("renders with synchronized picker and hex input", () => {
    render(<ColorPickerField label="Primary brand color" value="#0E9AC8" onChange={() => undefined} />);
    expect(screen.getByLabelText("Primary brand color picker")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary brand color")).toHaveValue("#0E9AC8");
  });

  it("hex input updates via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPickerField label="Secondary brand color" value="#1F2937" onChange={onChange} />);
    const input = screen.getByLabelText("Secondary brand color");
    await user.clear(input);
    await user.type(input, "#123456");
    expect(onChange).toHaveBeenCalled();
  });

  it("picker updates hex value via onChange", async () => {
    const onChange = vi.fn();
    render(<ColorPickerField label="Brand color" value="#1F2937" onChange={onChange} />);
    const picker = screen.getByLabelText("Brand color picker") as HTMLInputElement;
    fireEvent.change(picker, { target: { value: "#abcdef" } });
    expect(onChange).toHaveBeenCalledWith("#ABCDEF");
  });

  it("shows validation error for invalid hex", () => {
    render(<ColorPickerField label="Brand color" value="blue" onChange={() => undefined} />);
    expect(screen.getByText("Enter a valid 6-digit hex color (for example, #0E9AC8)."))
      .toBeInTheDocument();
    expect(isValidHexColor("blue")).toBe(false);
  });
});
