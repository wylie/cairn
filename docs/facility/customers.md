# Customers

## Overview
Customers are the core person records used across check-in, memberships, registrations, waivers, POS, households, communications, rentals, and reporting. Customer profile create, read, update, delete, and search workflows are persisted in Neon through the customer repository.

## What You Can Do
- create and edit customer records
- store a profile photo URL as part of the persisted profile
- search persisted customers by first name, last name, preferred name, email, or phone
- review profile sections through jump navigation
- view persisted notes, household relationships, and profile metadata
- see clear placeholders for visits, purchases, waivers, registrations, documents, communications, and alerts until those workflows are migrated
- open related household, membership, registration, and receipt records

## Common Workflows
### Create a customer
1. Open Customers.
2. Select `Add Customer`.
3. Enter required identity, birth date, phone, address, and emergency contact details.
4. Save.
5. Add household relationships if needed.

If Cairn finds a possible duplicate by exact email, exact normalized phone, or matching name plus birth date, staff see a warning and can review the possible existing customer. Staff may continue only after explicitly choosing to create the record anyway.

### Edit a customer
1. Open the customer profile from Customers, Check-In, POS, Registrations, or Household.
2. Use the context-aware back link when returning to the previous workflow.
3. Update fields and save.

Edits use the same required-field, email, phone, birth-date, state, and duplicate-warning rules as customer creation.

### Delete a customer
1. Open the customer profile from Customers.
2. Select `Delete Customer`.
3. Confirm the destructive action.

Deleted customer profile rows are removed from Neon for the active organization. Memberships, check-ins, waivers, and POS records are migrated in later releases.

### Update a profile photo URL
1. Open the customer profile.
2. Select `Edit Profile`.
3. Update the profile photo URL.
4. Save the profile.

### Review deferred operational sections
1. Open the customer profile.
2. Review persisted profile and household data normally.
3. Treat memberships, check-ins, waivers, registrations, POS, documents, communications, and alerts as deferred placeholders until those persistence releases ship.

## Profile Sections
Typical customer profiles include:
- Overview
- Profile
- Relationships
- Access
- Waivers
- Registrations
- Visits
- Purchases
- Documents
- Communications
- Notes
- Payment
- Activity Timeline
- Staff Profile when applicable

## Tips
- Photos improve check-in accuracy and roster usability.
- Use the profile timeline when you need a chronological explanation of what happened.
- Use alerts for real operational blockers, not ordinary notes.
- Duplicate detection warns on likely email, phone, and name/date-of-birth matches before a customer is saved. It does not merge records yet.
- Search is organization-scoped and reads from Neon, not browser-local customer state.

## Related Features
- [Households](./households.md)
- [Memberships](./memberships.md)
- [Waivers](./waivers.md)
- [Communications](./communications.md)
