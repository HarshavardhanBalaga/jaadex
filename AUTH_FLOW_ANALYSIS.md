# Website-user authentication: analysis

Scope: authentication for **website users** (the `users` collection). Admin and superadmin authentication
(`admins` collection, `/api/admin/auth/*`, `src/lib/admin/*` session/JWT code) is out of scope and unchanged.

## 1. Current architecture (verified from code)

| Concern | Implementation |
|---|---|
| Framework | Next.js 16 App Router, route handlers under `src/app/api/auth/*` |
| Database | MongoDB via Mongoose (`src/lib/mongodb.ts`) |
| Password hashing | bcryptjs, cost 12 (`src/lib/admin/password.ts`) |
| OTPs | 6–8 digit codes, stored only as HMAC hash with `OTP_PEPPER` (`src/lib/admin/otp.ts`), in `user_otps` with expiry, attempt counter, resend cooldown/limit, atomic single-use consume (`src/lib/user/auth-service.ts` `issueOtp` / `consumeOtp`) |
| Sessions | Opaque random 32-byte token in HTTP-only `__Host-jaadex_user` cookie (SameSite=Lax); only its SHA-256 stored in `user_sessions` (`src/lib/user/session.ts`). `getCurrentUser()` re-checks DB session + `status: "active"` on every request |
| CSRF | Double-submit token (`src/lib/admin/csrf.ts`) on every state-changing POST |
| Rate limiting | Mongo-backed atomic counter (`src/lib/admin/rate-limit.ts`), per IP and per email on login |
| Google OAuth | Server-side authorization-code flow with state + PKCE + nonce (`src/lib/oauth/google.ts`), transaction in `__Host-jaadex_user_oauth` cookie, ID token verified against Google JWKS, `aud`, `iss`, nonce, and **`email_verified === true` required** |
| Middleware | `src/proxy.ts` is UX-only (redirects guests from `/contact`); real checks happen server-side via `getCurrentUser()` |
| Roles | Users have **no role field**. Admin/superadmin are a separate model (`src/models/Admin.ts`, `role: "superadmin" \| "admin"`) with separate cookies/sessions; a user session never grants admin access |

## 2. User data model (`src/models/User.ts`)

```
name, email (unique, lowercased), passwordHash (nullable, select:false),
googleSub (nullable; partial unique index uniq_user_google_sub),
status: pending | active | disabled, emailVerifiedAt, lastLoginAt, timestamps
```

How accounts are stored today:
- **Password account**: `passwordHash` set, `googleSub: null`, created `pending`, activated on OTP verification.
- **Google account**: `passwordHash: null`, `googleSub: <sub>`, created `active`.
- **Both**: `passwordHash` and `googleSub` both set on the same document.

The single-document design already supports one user / many methods / one user ID, with unique email and
unique Google identity. **No new credential collection is needed.**

## 3. Current flows

**Register (email/password)**: `POST /api/auth/register` creates (or re-uses) a `pending` user and emails a
`register` OTP. `POST /api/auth/register/verify-otp` consumes it and sets name + password + `active`.
Returns `email_taken` (409) for non-pending emails.

**Login (email/password)**: `POST /api/auth/login` → `loginUser()`. Outcomes `no_account` (404, UI redirects to
register), `google_only` (401 `google_account`, message points to Forgot password), `invalid`, `ok`.

**Forgot password**: `POST /api/auth/password/forgot` (always the same response) issues a `password-reset`
OTP to any active account; `POST /api/auth/password/reset` sets the new password and revokes all sessions.
For a Google-only account this silently works as "add a password".

**Google**: `GET /api/auth/google/start` → Google → `GET /api/auth/google/callback` →
`loginOrCreateUserWithGoogle()` (`src/lib/user/google-login.ts`):
- lookup by `googleSub`, then by email;
- none → create active Google-only user;
- `pending` password registration → activate, discard its password and open OTPs (owner proven by Google);
- `disabled` → refused; different `googleSub` already linked → refused;
- **active account without `googleSub` → linked automatically** (conditional on `googleSub: null`).

## 4. Conflict scenarios today

| Scenario | Current behaviour | OK? |
|---|---|---|
| A. New Google user | Created active, logged in | ✅ |
| B. Google-only user tries password login | `google_account` error with explicit message | ⚠️ reveals account type |
| C. Google-only user wants a password | Only via "Forgot password" (reset wording) | ⚠️ no distinct flow |
| D. Password user tries Google | **Auto-linked on email match** | ❌ no proof of account control |
| E. Both methods | Same `_id` either way | ✅ |

## 5. Security issues identified

1. **Auto-linking (D)**: Google identity is attached to an existing password account because emails match.
   Reviewed and **kept by product decision**: Google requires `email_verified`, and a password account only
   becomes active after its own email OTP, so both sides have proven control of the same mailbox. Unverified
   (pending) registrations are taken over with their password discarded.
2. **Account enumeration on login**: `no_account` (404) and `google_account` responses reveal whether an email is
   registered and how. Bounded only by rate limits.
3. **Account enumeration on register** (`email_taken` 409): noted, **out of scope** for this change.
4. No distinct password-setup purpose: setup and reset share one OTP purpose and wording.

## 6. Proposed minimal changes

- `UserOtp.purpose` += `password-setup` (additive enum, no migration).
- Login keeps `no_account` (404, UI redirects to register; reveals that an email is unregistered, bounded by
  rate limits — an accepted product tradeoff), but wrong password and Google-only both return the same
  `invalid_credentials`; the UI then offers "Continue with Google" and "Set a password".
- New password-setup flow (`/api/auth/password/setup/request` + `/confirm`): only for active accounts with no
  password; conditional write on `passwordHash: null`; same user ID; Google identity untouched.
- Google sign-in on an existing password account: unchanged — links automatically (conditional write on
  `googleSub: null`; a different Google account can never take over a linked user).
- Role boundary: admin/superadmin accounts are separate documents in the `admins` collection. The user flows
  only ever read/write `users`, so an email that also has an admin account can set a user password or use
  Google on its *user* record without affecting admin login, credentials or role. Admin code untouched.
  No route accepts a role.
- No new environment variables. No data backfill required.
