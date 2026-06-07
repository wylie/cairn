# Platform Administration

## Overview

Platform administration lives under `/admin` and sits above all organization-scoped portals. It is the control plane for provisioning and managing facilities using Cairn.

## Major Areas
- dashboard
- organizations
- templates
- demo facilities
- integrations
- subscriptions placeholder
- platform settings

## Current Capabilities
- provision organizations with starter data
- inspect seeded and runtime demo facilities
- review generated portal paths
- manage template metadata
- review integration placeholders at platform scope

## Security Model
- `/admin/*` is only for platform admins
- platform admin auth is separate from organization staff auth
- org-scoped portals remain isolated

## Related Documentation
- [Organizations & Provisioning](./organizations.md)
- [Routes & Portals](../reference/routes-and-portals.md)
- [Demo Accounts](../reference/demo-accounts.md)
