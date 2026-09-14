# MANI School ERP — Auth Testing Notes

Founder (seeded): mahatofauji@gmail.com / ManiFounder@2026 (role founder_admin)

Auth endpoints (all under /api/auth): login, logout, me, refresh, forgot-password, reset-password.
Cookies: httpOnly access_token (60min) + refresh_token (7d), SameSite=none, Secure.

Password reset local test: set FRONTEND_URL="http://localhost:3000" in backend/.env and restart to log
the reset link to backend logs (token_hash is not reversible). Restore https origin after.

Roles: founder_admin, school_admin, principal, teacher, student, parent.
Only higher roles create lower roles. No public signup.
Multi-tenant: every non-founder request is scoped to user.school_id server-side; assert_school_access
blocks cross-school access with 403.
