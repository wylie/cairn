"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function CustomerDetailActions({ customerId }: { customerId: string }) {
  const { customers, accessProducts, runCustomerCheckInAction, sellAccessProducts } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission } = useWorkstationState();
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellingAccess, setSellingAccess] = useState(false);

  const customer = useMemo(() => customers.find((entry) => entry.id === customerId), [customers, customerId]);
  const checkedIn = customer?.checkInStatus === "in";

  if (!customer) return null;

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
      <div className="flex flex-wrap gap-2">
        <Button variant={checkedIn ? "outline" : "default"} onClick={onToggle}>
          {checkedIn ? "Check Out" : "Check In"}
        </Button>
        <Button variant="outline" onClick={() => setSellingAccess(true)}>Sell Access</Button>
        <Button variant="outline">Edit Profile</Button>
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
    </div>
  );
}
