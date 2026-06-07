# Troubleshooting

## Overview
Use this guide for common operational issues before escalating to engineering.

## Common Problems
### Customer cannot check in
Check:
1. membership or access status
2. waiver status and version
3. household or age restrictions
4. whether the customer is already checked in

### Customer cannot register
Check:
1. age eligibility
2. membership requirements
3. required waivers
4. prerequisite rules
5. session capacity and waitlist availability

### Customer cannot see a household member in the portal
Check:
1. household relationship role
2. guardian or manager permissions for that member
3. whether the customer is authenticated into the correct organization

### A recent purchase or receipt is missing
Check:
1. purchaser versus beneficiary filtering
2. whether the receipt belongs to a managed household member
3. payment status and refund state

### A customer photo is missing in operations
Check:
1. whether the customer record has a profile photo
2. whether the shared avatar fallback is showing because no photo exists
3. whether the operational screen is loading the canonical customer record

### The public site or portal branding looks wrong
Check:
1. facility branding settings
2. missing logo assets
3. organization slug

## Escalation Guidance
Escalate to engineering when:
- a workflow exposes unrelated customer data
- permissions are bypassed
- receipts, signed waivers, or billing records are incorrect
- check-in or registration state becomes inconsistent across screens

## Related Features
- [Settings](./settings.md)
- [Alerts](./alerts.md)
- [Known Issues](../reference/known-issues.md)
