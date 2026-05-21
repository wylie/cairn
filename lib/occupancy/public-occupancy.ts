import { checkInRecords } from "@/lib/mocks/checkins";
import { locations } from "@/lib/mocks/locations";

const TODAY_KEY = "2026-05-20";

export function getPublicOccupancyPayload(organizationId: string, locationId: string) {
  const currentOccupancy = checkInRecords.filter(
    (record) =>
      record.organizationId === organizationId &&
      record.locationId === locationId &&
      record.checkInTime.startsWith(TODAY_KEY) &&
      record.checkOutTime === null
  ).length;

  const location = locations.find((entry) => entry.id === locationId);

  return {
    organizationId,
    locationId,
    currentOccupancy,
    capacity: location?.capacity,
    lastUpdated: new Date().toISOString(),
    publicLabel: `${currentOccupancy} currently in`
  };
}
