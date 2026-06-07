# Facility Provisioning

## Overview
Platform administration provisions new organizations and generates the scaffolding required for Cairn to run a new facility.

## What Provisioning Creates
- organization identity and slug
- facility type
- primary location metadata
- owner account metadata
- branding defaults
- public facility route
- customer portal route set
- staff portal route set
- starter roles and permissions
- starter products, waivers, widgets, and report defaults

## Templates
Current provisioning templates include:
- YMCA
- Climbing Gym
- Camp
- Rec Center
- Outdoor Center

## Isolation Requirements
A new organization must remain isolated from every other organization for:
- searches
- customers
- households
- reports
- staff workflows
- customer portal visibility

## Related Documentation
- [Architecture](./architecture.md)
- [Reference: Routes](../reference/routes.md)
