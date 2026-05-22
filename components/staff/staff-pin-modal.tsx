"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function StaffPinModal() {
  const { pinModalOpen, pinError, pinTitle, closeStaffSwitch, switchStaffByPin } = useWorkstationState();
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pinModalOpen) setPin("");
  }, [pinModalOpen]);

  if (!pinModalOpen) return null;

  const submit = () => {
    switchStaffByPin(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" role="dialog" aria-modal="true" aria-label="Staff PIN">
      <div className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold">{pinTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enter 4-digit PIN</p>

        <div className="mt-4 space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            className="h-12 text-base"
            aria-label="Staff PIN input"
          />
          {pinError ? <p role="alert" className="text-sm text-red-600">{pinError}</p> : null}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPin("")}>Clear</Button>
            <Button variant="outline" className="flex-1" onClick={closeStaffSwitch}>Cancel</Button>
            <Button className="flex-1" onClick={submit}>Confirm</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
