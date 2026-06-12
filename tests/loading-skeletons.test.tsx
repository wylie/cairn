import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StaffAppLoading from "@/app/(app)/loading";
import PlatformAdminLoading from "@/app/admin/loading";
import FacilityLandingLoading from "@/app/f/[orgSlug]/loading";
import CustomerPortalLoading from "@/app/p/[orgSlug]/loading";

describe("route loading skeletons", () => {
  it("renders staff loading skeleton with metric cards and list rows", () => {
    render(<StaffAppLoading />);
    expect(screen.getByTestId("staff-loading-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("staff-loading-skeleton").querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });

  it("renders platform admin loading skeleton independently", () => {
    render(<PlatformAdminLoading />);
    expect(screen.getByTestId("platform-admin-loading-skeleton")).toBeInTheDocument();
  });

  it("renders facility and customer portal loading skeletons", () => {
    render(
      <>
        <FacilityLandingLoading />
        <CustomerPortalLoading />
      </>
    );
    expect(screen.getByTestId("facility-loading-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("customer-portal-loading-skeleton")).toBeInTheDocument();
  });
});
