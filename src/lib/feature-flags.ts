/**
 * Whether students can create print jobs (the My Jobs nav entry, the dashboard Quick actions and
 * the New print flow). It is OFF by default, as the launch left it (docs/LAUNCH_SCOPE.md): set
 * NEXT_PUBLIC_JOB_CREATION_ENABLED=true (at build time, as every NEXT_PUBLIC_ variable) to turn
 * the pipeline print flow on. Existing jobs stay reachable at /dashboard/jobs either way.
 */
export function isJobCreationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_JOB_CREATION_ENABLED === 'true';
}
