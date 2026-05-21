import { getPublicOccupancyPayload } from "@/lib/occupancy/public-occupancy";

describe("Public occupancy placeholder", () => {
  it("returns current occupancy and lastUpdated without private customer data", () => {
    const payload = getPublicOccupancyPayload("org_summit", "loc_001");

    expect(payload.organizationId).toBe("org_summit");
    expect(payload.locationId).toBe("loc_001");
    expect(typeof payload.currentOccupancy).toBe("number");
    expect(payload.lastUpdated).toBeTruthy();
    expect(Object.keys(payload).includes("customers")).toBe(false);
  });
});
