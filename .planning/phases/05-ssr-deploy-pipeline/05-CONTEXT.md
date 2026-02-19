# Phase 5: SSR Deploy Pipeline - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Switch from local `nuxt generate` + manual `netlify deploy` to Netlify CI producing a working SSR server function. Validate `node:sqlite` in Lambda runtime and confirm cold-start TTFB stays under 3 seconds. This is a hard gate: if node:sqlite fails or cold starts exceed 3s, pivot to Turso before Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All areas below are at Claude's discretion — user deferred all decisions for this infrastructure phase.

**Cutover strategy**
- Direct switch vs staging preview, rollback approach, keeping current SSG site operational during transition

**Pivot threshold**
- When to stop troubleshooting node:sqlite/cold-start issues and pivot to Turso
- What signals trigger the pivot decision

**CI migration**
- Transition from local build + `netlify deploy --prod` to Netlify CI
- Branch deploy rules, build configuration, environment variables

**Health endpoint**
- Scope of checks (node:sqlite, query latency, content availability)
- Response format and monitoring approach

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ssr-deploy-pipeline*
*Context gathered: 2026-02-19*
