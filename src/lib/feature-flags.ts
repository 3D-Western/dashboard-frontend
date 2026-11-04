/**
 * Whether students can create print jobs (the My Jobs nav entry, the dashboard Quick actions and
 * the New print flow). It is on by default on this branch; set NEXT_PUBLIC_JOB_CREATION_ENABLED=false
 * (at build time, as every NEXT_PUBLIC_ variable) to hide job creation again, as the launch did
 * (docs/LAUNCH_SCOPE.md). Existing jobs stay reachable at /dashboard/jobs either way.
 */
export function isJobCreationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_JOB_CREATION_ENABLED !== 'false';
}
