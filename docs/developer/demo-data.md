# Demo Data

## Overview
Cairn relies on seeded mock data so the full product can be exercised without external infrastructure.

## Seed Data Expectations
The demo set should cover:
- multiple organizations
- staff roles across owner, manager, front desk, and instructor
- customers with households and dependents
- memberships, passes, and renewal states
- check-ins and occupancy history
- programs, sessions, registrations, attendance, and waitlists
- waivers in valid, missing, expiring, and expired states
- products, receipts, purchases, and refunds
- alerts, communications, tasks, rentals, and billing records

## Why It Matters
Tests and product demos both assume seeded data can support:
- customer-facing flows
- staff operational workflows
- platform administration and provisioning
- permissions and privacy boundaries

## Maintenance Rules
- avoid creating one-off fields on a single screen that are not backed by canonical shared data
- keep seed relationships realistic enough to expose household, guardian, and permission edge cases
- update docs when credential sets, role coverage, or seeded organizations change

## Related Documentation
- [Reference: Demo Accounts](../reference/demo-accounts.md)
- [Facility Provisioning](./facility-provisioning.md)
