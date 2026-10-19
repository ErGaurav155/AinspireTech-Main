export const selectAgencyWorkspaceIdsForRemoval = ({
  activeWorkspaceIds,
  retainedWorkspaceIds,
  targetLimit,
}: {
  activeWorkspaceIds: string[];
  retainedWorkspaceIds: string[];
  targetLimit: number;
}) => {
  const active = [...new Set(activeWorkspaceIds)];
  if (targetLimit < 0 || active.length <= targetLimit) return [];

  const activeSet = new Set(active);
  const keep = new Set(
    [...new Set(retainedWorkspaceIds)]
      .filter((workspaceId) => activeSet.has(workspaceId))
      .slice(0, targetLimit),
  );

  // A client can be removed after the downgrade was requested. Preserve the
  // selected clients first, then fill any newly vacant slots deterministically.
  for (const workspaceId of active) {
    if (keep.size >= targetLimit) break;
    keep.add(workspaceId);
  }

  return active.filter((workspaceId) => !keep.has(workspaceId));
};
