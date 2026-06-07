# Demo Data

## Overview
Cairn relies on seeded mock data so the full product can be exercised without external infrastructure.

## Living Demo Data
The seeded demo organizations use living demo data generated relative to the current date instead of fixed historical timestamps.

The rolling-date helper layer lives in:
- `lib/demo/dates.ts`
- `lib/demo/seed.ts`

These helpers support:
- `today()`
- `daysAgo(n)`
- `daysFromNow(n)`
- `startOfThisWeek()`
- `endOfThisWeek()`
- `startOfThisMonth()`
- `endOfThisMonth()`

## What Uses Relative Dates
Living demo generation currently keeps these areas current:
- check-ins and occupancy
- sessions and upcoming schedules
- registrations and waitlists
- memberships, renewals, and expirations
- receipts, invoices, and billing activity
- waiver validity and expiration states
- rentals and maintenance blocks
- dashboard and report activity

## Demo Reset Strategy
Demo organizations refresh by seed-version day.

Current behavior:
- demo seed data is generated relative to the current date
- demo org local mock state is refreshed when the stored seed version does not match the current day
- non-demo organizations are not refreshed by this mechanism

This keeps the hosted demo feeling active while avoiding writes into non-demo organizations.

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
- when adding new seeded demo records, use relative date helpers instead of hardcoded stale dates

## Related Documentation
- [Reference: Demo Accounts](../reference/demo-accounts.md)
- [Facility Provisioning](./facility-provisioning.md)
