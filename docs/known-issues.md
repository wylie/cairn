# Known Issues (Deferred)

This file tracks intentionally deferred issues discovered during the stability pass.

## 1) "Today" is pinned to a mock base date
- Area: check-in log, occupancy, historical navigation.
- Current behavior: `lib/state/customer-state.tsx` uses `BASE_DATE = "2026-05-20"` and treats that as "Today".
- Impact: deterministic mock behavior for tests, but not true calendar-aware behavior.
- Why deferred: changing to real runtime dates would require updating seeded mocks and many date-dependent tests together.

## 2) POS History date filter is placeholder-only
- Area: `/pos/history`.
- Current behavior: date filter UI exists but does not apply filtering logic yet.
- Impact: users can search text fields, but cannot constrain by date range.
- Why deferred: date filtering/range semantics should be implemented with reporting requirements.

## 3) Legacy records may lack staff attribution
- Area: check-in and transaction history.
- Current behavior: legacy records without staff IDs/names render as `Staff not recorded`.
- Impact: no blocker for current workflows; historical attribution can be incomplete.
- Why deferred: expected until Supabase-backed audit data is introduced.

## 4) Non-blocking test runtime warnings
- Area: test runs.
- Current behavior:
  - jsdom warning: `--localstorage-file` invalid path warning.
  - one React test warning about async `act(...)` in `checkin-list` suite.
- Impact: tests pass; warnings are noisy but non-fatal.
- Why deferred: requires test harness cleanup and async test refactor, not product workflow changes.

## 5) Returns/refunds workflow is model-ready only
- Area: POS transactions.
- Current behavior: transactions now include `transactionType`, `originalTransactionId`, `returnStatus`, `returnedItemIds`, and `refundedTotal`, but no return/refund UI or actions exist.
- Impact: sales data is prepared for linking future returns, but staff cannot process returns yet.
- Why deferred: full returns policy, permissions, and UX flow are out of scope for current POS slice.
