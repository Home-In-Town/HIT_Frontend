'use client';

// What the signed-in user may do in the Layout Editor, and the ONE
// Layout_Version shared by every tab (R8.7, R8.8, R8.12, R17.10).
//
// `canEdit` / `canEditStatus` / `layoutVersion` come from GET /projects/:id
// (already fetched by the page). A backend that does not send the flags yet is
// treated as "edit": the server still enforces roles on every write, so the
// worst case is a 403 that flips the page to read-only (loseAccess).

import { useCallback, useState } from 'react';

export type EditorAccess = 'edit' | 'status-only' | 'read-only';

export function accessFromFlags(flags: { canEdit?: boolean; canEditStatus?: boolean } | null | undefined): EditorAccess {
  if (!flags || flags.canEdit === undefined) return 'edit';
  if (flags.canEdit) return 'edit';
  return flags.canEditStatus ? 'status-only' : 'read-only';
}

export function useProjectPermissions(project: { canEdit?: boolean; canEditStatus?: boolean; layoutVersion?: string | null } | null) {
  // undefined = not known (older backend): writes go out without a token.
  const [layoutVersion, setLayoutVersion] = useState<string | null | undefined>(project?.layoutVersion);
  const [lost, setLost] = useState(false);
  // A new project object (first load, or Reload after a 409) resets the version
  // and the access downgrade. Done during render, not in an effect, so there is
  // no extra render with the old version.
  const [seen, setSeen] = useState(project);
  if (project !== seen) {
    setSeen(project);
    setLayoutVersion(project?.layoutVersion);
    setLost(false);
  }

  const base = accessFromFlags(project);
  // A 401/403 on save downgrades to what the user can still do (R8.8).
  const access: EditorAccess = lost && base === 'edit' ? (project?.canEditStatus ? 'status-only' : 'read-only') : base;

  const loseAccess = useCallback(() => setLost(true), []);
  return {
    access,
    canEdit: access === 'edit',
    canEditStatus: access !== 'read-only' && (project?.canEditStatus ?? true),
    layoutVersion,
    setLayoutVersion,
    loseAccess,
  };
}
