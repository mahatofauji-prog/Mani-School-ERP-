# MANI SCHOOL ERP — PRD (append log)

Founder: mahatofauji@gmail.com / ManiFounder@2026.

## Modules (all verified, multi-tenant, JWT httpOnly-cookie auth, bcrypt)
- Foundation: universal login + role routing, tenant isolation, audit, soft-delete, password reset, brute-force, PIN Quick Login.
- Founder portal: dashboard+charts, Schools CRUD+details+suspend/modules/subscription, Global Users, Plans, Subscriptions, Announcements, Audit, System Health, Platform Settings.
- School Admin: dashboard, users+logins (teacher/student/parent/principal), classes/sections/subjects, attendance, School Profile, classroom content.
- Teacher: dashboard, My Classes, Homework/Materials/Videos, attendance, My Students.
- Student/Parent: read-only class feeds; Parent child-selector per-child view.
- ID Cards (client-rendered, print/PDF) for student/teacher + School Admin browse.

## MANI Solutions Payments — Workflow 2 backend (2026-06)
- `/api/payments`: founder-settings (GET/PUT), invoices (create founder / list scoped), submit-proof (school_admin own school + duplicate-UTR 409), verify (founder approve->paid+receipt MANI-RCPT / reject+reason). Audit on all. Curl-verified end-to-end.
- Collections: invoices, founder_settings. Additive; no existing code changed.

## QR Code Attendance — Founder-controlled feature flag (2026-06)
- Separate from biometric. Global flag `qr_attendance` in platform settings (default ENABLED); per-school flag (default ON). Effective = Global ON AND School ON. auth_utils: `global_qr_enabled`, `qr_enabled_for_school`, `require_qr`; flag attached to user via `attach_school_context`.
- Every Student gets a permanent secure `qr_token` (secrets.token_urlsafe) on creation; lazy-backfilled on read for older students. Token is a random identifier only — no sensitive data encoded. ID Card renders QR from the token via `qrcode.react` (`MANIQR:<token>`).
- New `/api/qr` router (gated by `require_qr`): `POST /scan` (teacher/school_admin/principal) resolves student ONLY by token, enforces active status, same-school, class/section + teacher-assignment authorization, duplicate protection (one record per school+date+student → "Attendance already marked."), marks method=qr with time + qr_scan_ref, writes to existing attendance collection. `POST /regenerate/{student_id}` (school_admin/principal) rotates token, old invalid, history preserved.
- Frontend: Platform Settings + Feature Modules QR toggles; Teacher Attendance method selector [Manual]/[QR Code]/[Biometric] (each flag-gated); `QrAttendancePanel.jsx` uses html5-qrcode for mobile camera scanning with continuous fast scan, running present list/count, and friendly errors (permission/no-camera/unsupported/invalid/duplicate). Manual & biometric untouched. Student/Parent have no scanner.
- Verified end-to-end: 16/16 security checks (auto-token, valid scan, duplicate block, cross-school 403, wrong-class 403, invalid QR 404, regenerate rotate+history, global-off 403, global-on+school-off 403, both-on 200, biometric independent). Temp test schools cleaned up (schools:0, users:1, attendance:0, flag reset).

## Biometric Attendance — Founder-controlled feature flag (2026-06)
- Global master flag `biometric_attendance` in platform settings (default DISABLED); per-school flag on each school (default DISABLED). Effective = Global ON AND School ON.
- Founder UI: Platform Settings → Feature Management → Attendance Features toggle; Feature Modules page → per-school Attendance Features toggle (disabled unless global ON).
- New `/api/biometric` router: devices (register/status/delete), enrollments (enroll/remove), attendance submit (device sync → writes attendance method=biometric), sync-logs, status. Every endpoint hard-blocks with 403 via `require_biometric()` when effective flag off. auth_utils: `global_biometric_enabled`, `biometric_enabled_for_school`, `require_biometric`, flag attached to user via `attach_school_context`.
- Frontend: School Admin `Biometric.jsx` page + nav (flag-gated), Attendance method selector [Manual]+[Biometric] shown only when enabled. Manual attendance untouched (now tagged method=manual). No QR built (doesn't exist yet). No hardware SDK — architecture-ready only.
- Verified end-to-end (curl): global OFF→403, global ON+school OFF→403, both ON→200; founder toggles both; admin /me carries flag. Temp test school cleaned up (users:1, schools:0, flag reset false).

## Regression suites (133 tests) at /app/backend/tests/

## Backlog / DEFERRED (not built)
- Payments Workflow 2 FRONTEND (Founder invoice UI + verification, School Admin pay page); Payments dashboard/charts; PDF receipts.
- Payments Workflow 1 entirely (School fee payment: SchoolPaymentSettings, StudentFees, parent pay page, School Admin verification, fee receipts).
- Exams/Marks/Results engine -> Marksheets & Certificates & Founder template editor.
- Logo uploader UI, WebAuthn biometric, QR/biometric attendance, document uploads, camera capture.
