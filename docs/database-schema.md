# Database Schema (Planned)

Supabase/Postgres is not connected yet. This is the planned model.

## Tenant and auth
- `organizations`
- `locations`
- `staff_users`
- `staff_location_roles`

## CRM
- `customers`
- `waivers`
- `customer_notes`

## Access and memberships
- `memberships`
- `punch_passes`
- `checkin_records`

## Programs
- `programs`
- `class_camp_sessions`
- `registrations`
- `rooms_resources`

## Commerce
- `pos_products`
- `transactions`
- `transaction_lines`
- `payments`

## Billing (Stripe)
- `billing_customers`
- `billing_subscriptions`
- `billing_events`
