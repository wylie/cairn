import { render, screen } from "@testing-library/react";
import { StaffAvatar } from "@/components/staff/staff-avatar";

describe("StaffAvatar", () => {
  it("renders staff photo when present", () => {
    render(
      <StaffAvatar
        staff={{ firstName: "Maya", lastName: "Lopez", profilePhotoUrl: "/uploads/maya-lopez.jpg" }}
        size="sm"
      />
    );

    expect(screen.getByRole("img", { name: "Maya Lopez staff photo" })).toBeInTheDocument();
  });

  it("renders initials fallback when no staff photo exists", () => {
    render(<StaffAvatar staff={{ firstName: "Sam", lastName: "Rivera", profilePhotoUrl: "" }} size="sm" />);
    expect(screen.getByLabelText("Sam Rivera staff initials avatar")).toBeInTheDocument();
  });
});
