import { render, screen } from "@testing-library/react";
import { CustomerAvatar } from "@/components/customers/customer-avatar";

describe("CustomerAvatar", () => {
  it("renders profile photo when present", () => {
    render(
      <CustomerAvatar
        customer={{ firstName: "Maya", lastName: "Patel", profilePhotoUrl: "/uploads/maya.jpg" }}
        size="sm"
      />
    );

    expect(screen.getByRole("img", { name: "Maya Patel profile photo" })).toBeInTheDocument();
  });

  it("renders initials fallback when no photo exists", () => {
    render(<CustomerAvatar customer={{ firstName: "Jordan", lastName: "Kim", profilePhotoUrl: "" }} size="sm" />);
    expect(screen.getByLabelText("Jordan Kim initials avatar")).toBeInTheDocument();
  });
});

