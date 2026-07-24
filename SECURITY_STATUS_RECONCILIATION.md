# Reconciliation: IMPLEMENTATION_SUMMARY.md vs. historical issue backlogs

**Verified against live code on:** 2026-07-24

## Context

`IMPLEMENTATION_SUMMARY.md` (branch `fix/559-560-561-562`, 2026-05-27) claims three problems were fixed:

1. `syncAllPayments` calling `syncPaymentsForSchool` twice / sending two responses (#559, #560)
2. Cross-school data isolation gaps in payment queries (#561)
3. Missing authentication on write endpoints (#562)

In some forks of this repository, later static backlog documents (`issues.md`, `GITHUB_ISSUES.md`, `PROJECT_ISSUES.md`) listed what read as the same three problems as still open, with full problem/fix/acceptance-criteria writeups — appearing to contradict this summary.

Those three files don't exist in this repository. They were deliberately removed here in `99a414e` ("docs: remove three redundant, contradictory issue-backlog files", closing #1110), on the grounds that three overlapping, audit-generated markdown backlogs with no canonical status are unreliable and that the live GitHub Issues tracker is this project's single source of truth. That removal resolves the *documentation* contradiction directly — there's no still-open static claim left to reconcile against `IMPLEMENTATION_SUMMARY.md` in this repo.

What that removal doesn't establish on its own is whether the underlying **code claims** in `IMPLEMENTATION_SUMMARY.md` still hold. This document verifies that directly against current code, so a reader doesn't have to take either the summary or a deleted backlog's word for it.

## Verified current state

### 1. Duplicate `syncAllPayments` call — still fixed
`backend/src/controllers/paymentAdminController.js:33-79`: `syncPaymentsForSchool(req.school)` is called exactly once (line 52), `res.json()` exactly once on the success path. The function has since gained a distributed Redis lock (`Issue #69`) on top of the original fix, and the duplicate-call bug has not reappeared.

### 2. Cross-school data isolation — still fixed
`backend/src/controllers/paymentQueryController.js`: `getStudentPayments` scopes the student lookup and payment find/count by `schoolId` (lines 63, 71-73). `getStudentBalance` scopes the student lookup, the main balance aggregation, and the category-breakdown sub-aggregation all by `schoolId` (lines 190, 195, 220).

### 3. Missing write-endpoint authentication — still fixed
Every endpoint named in the original fix carries `requireAdminAuth` today: student routes (`studentRoutes.js`), fee routes (`feeRoutes.js`), school routes (`schoolRoutes.js`), and `POST /api/payments/sync` / `PATCH /api/payments/:txHash/status` (`paymentRoutes.js`).

## A related, still-open gap (do not confuse with the above)

Most payment **read** endpoints trust the `X-School-ID`/`X-School-Slug` header alone — `resolveSchool` (`backend/src/middleware/schoolContext.js`) only validates tenant binding against a JWT when one happens to be present on the request. That's a header-trust gap specific to reads, distinct from the write-endpoint `requireAdminAuth` gap fixed in #562. It should be tracked as its own GitHub issue, not folded into this reconciliation.

## Disposition

`IMPLEMENTATION_SUMMARY.md` is accurate and current; no change needed there beyond a pointer to this document. No other repository markdown currently contradicts it. If a future static backlog is reintroduced and drifts out of sync again, prefer filing/updating a GitHub issue over trusting either document at face value — see the rationale in `99a414e`.
