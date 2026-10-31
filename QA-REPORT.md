# HAKORA — End-to-End QA Audit Report

**Date:** 31/10/2026 · **Build:** production (`next build`, 28 pages) · **Method:** real headless-Chrome automation (Playwright), raw HTTP probes, and direct PostgreSQL verification. Every result below was actually executed — nothing is assumed.

---

## 1. Features Tested (and passing)

### Public student site
| Area | Verified |
|---|---|
| Pages | All 13 public pages (home, services index + 6 service detail pages, submit-requirement, about, contact, privacy, terms) return 200, no console errors, no broken images, no broken internal links |
| Splash screen | Logo animation plays, slides into homepage, removed from DOM afterwards, once-per-session, reduced-motion fallback |
| Requirement form | Empty submit blocked with field hints · invalid mobile rejected · valid submit redirects to thank-you with unique ref (CS-2026-0002/0004 generated live) · enquiry + customer + attachment rows verified in PostgreSQL |
| File upload | PDF accepted, stored under `uploads/enquiries/<date>/<uuid>.pdf`, recorded in `EnquiryAttachment` with correct MIME/size · `.exe` blocked client-side AND server-side allowlist (`.pdf .doc .docx .jpg .jpeg .png`) — nothing reached disk/DB |
| WhatsApp | wa.me links on home/thank-you/footer carry correct number + URL-encoded prefilled messages |
| Responsiveness | 390px (phone), 768px (tablet), 1366px (desktop): 0px horizontal overflow on every page tested; screenshots in `mobile-check/` |
| Slow network | Simulated slow-3G: homepage DOM-ready 1.5s, CTA visible and tappable |

### Admin dashboard (all 13 modules)
| Area | Verified |
|---|---|
| Auth | Anonymous → redirected to login · wrong password → error message · correct login → dashboard · logged-in user visiting /login → bounced to dashboard · sign-out kills session · tampered/forged cookies → 401 |
| Dashboard | Stats match DB truth; revenue counts **only successful** payments (failed ₹100 excluded) |
| Enquiries | List, search (name/mobile/ref), status filter, status dropdown persists, internal notes persist, attachment listed + downloadable (admin-only), archive/delete buttons present, CSV export contains real data |
| Customers | List + profile edit persists |
| Quotations | Full lifecycle — see §2 |
| Orders | Status select persists · manual payment recording (₹200 UPI) reflected in order + payments module |
| Payments | List with customer/quotation/order links, gateway refs, statuses, refund action |
| Printing | Quotation calculator computes live from pricing rules (verified ₹ output for 100p × 2 copies) |
| Files | Uploaded attachment listed |
| Deliveries | Renders, status filter hardened |
| Services | Create → appears on public /services instantly · delete → removed from public site |
| Reviews | Add (approved) → shows on homepage · delete → gone from homepage + DB |
| Notifications | New-enquiry, payment-received, quotation-accepted events all raised; mark-all-read works |
| Settings | Tagline change reflected on public homepage immediately, then reverted |
| Analytics | Charts render |

### Quotations & payments (critical path)
Tested through the real UI end-to-end:
1. Create from enquiry → editor pre-fills, live totals correct (2 items = ₹500, 40% advance = ₹200)
2. Generate secure link → one-time display, token ≥40 chars, only SHA-256 hash stored, WhatsApp prefill includes link
3. Anonymous student (mobile viewport) opens portal → items/totals/terms visible, SENT→VIEWED recorded
4. Accept → confirmation shown, admin sees Accepted + timestamp + notification
5. Edit after send → revision bumped to Rev 2, totals updated, history recorded
6. Admin PDF + student portal PDF both return valid `%PDF` documents
7. Cancel → portal shows cancelled notice, **Pay button removed**, payment refused
8. Razorpay (webhook/signature layer, test-mode server side):
   - Signed `payment.captured` → payment SUCCESS, **order auto-created** (CSO-2026-0001), invoice HINV-2026-000x, quotation PARTIALLY_PAID→PAID, enquiry CONFIRMED, notifications raised
   - Advance meeting the configured requirement → order **CONFIRMED** (fixed, see §3)
   - Duplicate webhook → `{ok:true,duplicate:true}`, no double-apply
   - Forged webhook signature → 400 · forged checkout signature on /verify → rejected
   - `payment.failed` → FAILED with failure reason, shown in portal history
9. Cross-access: wrong/short/path-traversal/script-injection tokens → "Quotation not found", nothing leaked, token never reflected unescaped

