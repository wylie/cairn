import { render, screen } from "@testing-library/react";
import { CheckInRow } from "@/components/checkins/checkin-row";
import type { CheckInLogRecord } from "@/types/domain";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";

describe("CheckInRow legacy staff attribution", () => {
  it("legacy records without staff attribution show staff not recorded", () => {
    const record = {
      id: "legacy_1",
      organizationId: "org_summit",
      locationId: "loc_001",
      customerId: "cust_legacy",
      customerName: "Legacy Person",
      membershipPassType: "Day Pass",
      entryMethod: "day_pass",
      checkInTime: "2026-05-20T10:00:00Z",
      checkOutTime: null,
      checkInSource: "manual_search",
      status: "checked-in",
      checkedInByStaffId: ""
    } as CheckInLogRecord;

    render(
      <WorkstationStateProvider>
        <CheckInRow record={record} readOnly={false} onCheckOut={() => undefined} />
      </WorkstationStateProvider>
    );

    expect(screen.getByText(/Checked in by: Staff not recorded/i)).toBeInTheDocument();
  });
});
