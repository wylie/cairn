# Pilot Readiness

Cairn is ready for structured external testing with demo organizations, living sample data, and staff/customer workflows that exercise the major operating areas. The pilot environment is intended to show direction and workflow fit, not final production infrastructure.

Demo data is representative and may reset during testing. Roadmap dates are targets and may change based on tester feedback and pilot customer needs.

## Ready

- Facility-specific staff login for Summit Rec Collective and Riverstone Nature Center.
- Customer portal login for Summit Rec Collective demo customers.
- Customer, household, membership, check-in, POS, program, registration, rental, staff, communication, alert, report, waiver, settings, release notes, and roadmap navigation.
- Front desk flows for customer search, eligibility review, check-in, day-pass sale, membership sale, and program registration.
- Manager flows for staff visibility, membership review, reports, registrations, products, rentals, and operational alerts.
- Customer portal flows for memberships, digital membership card, household visibility, waivers, registrations, billing, purchases, and receipts.
- Demo organizations with living date-relative activity so dashboards, reports, sessions, check-ins, and receipts stay current.
- Release notes, roadmap, version display, update notifications, feedback entry points, and support request foundation.
- Floating **Send Feedback** entry point for bug reports, feature requests, confusing workflows, questions, and general feedback.
- Support Console review workflow with search, category filtering, status filtering, organization context, reporter context, submission date, and lifecycle status.
- Lightweight feedback lifecycle statuses: New, In Review, Planned, and Resolved.

## Needs Feedback

- Whether recreation center, YMCA, climbing gym, and outdoor program operators can quickly understand where to start.
- Whether front desk workflows feel fast enough during check-in, POS, and registration tasks.
- Whether customer, household, membership, and waiver status language matches real facility operations.
- Whether reports provide the right early management signals for attendance, revenue, memberships, programs, rentals, households, staff activity, waivers, and communications.
- Whether demo data feels realistic enough for evaluating workflows.
- Whether staff roles and permission boundaries match how pilot facilities divide daily work.
- Whether empty states and guidance help testers understand what to do next.
- Whether the five feedback categories are enough for external testers without making the form feel heavy.
- Whether support staff need additional triage metadata before feedback is connected to release notes.

## Planned

- Customer, household, and membership import tools.
- Production payment processing and payment-provider reconciliation.
- Apple Wallet and Google Wallet membership card research.
- Provider-backed email, SMS, calendar, identity, accounting, and CRM integrations.
- Production data persistence, audit history, and deployment operations beyond the mock-first demo environment.
- Guided onboarding and migration documentation for real facility launches.
- More facility-specific demo datasets as pilot customer profiles become clearer.
- Feedback-to-release-note linkage for resolved issues and improvements.
- Attachment upload persistence for screenshots and screen recordings.
- Assignee, comment, and internal-note workflows if pilot volume requires more than lightweight triage.

## Tester Feedback Workflow

Testers can submit feedback from the floating **Send Feedback** button throughout Cairn. The form is intentionally short: name and email are optional, description is required, and Cairn automatically captures current page, organization, facility, and role context when available.

Supported categories:

- Bug Report
- Feature Request
- Confusing Workflow
- Question
- General Feedback

Support staff review feedback in the Support Console. The console supports global search plus category and status filters, and each feedback item shows category, status, priority, submission date, organization, facility, reporter, workflow, and impact when provided.

Feedback statuses:

- New: received and waiting for review.
- In Review: support or product staff are investigating.
- Planned: likely to be addressed in an upcoming release.
- Resolved: handled or intentionally closed.

Future release notes can reference resolved feedback under Fixed or Improved once release-note linking is added.

## Demo Entry Points

- Staff portal: `/o/summit/login`
- Customer portal: `/p/summit/login`
- Facility landing page: `/f/summit`
- Platform admin: `/admin/login`

Use [Demo Credentials](./demo-credentials.md) for current staff, customer, and platform admin accounts.
