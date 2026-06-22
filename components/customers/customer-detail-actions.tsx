"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { EditCustomerProfileModal } from "@/components/customers/edit-customer-profile-modal";
import { GrantCompAccessModal, type GrantCompAccessInput } from "@/components/customers/grant-comp-access-modal";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { deletePersistedCustomerAction, updatePersistedCustomerAction } from "@/app/(app)/customers/actions";
import type { Customer } from "@/types/domain";

export function CustomerDetailActions({
  customerId,
  persistedCustomer
}: {
  customerId: string;
  persistedCustomer?: Customer;
}) {
  const router = useRouter();
  const { customers, accessProducts, runCustomerCheckInAction, sellAccessProducts, updateCustomerWaiver, updateCustomerProfile, addCustomerAccessRecord } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission, logAuditEvent } = useWorkstationState();
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellingAccess, setSellingAccess] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [grantingComp, setGrantingComp] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const customer = useMemo(() => persistedCustomer ?? customers.find((entry) => entry.id === customerId), [customers, customerId, persistedCustomer]);
  const usesPersistedCustomer = Boolean(persistedCustomer);
  const checkedIn = customer?.checkInStatus === "in";

  if (!customer) return null;

  const submitCompGrant = (input: GrantCompAccessInput) => {
    if (!activeStaff) {
      requestStaffSwitch("Staff PIN Required");
      setWarning("Select staff PIN to continue.");
      setFeedback("");
      setShowSwitchPrompt(true);
      return { ok: false, message: "Select staff PIN to continue." };
    }

    const startsAt = new Date();
    let expirationDate: string | undefined;
    if (input.durationType === "today") expirationDate = startsAt.toISOString().slice(0, 10);
    if (input.durationType === "days" && input.durationDays) {
      const date = new Date(startsAt);
      date.setDate(date.getDate() + input.durationDays);
      expirationDate = date.toISOString().slice(0, 10);
    }
    if (input.durationType === "date") expirationDate = input.expirationDate;
    if (input.durationType === "unlimited") expirationDate = undefined;

    const result = addCustomerAccessRecord({
      customerId: customer.id,
      productId: undefined,
      type: "comp",
      status: "active",
      startDate: startsAt.toISOString().slice(0, 10),
      expirationDate,
      remainingPunches: input.accessType === "punch-pass" ? 10 : undefined,
      unlimitedAccess: input.accessType === "membership" || input.durationType === "unlimited",
      locationsAllowed: [customer.locationId],
      notes: `Comp access • ${input.accessType} • ${input.reason}${input.notes ? ` • ${input.notes}` : ""}`,
      grantedByStaffId: activeStaff.id,
      grantedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
    });

    if (result.ok) {
      setFeedback("Comp access granted.");
      setWarning("");
      setShowSwitchPrompt(false);
      logAuditEvent({
        action: "access.comp_granted",
        actorStaffId: activeStaff.id,
        actorStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
        targetType: "customer",
        targetId: customer.id,
        reason: input.reason,
        metadata: {
          accessType: input.accessType,
          durationType: input.durationType
        }
      });
    } else {
      setWarning(result.message);
      setFeedback("");
    }
    return result;
  };

  const onToggle = () => {
    const permission = assertPermission(checkedIn ? "checkOutCustomer" : "checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setFeedback("");
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = runCustomerCheckInAction(customerId, {
      staffUserId: activeStaff!.id,
      staffName,
      source: "manual_search"
    });

    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      setShowSwitchPrompt(true);
      return;
    }

    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <Button variant={checkedIn ? "secondary" : "primary"} onClick={onToggle} disabled={usesPersistedCustomer}>
          {checkedIn ? "Check Out" : "Check In"}
        </Button>
        <Button variant="primary" onClick={() => setSellingAccess(true)} disabled={usesPersistedCustomer}>Sell Access</Button>
        <Button
          variant="secondary"
          disabled={usesPersistedCustomer}
          onClick={() => {
            if (!activeStaff) {
              setWarning("Select staff PIN to continue.");
              setFeedback("");
              setShowSwitchPrompt(true);
              requestStaffSwitch("Staff PIN Required");
              return;
            }
            const result = updateCustomerWaiver(customerId, {
              status: "valid",
              signedAt: new Date().toISOString(),
              expiresAt: "2027-05-20",
              signedByStaffId: activeStaff.id,
              updatedByStaffId: activeStaff.id,
              updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
            });
            if (!result.ok) {
              setWarning(result.message);
              setFeedback("");
              return;
            }
            setFeedback("Waiver marked signed.");
            setWarning("");
            logAuditEvent({
              action: "waiver.marked_signed",
              actorStaffId: activeStaff.id,
              actorStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              targetType: "customer",
              targetId: customer.id
            });
          }}
        >
          Mark Waiver Signed
        </Button>
        <Button variant="secondary" onClick={() => setEditingProfile(true)}>Edit Profile</Button>
        {usesPersistedCustomer ? (
          <Button variant="destructiveSubtle" onClick={() => setConfirmingDelete(true)}>Delete Customer</Button>
        ) : null}
        {activeStaff && hasPermission("grantCompAccess") ? (
          <div className="w-full sm:ml-auto sm:w-auto">
            <Button variant="caution" onClick={() => setGrantingComp(true)}>Grant Comp Access</Button>
          </div>
        ) : null}
      </div>
      {feedback ? <p role="status" className="text-sm text-emerald-800">{feedback}</p> : null}
      {warning ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>{warning}</p>
          {showSwitchPrompt ? (
            <div className="mt-2">
              <StaffSwitcher label="Switch Staff" title="Switch Staff PIN" />
            </div>
          ) : null}
        </div>
      ) : null}
      {usesPersistedCustomer ? (
        <p className="text-xs text-muted-foreground">
          Customer profile edits are Neon-backed. Check-in, access sales, and waivers remain on demo persistence until their migration releases.
        </p>
      ) : null}
      {sellingAccess ? (
        <SellAccessModal
          open
          onClose={() => setSellingAccess(false)}
          customer={customer}
          products={accessProducts}
          canUsePOS={hasPermission("usePOS")}
          canOverrideAccess={hasPermission("overrideAccess")}
          onSubmit={({ productIds, checkInAfterSale }) => {
            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              return { ok: false, message: "Select staff PIN to continue.", transaction: null };
            }
            const result = sellAccessProducts({
              customerId: customer.id,
              productIds,
              soldByStaffId: activeStaff.id,
              soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              checkInAfterSale
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
              setShowSwitchPrompt(false);
            } else {
              setWarning(result.message);
            }
            return { ...result, transaction: result.transaction ?? null };
          }}
        />
      ) : null}
      {editingProfile ? (
        <EditCustomerProfileModal
          open
          customer={customer}
          onClose={() => setEditingProfile(false)}
          onSave={async (input) => {
            if (usesPersistedCustomer) {
              const result = await updatePersistedCustomerAction(customer.id, {
                firstName: input.firstName,
                lastName: input.lastName,
                preferredName: input.preferredName,
                dateOfBirth: input.dateOfBirth,
                email: input.email,
                phone: input.phone,
                householdId: customer.householdId ?? null,
                active: !customer.tags.includes("Inactive")
              });
              if (result.ok) {
                setFeedback("Profile updated in Neon.");
                setWarning("");
                setShowSwitchPrompt(false);
                router.refresh();
              } else {
                setWarning(result.message);
                setFeedback("");
              }
              return result;
            }

            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              setWarning("Select staff PIN to continue.");
              setFeedback("");
              setShowSwitchPrompt(true);
              return { ok: false, message: "Select staff PIN to continue." };
            }

            const result = updateCustomerProfile({
              ...input,
              customerId: customer.id,
              updatedByStaffId: activeStaff.id,
              updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
            });

            if (result.ok) {
              setFeedback("Profile updated.");
              setWarning("");
              setShowSwitchPrompt(false);
            } else {
              setWarning(result.message);
              setFeedback("");
            }

            return result;
          }}
        />
      ) : null}
      {confirmingDelete ? (
        <ModalShell
          open
          ariaLabel="Delete customer"
          title="Delete Customer"
          description="This removes the customer record from Neon for this organization. This cannot be undone."
          onClose={() => setConfirmingDelete(false)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  const result = await deletePersistedCustomerAction(customer.id);
                  setIsDeleting(false);
                  if (!result.ok) {
                    setWarning(result.message);
                    setFeedback("");
                    return;
                  }
                  setFeedback(result.message);
                  setWarning("");
                  setConfirmingDelete(false);
                  router.push("/customers");
                  router.refresh();
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Customer"}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Delete {customer.firstName} {customer.lastName}? Memberships, check-ins, POS, and waiver data are not migrated in this release and are not affected by this Neon customer delete.
          </p>
        </ModalShell>
      ) : null}
      {grantingComp ? (
        <GrantCompAccessModal
          open
          customerName={`${customer.firstName} ${customer.lastName}`}
          onClose={() => setGrantingComp(false)}
          onSubmit={submitCompGrant}
        />
      ) : null}
    </div>
  );
}
