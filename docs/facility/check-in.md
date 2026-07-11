# Check-In

## Overview
Check-In supports persisted customer lookup, membership access validation, occupancy tracking, recent activity, staff overrides, and check-out workflows. Check-ins are stored in Neon and shared across browsers and devices.

## What You Can Do
- search for customers quickly
- check customers in by search, member ID, phone, or email
- review recent check-ins and current occupancy
- resolve active, expired, cancelled, or suspended membership states
- check out individuals

## Common Workflows
### Check in a customer
1. Open Check-In.
2. Search for the customer.
3. Select the correct result.
4. Review persisted membership access status.
5. Complete check-in.

Access messages explain whether access is allowed, allowed with an expiration warning, denied because the membership expired, denied because it is suspended or cancelled, denied because it has not started, denied because it belongs to another facility, or denied because no membership exists.

### Use staff override
1. Search for the customer.
2. Review the denied access reason.
3. Use override only when local policy allows access without an active persisted membership.
4. Add a clear note for the override.

### Resolve waiver issues
Waiver-backed access blocks remain deferred until waiver persistence is migrated. Use existing waiver workflows separately when local policy requires them.

### Check out a customer
1. Open the current roster or recent check-ins.
2. Use the customer-specific checkout action.
3. Confirm the checkout time.

## Operational Notes
- Duplicate active check-ins for the same organization and customer are prevented.
- Check-out requires an active check-in.
- Check-in and check-out actions show visible success or error messages after the database write completes.
- Automatic closeout settings remain future work.
- Dashboard occupancy metrics deep-link into current check-in views.

## Tips
- Customer and household context reduce front desk errors.
- Search by name, phone, email, or member ID when the line is busy.
- Recent check-ins are useful for correcting mistakes without leaving the workflow.

## Related Features
- [Customers](./customers.md)
- [Waivers](./waivers.md)
- [Memberships](./memberships.md)
