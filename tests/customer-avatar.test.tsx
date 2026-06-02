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

    const avatar = screen.getByRole("img", { name: "Maya Patel profile photo" });
    expect(avatar).toBeInTheDocument();
    expect(avatar.className).toContain("rounded-full");
    expect(avatar.className).toContain("aspect-square");
  });

  it("renders initials fallback when no photo exists", () => {
    render(<CustomerAvatar customer={{ firstName: "Jordan", lastName: "Kim", profilePhotoUrl: "" }} size="sm" />);
    const avatar = screen.getByLabelText("Jordan Kim initials avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar.className).toContain("rounded-full");
    expect(avatar.className).toContain("aspect-square");
  });
});
