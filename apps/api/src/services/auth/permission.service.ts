import type {
  PlatformPermission,
  PlatformRole,
} from "@rocketreplai/shared/platform";

const ALL_PERMISSIONS: PlatformPermission[] = [
  "agency.view",
  "agency.manage",
  "agency.billing.manage",
  "agency.team.manage",
  "clients.view",
  "clients.create",
  "clients.archive",
  "clients.services.manage",
  "workspace.view",
  "workspace.manage",
  "workspace.billing.manage",
  "workspace.team.manage",
  "automation.view",
  "automation.manage",
  "leads.view",
  "conversations.view",
  "conversations.manage",
  "appointments.view",
  "appointments.manage",
  "integrations.view",
  "integrations.manage",
  "analytics.view",
];

const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  AGENCY_OWNER: ALL_PERMISSIONS,
  AGENCY_ADMIN: ALL_PERMISSIONS.filter(
    (permission) => permission !== "agency.billing.manage",
  ),
  AGENCY_STAFF: [
    "agency.view",
    "clients.view",
    "workspace.view",
    "automation.view",
    "automation.manage",
    "leads.view",
    "conversations.view",
    "conversations.manage",
    "appointments.view",
    "appointments.manage",
    "integrations.view",
    "analytics.view",
  ],
  CLIENT_OWNER: [
    "workspace.view",
    "workspace.manage",
    "workspace.billing.manage",
    "workspace.team.manage",
    "automation.view",
    "automation.manage",
    "leads.view",
    "conversations.view",
    "conversations.manage",
    "appointments.view",
    "appointments.manage",
    "integrations.view",
    "integrations.manage",
    "analytics.view",
  ],
  CLIENT_MEMBER: [
    "workspace.view",
    "leads.view",
    "conversations.view",
    "appointments.view",
  ],
};

export function getEffectivePermissions({
  role,
  granted = [],
  denied = [],
}: {
  role: PlatformRole;
  granted?: PlatformPermission[];
  denied?: PlatformPermission[];
}) {
  const permissions = new Set<PlatformPermission>(ROLE_PERMISSIONS[role]);
  granted.forEach((permission) => permissions.add(permission));
  denied.forEach((permission) => permissions.delete(permission));
  return [...permissions];
}

export const hasPermission = (
  permissions: PlatformPermission[],
  permission: PlatformPermission,
) => permissions.includes(permission);
