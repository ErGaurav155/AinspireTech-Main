# RocketReplAI tenant platform rollout

## What is implemented

The new tenant platform is additive. Existing Instagram, WhatsApp, Website and Call automation engines continue to use their legacy Clerk-owner fields while migration adds `workspaceId` in parallel.

Core records:

- `Agency`, `AgencyMember`
- `Workspace`, `WorkspaceMember`, `WorkspaceService`, `WorkspaceOnboarding`
- `AgencyClient`, `ProvisioningOperation`
- `PlanDefinition`, `PlatformSubscription`
- `AddonDefinition`, `PurchasedAddon`
- `UsageCounter`, `UsageLedger`
- `BillingEvent`, `WebhookEvent`, `PlatformAuditLog`

Backend authorization resolves a workspace or agency from the authenticated Clerk user. A browser-supplied workspace ID is only an identifier; it never establishes access. Product access is the intersection of the billing owner's effective plan/add-on entitlements and that workspace's enabled services.

The platform also preserves the existing Call Assistant module even though the original brief listed three products, because it is active production functionality.

## Platform API

All routes below require Clerk authentication except the signed webhook.

- `GET /api/platform/context`
- `POST /api/platform/workspaces`
- `GET /api/platform/workspaces/:workspaceId`
- `POST /api/platform/workspaces/:workspaceId/billing/checkout`
- `POST /api/platform/agencies`
- `GET /api/platform/agencies/:agencyId`
- `GET|POST /api/platform/agencies/:agencyId/clients`
- `PATCH /api/platform/agencies/:agencyId/clients/:workspaceId/services/:service`
- `DELETE /api/platform/agencies/:agencyId/clients/:workspaceId` (archive only; never deletes client data)
- `GET /api/platform/agencies/:agencyId/billing/plans`
- `POST /api/platform/agencies/:agencyId/billing/checkout`
- `POST /api/platform/agencies/:agencyId/billing/addons/checkout`
- `POST /api/webhooks/razorpay` (Razorpay signature required)

Provisioning and checkout POST requests require an `X-Idempotency-Key` containing 8–200 alphanumeric, colon, underscore or dash characters.

## Required provider configuration

1. Add `CLERK_INVITATION_REDIRECT_URL` to the API environment and allow the URL in Clerk.
2. Subscribe the Clerk webhook to organization membership create, update and delete events in addition to the existing user events.
3. Configure Razorpay subscription lifecycle events to `POST /api/webhooks/razorpay`.
4. Keep the legacy Razorpay webhook endpoints enabled during the compatibility window for old subscriptions.
5. Create active `PlanDefinition` and `AddonDefinition` documents with the correct Razorpay plan IDs. Prices, limits and features live in these documents, not in UI components.

The editable agency catalog is `apps/api/src/config/platform-catalog.config.ts`.
The configured product IDs are `agency-partner`, `agency-growth-partner`,
`agency`, `addon-extra-client-slots`, `addon-extra-team-seats`,
`addon-extra-ai-tokens` and `addon-extra-conversations`. Add their monthly and
yearly Razorpay IDs to the existing `Plan` collection, then run:

```bash
npm run sync:platform-catalog --workspace=api
```

The sync stops without changing the platform catalog if any required provider
plan mapping is missing. When commercial terms change, increment that item's
`revision` so existing subscriptions retain their entitlement snapshot.

The initial monthly prices are ₹9,999 (Partner), ₹29,999 (Growth Partner) and
₹59,999 (Agency); annual prices provide approximately two months free. Meta
WhatsApp message charges, telephony charges and other provider pass-through
costs are not included in these platform prices and should be disclosed
separately in commercial terms.

Add-on quantity reductions and cancellations are scheduled at Razorpay cycle
end. The current paid capacity remains active until the verified webhook
confirms the change; customer data is never removed when capacity decreases.

AI Call Assistant is catalogued as a preview but has zero allowance. The UI and
API return Coming Soon unless `CALL_ASSISTANT_PUBLIC_ENABLED=true` or the caller
is a configured owner/admin user.

The new Razorpay flow never trusts a browser-provided amount or plan ID. A checkout selects a database plan by code. Entitlements change only after the signed, idempotently processed webhook confirms provider state.

## Migration

The migration is dry-run by default:

```bash
npm run migrate:platform --workspace=api
```

Review every reported user and resolve any `skipped_conflict` result. Then apply:

```bash
npm run migrate:platform:apply --workspace=api
```

Rollback preview and rollback application:

```bash
npm run migrate:platform:rollback --workspace=api
npm run migrate:platform:rollback --workspace=api -- --apply
```

The migration:

- creates one direct Business workspace per existing Clerk user;
- creates the owner membership, enabled service configuration and onboarding state;
- writes migration-only legacy subscriptions so effective entitlements preserve detected product access;
- adds `workspaceId` only where a legacy Clerk owner can be proven;
- is resumable through `migrationVersion = platform-workspaces-v1`;
- never deletes existing automation data.

Legacy `Appointment` documents currently have no owner or chatbot identifier. The script deliberately reports and leaves them unassigned. They require a separate business-approved mapping before tenant exposure.

Rollback only removes records created by this migration version and unsets matching `workspaceId` fields. It does not delete legacy product data.

## Rollout order

1. Back up MongoDB and test against a production snapshot.
2. Add environment variables and provider webhook subscriptions.
3. Populate inactive plan/add-on definitions, review them, then activate approved revisions.
4. Deploy the additive API and verify signed Clerk/Razorpay events.
5. Run migration dry-run; review conflicts and the unowned appointment report.
6. Apply migration in batches during a monitored window.
7. Update each legacy product route to require workspace context and query by `workspaceId`, retaining the legacy owner predicate as a temporary compatibility guard.
8. Release the agency/client platform UI and workspace selector.
9. After query parity and authorization tests pass, remove legacy owner-only authorization and old checkout/webhook paths.

## Current compatibility boundary

The tenant foundation, provisioning, permissions, entitlements, usage primitives, billing checkout/webhook, audit records, migration tooling and initial security fixes are implemented. Existing product controllers have not all been switched to mandatory workspace context yet, and the new agency dashboard UI is not part of this backend foundation change. Do not remove legacy fields or run a destructive migration until those route conversions and end-to-end isolation tests are complete.