## 2. Security Testing
- **Secrets:** AUTH_SECRET, webhook secret, DB URL, RAZORPAY_KEY_SECRET — none present in client JS bundles ✔
- **SQL injection:** probes on q/status params → no effect (Prisma parameterized; tables intact) ✔
- **XSS:** hostile `<img onerror>`, `<script>`, `<svg onload>` submitted through the real form → rendered inert on admin list + detail (React escaping) ✔
- **Authz:** every /admin page & API (PDF, CSV export) → 401/redirect without valid session ✔
- **Rate limiting:** login 10/15min, enquiry 8/10min, portal accept 20/10min, payment order 15/10min — limiter verified (8/10 allowed) ✔
- **File access:** attachment download requires admin session (anonymous → denied) ✔
- **Payments:** browser success is never trusted; server signature + webhook verification only ✔

## 3. Bugs Found & Fixed (all fixes verified on the final build)
| # | Bug | Severity | Fix |
|---|---|---|---|
| 1 | Advance payment meeting the configured requirement left the order `PAYMENT_PENDING` instead of auto-confirming per payment terms | High (business logic) | `applySuccessfulPayment` now computes `requiredMet` (full total or advance amount) and confirms the order when met; never downgrades an existing status. Re-tested via signed webhooks: ₹325 advance → CONFIRMED |
| 2 | Tampered `?status=` URL param crashed 5 admin list pages with HTTP 500 (invalid Prisma enum) | Medium (robustness/DoS) | Status params whitelisted against the real status lists on payments, quotations, enquiries, orders, deliveries. Probes now return 200; valid filters still work |
| 3 | Revenue/spend stats counted pending+failed payments | Medium (data accuracy) | All aggregations filter `status='SUCCESS'` (dashboard, customers, order balance) — verified ₹650 shown with a failed ₹100 in DB |
| 4 | ESLint absent; 4 JSX unescaped-entity errors | Low | ESLint (next/core-web-vitals) configured; all errors fixed; `next lint` → clean |

No temporary workarounds, fake data, or hardcoded successes were introduced.

## 4. Automated Checks (final run)
- `tsc --noEmit` → **0 errors**
- `next lint` → **0 warnings/errors**
- `npm test` → **16/16 passing** (validation, refs, sessions, passwords, wa.me, quotation totals, access tokens, Razorpay checkout + webhook signatures, DB, atomic counters)
- `next build` → **28/28 pages**
- Post-deploy smoke: health 200, portal 200, splash present, webhook rejects bad signatures, regression probes green, full student→admin→portal journey re-run on the final build ✔

## 5. Blocked / Not Testable in This Environment
| Item | Why | Risk mitigation |
|---|---|---|
| Live Razorpay checkout popup | No test-mode API keys in sandbox | Server-side layer (order creation contract, signature verify, webhooks, idempotency) fully tested with signed simulations; portal degrades gracefully (verified) when keys absent. **Action: add test keys on Render and run one ₹1 UPI test payment.** |
| Firefox / Safari / Edge | Only Chromium available in sandbox | Edge is Chromium. Site uses standard CSS/JS (Tailwind, no exotic APIs); risk low, but do a quick manual check on a real iPhone (Safari) after deploy. |
| S3/R2 object storage mode | No credentials in sandbox | Code path exists with signed URLs; local fallback fully tested. **Action: set STORAGE_* env vars on Render — local disk there is ephemeral.** |
| SMTP email delivery | No SMTP credentials | Email is optional and cleanly skipped when unconfigured (verified no crash). |

## 6. Remaining Recommendations (not bugs)
1. **Before go-live on Render:** set `RAZORPAY_KEY_ID/KEY_SECRET/WEBHOOK_SECRET`, `STORAGE_*` (R2/S3), `NEXT_PUBLIC_SITE_URL`, and register the webhook URL `/api/payments/webhook` in the Razorpay dashboard (events: payment.captured, payment.failed).
2. Optional UX: convert wide admin tables to stacked cards on phones (currently standard scroll-within-card).
3. Optional: return HTTP 404 status (not 200 + message) for unknown portal tokens — cosmetic, no security impact.
4. QA test data created during this audit (QA Tester / Final Journey enquiries, HQ-2026-0002 cancelled quote) can be kept as sample data or deleted from the admin UI.

**Verdict: all tested features work on the student side and admin side; 4 bugs found, 4 fixed and re-verified. Production-ready pending the two go-live actions above (Razorpay test keys + object storage credentials on Render).**
