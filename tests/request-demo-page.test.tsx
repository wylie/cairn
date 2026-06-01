import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RequestDemoPage from "@/app/request-demo/page";

describe("Request demo page", () => {
  it("renders live demo request form fields", () => {
    render(<RequestDemoPage />);
    expect(screen.getByRole("heading", { name: "Request Live Demo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Facility Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
