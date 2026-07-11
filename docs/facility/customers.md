# Customers

## Overview
Customers are the core person records used across check-in, memberships, registrations, waivers, POS, households, communications, rentals, and reporting. Customer profile create, read, update, delete, and search workflows are persisted in Neon through the customer repository.

## What You Can Do
- create and edit customer records
- upload and replace customer photos
- review profile sections through jump navigation
- view visits, purchases, notes, waivers, relationships, communications, and alerts
- open related household, membership, registration, and receipt records

## Common Workflows
### Create a customer
1. Open Customers.
2. Select `Add Customer`.
3. Enter required identity, birth date, phone, address, and emergency contact details.
4. Save.
5. Add household relationships if needed.

### Edit a customer
1. Open the customer profile from Customers, Check-In, POS, Registrations, or Household.
2. Use the context-aware back link when returning to the previous workflow.
3. Update fields and save.

### Delete a customer
1. Open the customer profile from Customers.
2. Select `Delete Customer`.
3. Confirm the destructive action.

Deleted customer profile rows are removed from Neon for the active organization. Memberships, check-ins, waivers, and POS records are migrated in later releases.

### Upload or replace a photo
1. Open the customer profile header.
2. Select `Upload Photo` or `Replace Photo`.
3. Choose a supported image file.
4. Confirm the preview.

### Resolve waiver issues from the profile
1. Open the Waivers section in the profile.
2. Review status, expiration, and signer details.
3. Re-sign or direct the customer into the waiver workflow.
4. Add an alert or note if follow-up is required.

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
- Duplicate detection checks likely email, phone, and name/date-of-birth matches before a customer is saved.

## Related Features
- [Households](./households.md)
- [Memberships](./memberships.md)
- [Waivers](./waivers.md)
- [Communications](./communications.md)
