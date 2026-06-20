import { getReleaseNotesHref, latestRelease, type ReleaseNote } from "@/lib/releases/release-notes";
import type { CommunicationRecord } from "@/types/domain";

export function buildReleaseNotification(
  release: ReleaseNote = latestRelease,
  options: { organizationId: string; locationId?: string } = { organizationId: "org_summit" }
): CommunicationRecord {
  const message = `Cairn has been updated to v${release.version}. View what's new.`;
  return {
    id: `comm_release_${release.version.replaceAll(".", "_")}`,
    organizationId: options.organizationId,
    locationId: options.locationId,
    channel: "system_notification",
    status: "sent",
    recipientType: "staff",
    recipientLabel: "Facility staff",
    subject: "Cairn Updated",
    message,
    body: message,
    source: "system_alert",
    isTransactional: true,
    sender: { kind: "system", name: "Cairn" },
    sentAt: `${release.releaseDate}T18:00:00Z`,
    createdAt: `${release.releaseDate}T18:00:00Z`,
    createdByStaffName: "Cairn",
    deliveryStatus: "unread",
    actionHref: getReleaseNotesHref(release.version)
  };
}
