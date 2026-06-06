"use client";

import type { ReactNode } from "react";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { buildMembershipCardMatrix, getMembershipCardStatus, getMembershipCardStatusLabel, getMembershipCardStatusTone } from "@/lib/memberships/cards";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { Customer, CustomerAccessRecord } from "@/types/domain";

function MembershipQrCode({ token, className }: { token: string; className?: string }) {
  const matrix = buildMembershipCardMatrix(token);
  const cellSize = 4;
  const size = matrix.length * cellSize;

  return (
    <svg
      aria-label={`Membership QR code ${token}`}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("rounded-lg bg-white p-2", className)}
      role="img"
    >
      <rect width={size} height={size} fill="white" />
      {matrix.flatMap((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function DigitalMembershipCard({
  customer,
  accessRecord,
  membershipName,
  organizationName,
  organizationLogoUrl,
  primaryColor = "#0693C2",
  secondaryColor = "#0F172A",
  membershipNumber,
  qrToken,
  barcodeValue,
  variant = "default",
  className
}: {
  customer: Pick<Customer, "firstName" | "lastName" | "preferredName" | "profilePhotoUrl">;
  accessRecord: Pick<CustomerAccessRecord, "status" | "expirationDate" | "startDate">;
  membershipName: string;
  organizationName: string;
  organizationLogoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  membershipNumber: string;
  qrToken: string;
  barcodeValue?: string;
  variant?: "default" | "compact";
  className?: string;
}) {
  const status = getMembershipCardStatus(accessRecord);
  const statusTone = getMembershipCardStatusTone(status);
  const statusLabel = getMembershipCardStatusLabel(status);
  const cardName = customer.preferredName?.trim() || `${customer.firstName} ${customer.lastName}`.trim();
  const compact = variant === "compact";

  return (
    <div
      aria-label="digital-membership-card"
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm",
        compact ? "max-w-md" : "max-w-xl",
        className
      )}
    >
      <div
        className="p-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-white/80">Digital Membership Card</p>
            <p className="mt-1 text-lg font-semibold">{organizationName}</p>
          </div>
          {organizationLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizationLogoUrl} alt={`${organizationName} logo`} className="h-10 w-10 rounded-md bg-white/90 object-cover p-1" />
          ) : (
            <div className="rounded-md bg-white/15 px-3 py-2 text-xs font-medium text-white/90">Cairn</div>
          )}
        </div>
      </div>

      <div className={cn("grid gap-4 p-4", compact ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1.4fr_auto]")}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar customer={customer} size={compact ? "md" : "lg"} className="border-white/50 bg-card" />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold text-slate-950">{cardName}</p>
              <p className="text-sm text-slate-600">{membershipName}</p>
            </div>
          </div>

          <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
            <InfoBlock label="Membership Status" value={<Badge tone={statusTone}>{statusLabel}</Badge>} />
            <InfoBlock label="Membership Number" value={<span className="font-mono text-sm tracking-[0.12em]">{membershipNumber}</span>} />
            <InfoBlock label="Expires" value={formatDate(accessRecord.expirationDate, "No expiration")} />
            <InfoBlock label="Issued" value={formatDate(accessRecord.startDate)} />
          </div>

          {barcodeValue ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Barcode Ready</p>
              <p className="mt-1 font-mono text-sm text-slate-900">{barcodeValue}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 md:text-right">
          <MembershipQrCode token={qrToken} className="mx-auto h-32 w-32 md:mx-0" />
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Access QR</p>
          <p className="font-mono text-xs text-slate-700">{qrToken}</p>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}
