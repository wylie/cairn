# Permissions Reference

This file is the markdown reference for staff permissions currently implemented in Cairn.

## Role Presets

### Owner
Full operational and administrative access, including products, waivers, reports, POS, settings, staff, roles, billing-related settings, communications, rentals, and overrides.

### Manager
Broad operational access, including products, waivers, programs, reports, POS, settings, staff, communications, rentals, and overrides. Managers do not currently hold every owner-only platform permission.

### Front Desk
Daily operations focus: customer lookup, customer editing/creation, check-in/out, POS, roster access, limited reports, rentals, and transactional messaging.

### Instructor
Program operations focus: program/session workflows, roster access, and participant messaging.

### Volunteer (limited)
Roster-only support.

## Permission Catalog

| Permission | Label | Description |
| --- | --- | --- |
| `viewCustomers` | View customers | View customer records and profile details. |
| `editCustomer` | Edit customers | Edit existing customer profile information. |
| `createCustomer` | Create customers | Create new customer records. |
| `mergeCustomer` | Merge customers | Merge duplicate customer records. |
| `deactivateCustomer` | Deactivate customers | Deactivate customer records. |
| `checkInCustomer` | Check in customers | Check customers into the facility. |
| `checkOutCustomer` | Check out customers | Check customers out of the facility. |
| `overrideAccess` | Override access rules | Bypass standard access restrictions when needed. |
| `compAccess` | Grant comp access | Grant complimentary access products. |
| `manageProducts` | Manage products | Create and edit products and access items. |
| `manageWaivers` | Manage waivers | Create, version, assign, and validate waiver templates and signatures. |
| `deactivateProduct` | Deactivate products | Archive or deactivate products from active sale. |
| `usePOS` | Use POS | Use checkout and complete POS sales. |
| `refundTransaction` | Refund transactions | Issue transaction refunds. |
| `discountTransaction` | Apply discounts | Apply discounts during checkout. |
| `editPrograms` | Manage programs | Create and edit programs and sessions. |
| `cancelPrograms` | Cancel programs | Cancel sessions and program instances. |
| `rosterAccess` | Access rosters and attendance | View rosters and mark attendance. |
| `viewReports` | View reports | Access operational report dashboards. |
| `viewAttendanceReports` | View attendance reports | Access attendance reporting details. |
| `viewFinancialReports` | View financial reports | Access financial reporting details. |
| `viewMembershipReports` | View membership reports | Access membership/access reporting details. |
| `manageStaff` | Manage staff | Manage staff profiles and staff status. |
| `inviteStaff` | Invite staff | Add or invite new staff. |
| `manageRoles` | Manage roles | Create and edit role presets and permissions. |
| `manageSettings` | Manage settings | Manage facility settings. |
| `manageBillingSettings` | Manage billing settings | Manage payment and billing-related settings. |
| `managePlatformSettings` | Manage platform settings | Manage advanced platform/system configuration. |
| `grantCompAccess` | Grant comp access (customer actions) | Use grant-comp actions in customer workflows. |
| `manageRentals` | Manage rentals and reservations | Create and manage rentable resources, reservations, and maintenance blocks. |
| `manageCommunications` | Manage communications | Access the communications hub, templates, and message history. |
| `sendTransactionalMessages` | Send transactional messages | Send customer-facing transactional messages and reminders. |
| `messageAssignedParticipants` | Message assigned participants | Message participants, waitlists, and assigned program rosters. |

## Related Documentation
- [Page Access Matrix](./page-access-matrix.md)
- [Facility Configuration](./facility-configuration.md)
