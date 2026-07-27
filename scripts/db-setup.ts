/**
 * One-shot backend setup for the active target (NEXT_PUBLIC_ENV): apply the RLS
 * migrations, then the post-migration extras (grants, realtime publication,
 * storage bucket + policies). Idempotent — safe to re-run.
 *
 *   npm run db:setup          # targets NEXT_PUBLIC_ENV (local or cloud)
 *
 * Confirms once before touching a cloud target.
 */

import { applyPolicies } from "./apply-rls-policies";
import { applyExtras } from "./setup-extras";
import { confirmCloudTarget, resolveTarget, targetLabel } from "./env";

void (async () => {
  const target = resolveTarget();
  console.log(`▶ target: ${targetLabel(target)}`);
  await confirmCloudTarget(target);

  console.log("\n== Migrations ==");
  await applyPolicies(target);

  console.log("\n== Extras ==");
  await applyExtras(target);

  console.log(`\n✓ ${targetLabel(target)} is set up.`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
