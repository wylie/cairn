# Permissions Architecture

## Overview
Cairn uses role presets and explicit permission keys to control staff access to pages and actions.

## Role Strategy
Common presets:
- Owner
- Manager
- Front Desk
- Instructor / Coach
- limited support roles as needed

Customers are not part of the staff permission model. Customer portal access is governed by authenticated customer scope and household authorization.

## Permission Design Principles
- route visibility should not imply action permission
- high-risk actions need explicit permission keys
- customer portal privacy rules are separate from staff permissions
- platform-admin access is isolated from facility roles

## Major Permission Areas
- customers and profiles
- check-in and access overrides
- POS, products, discounts, and refunds
- programs, attendance, and rosters
- staff and role management
- settings and billing configuration
- rentals, communications, alerts, and integrations

## Related Systems
- route gating in middleware and route groups
- sidebar and mobile navigation visibility
- protected actions such as refunds, overrides, and management functions

## Related Documentation
- [Reference: Permissions Matrix](../reference/permissions-matrix.md)
- [Routing](./routing.md)
