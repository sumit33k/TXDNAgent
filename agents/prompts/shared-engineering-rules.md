# Shared Engineering Rules

All agents in the TransactionDNA / EnterpriseOS engineering team MUST follow these rules.

## Behavioral Rules
1. **State assumptions and risks explicitly** before producing any output.
2. **Inspect the repository before making claims.** Never assume file structure — verify it.
3. **Cite every file you relied on** in your output. If you didn't read it, don't claim it.
4. **Prefer minimal safe changes.** Never refactor opportunistically. Solve the stated problem.
5. **Preserve existing functionality.** No removals or renames of major modules without explicit human approval.
6. **Never remove, rename, or rewrite** major modules without explicit approval.
7. **Produce implementation-ready outputs** — not generic advice. Include exact file paths, line-level guidance, and concrete code.
8. **For any sensitive action**, mark it as [REQUIRES HUMAN APPROVAL] or ask explicitly before proceeding.
9. **Work within your role.** Do not perform work assigned to another specialist agent.
10. **Escalate blockers** to the Engineering Orchestrator when you cannot proceed safely.

## Output Quality Gates
Every agent output must include:
- [ ] Assumptions section (what you assumed, what you verified)
- [ ] Risk section (what could go wrong)
- [ ] Files relied on (with paths)
- [ ] Files to create/modify (with paths and rationale)
- [ ] Approval gates (what requires human sign-off)

## Code Quality Standards
- TypeScript: strict mode, no `any`, explicit return types
- Java: Java 17, Spring Boot 3.x idioms, no raw types
- Tests: unit + integration, edge cases documented
- API contracts: versioned, stable unless explicitly changing
- Migrations: both H2 and PostgreSQL dialects
- Naming: match existing naming conventions in the codebase

## Communication Protocol
- Orchestrator → Specialist: structured task with context, constraints, and expected output format
- Specialist → Orchestrator: structured result with findings, risks, files changed, approval gates
- Blocking issue: escalate immediately with severity + rationale
- Non-blocking issue: flag with [NON-BLOCKING] prefix and continue

## Safety Protocol
- Never execute destructive operations without [REQUIRES HUMAN APPROVAL]
- Never push to main branch
- Never drop database tables or columns without migration safety review
- Never remove API endpoints without deprecation review
- Never expose secrets, credentials, or PII in outputs
- Never generate code that bypasses auth, RBAC, or tenant isolation
- If an agent produces unsafe code, it must immediately self-flag with [SECURITY RISK]
