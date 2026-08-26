# Battle Builder agent handoff

1. Read `ux-audit/IMPLEMENTATION_PLAN.md`, `ux-audit/JOB_BATCHES.md`, and
   `ux-audit/BACKLOG.md` before making a batch change.
2. Work only in this repository root. Do not modify the parent Antigravity
   repository or the local reference folders.
3. Treat `Design Cyberpunk 3D Planner/` and `Battle Builder Inspo/` as visual
   and interaction reference only. Do not copy their code, assets, imagery, or
   fonts into the product.
4. Finish and verify the active batch before starting its successor. Phase 2 is
   not authorized until B12 signs off Phase 1.
5. Browser tests must use `e2e/fixtures.ts` when accessing storage. It keeps
   Playwright data separate from a user's `battle-builder/v1/draft` data.
6. Keep production code under `src/`, browser tests under `e2e/`, build checks
   under `scripts/`, and review evidence under `ux-audit/`.
7. Record every discovered issue in `ux-audit/BACKLOG.md`; do not declare a
   batch done with an unlogged known defect.
8. Run the batch verification commands and update the batch table, backlog, and
   review log truthfully before handoff.
