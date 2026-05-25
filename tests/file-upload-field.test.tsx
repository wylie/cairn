import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileUploadField } from "@/components/shared/file-upload-field";

describe("FileUploadField", () => {
  it("renders aligned upload controls and default filename", () => {
    render(<FileUploadField label="Upload logo" onFileSelect={() => undefined} />);
    expect(screen.getByText("Upload logo")).toBeInTheDocument();
    expect(screen.getByText("No file selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();
  });

  it("shows selected filename and remove action", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    render(<FileUploadField label="Upload favicon" filename="favicon.png" onFileSelect={onFileSelect} onRemove={() => undefined} />);

    expect(screen.getByText("favicon.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();

    const input = screen.getByLabelText("Upload favicon");
    const file = new File(["x"], "next-favicon.png", { type: "image/png" });
    await user.upload(input, file);
    expect(onFileSelect).toHaveBeenCalled();
  });
});
