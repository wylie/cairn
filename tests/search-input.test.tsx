import { render, screen } from "@testing-library/react";
import { SearchInput } from "@/components/shared/search-input";

describe("SearchInput", () => {
  it("renders vertically centered search icon and consistent input height", () => {
    render(<SearchInput value="" onChange={() => {}} label="Search something" placeholder="Search" />);

    const icon = screen.getByTestId("search-input-icon");
    const input = screen.getByLabelText("Search something");

    const iconClass = icon.getAttribute("class") ?? "";
    expect(iconClass).toContain("top-1/2");
    expect(iconClass).toContain("-translate-y-1/2");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("pl-9");
  });
});
