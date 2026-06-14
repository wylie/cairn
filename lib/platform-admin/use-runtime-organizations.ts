"use client";

import { useEffect, useState } from "react";
import {
  buildSeedProvisionedOrganizations,
  getRuntimeOrganizationsClient,
  type ProvisionedOrganizationRecord
} from "@/lib/platform-admin/registry";

export function useRuntimeOrganizations() {
  const [organizations, setOrganizations] = useState<ProvisionedOrganizationRecord[]>(() =>
    buildSeedProvisionedOrganizations()
  );

  useEffect(() => {
    setOrganizations(getRuntimeOrganizationsClient());
  }, []);

  return organizations;
}
