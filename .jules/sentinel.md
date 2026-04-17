## 2024-05-23 - [Information Leakage in 500 Responses]
**Vulnerability:** Manual `try...catch` blocks in route handlers were catching unknown errors and returning them directly in the response body, leaking sensitive details (e.g., database errors) to the client.
**Learning:** This pattern bypasses the global error handler (`useApiError` in `withV1Route`) which is designed to sanitize internal errors. Furthermore, a `TypeError` (due to a missing import in the handler) in the test environment masked this vulnerability during reproduction, as the `TypeError` itself was caught and sanitized by the global handler, hiding the fact that the original code would have leaked the error.
**Prevention:** Avoid manual `try...catch` blocks for global error handling in route handlers. Rely on `withV1Route`'s `onError` callback for side effects (like cookie cleanup). Ensure tests are robust and run in the correct environment (`@vitest-environment node`) to prevent environment-specific errors from masking logic bugs.

## 2024-05-24 - [User Enumeration via Timing Attack]
**Vulnerability:** The `loginWithPassword` method returned immediately if a user was not found, while performing an expensive `bcrypt.compare` operation if the user existed. This timing difference allowed attackers to enumerate valid usernames.
**Learning:** `bcrypt` is intentionally slow. Skipping the comparison for non-existent users creates a measurable side-channel. Even though account locking existed, the timing leak happened before locking checks in the code path (or could be exploited without triggering locks if done carefully).
**Prevention:** Always perform a `bcrypt.compare` operation against a dummy hash when the user is not found, ensuring that the response time is consistent regardless of user existence.

## 2025-02-23 - [Weak MFA Secret Acceptance]
**Vulnerability:** The `enableMFA` API endpoint allowed setting up Multi-Factor Authentication (MFA) with an arbitrary weak secret (e.g., a single character) because the input validation schema (`MfaEnableRequestSchema`) only enforced a minimum length of 1.
**Learning:** Even if the server generates strong secrets during the setup phase, relying on the client to return that secret during the enable phase without strictly validating its complexity allows attackers (or bypassed clients) to weaken the security mechanism. Stateless setups where the secret is round-tripped through the client require rigorous re-validation.
**Prevention:** Enforce strict complexity requirements (e.g., `min(32)` for Base32 secrets) in the API validation schema for sensitive inputs like MFA secrets, mirroring the complexity of the server-side generation logic.

## 2026-02-13 - [User Enumeration via Error Messages]
**Vulnerability:** The `loginWithPassword` method checked for account status (disabled/locked) and returned specific errors before validating the password. This allowed attackers to enumerate valid accounts by observing different error messages (`ACCOUNT_DISABLED`, `LOCKED`) versus `INVALID_CREDENTIALS` for non-existent users, even without knowing the password.
**Learning:** Checking business rules (like account status) before authentication (password check) leaks existence information. Security checks must be prioritized: Authentication first, then Authorization/Business Rules.
**Prevention:** Always validate credentials (password) first. If credentials are invalid, return a generic error immediately. Only check for account status (disabled/locked) after successful credential validation, ensuring that attackers cannot probe account states without valid credentials.

## 2026-02-14 - [Path Traversal in Local Storage]
**Vulnerability:** The `LocalObjectStorageProvider` implementation constructed file paths by concatenating `uploadDir` and user-provided keys without validating that the resolved path remained within the intended directory. This allowed attackers (with upload permissions) to write or delete arbitrary files on the server using keys like `../../etc/passwd`.
**Learning:** Naive path concatenation (e.g., `path.join(base, user_input)`) is insufficient for security because `path.join` resolves `..` segments. Even if a "prefix" is stripped, the remaining part can still contain `..` to traverse directories.
**Prevention:** Always resolve the final absolute path using `path.resolve(base, input)` and verify that it starts with the expected absolute base directory (e.g., `resolvedPath.startsWith(resolvedBase)`). Do not rely on string manipulation or regex alone for path sanitization.

## 2026-02-14 - [Mfa Backup Code Replay]
**Vulnerability:** Backup codes were not consumed after use, allowing attackers to reuse a single backup code multiple times.
**Learning:** Stateful verification methods (like OTPs) must explicitly update state (mark as used) upon success. Verification logic that only checks for validity without side effects is insufficient for one-time tokens.
**Prevention:** Ensure that any one-time token verification process includes a step to invalidate the token immediately upon successful use, ideally within the same transaction or atomic operation.

## 2026-02-14 - [DoS via Order Expiration Bypass]
**Vulnerability:** The `cancelExpiredOrders` service method fetched pending orders using `limit: 100` and the default sort order (newest first) without filtering by age. This allowed attackers to flood the system with new pending orders, pushing expired orders out of the fetched batch, effectively bypassing expiration and holding inventory indefinitely.
**Learning:** Fetching "pending" items to process expiration requires explicit filtering by creation time or sorting by oldest first. Relying on default "newest first" sorting combined with a limit creates a starvation vulnerability for old items.
**Prevention:** When implementing cleanup or expiration jobs, always use a query that explicitly targets the expired items (e.g., `createdAt < cutoff`) rather than fetching a generic list and filtering in application code, especially if pagination or limits are involved.

## 2026-02-15 - [Session Issuance before MFA]
**Vulnerability:** The login endpoint issued a full user session and tokens immediately after password validation but *before* verifying MFA (if enabled). Although the tokens were not returned to the client if MFA was required, the session was persisted in the database, allowing attackers with valid passwords to exhaust session limits (DoS) or potentially access the account if session checks were bypassed.
**Learning:** Authentication is a multi-step process when MFA is involved. Completing the "login" (issuing a session) after only the first step (password) negates the security benefit of MFA regarding session management. The session should only be created when the user is fully authenticated.
**Prevention:** Separate credential validation from session issuance. Ensure that `login` logic only validates credentials first. If MFA is required, return an intermediate state (e.g., pending token). Only issue the full session and access tokens after all authentication factors (Password + MFA) have been successfully verified.

## 2026-02-16 - [Password Oracle on Locked Accounts]
**Vulnerability:** The authentication service revealed whether a password attempt was correct or incorrect on locked accounts. If an account was locked, providing the correct password resulted in a "LOCKED" error, while an incorrect password resulted in an "INVALID_CREDENTIALS" error. This allowed an attacker to brute-force passwords on a locked account by observing the error message.
**Learning:** Checking for account lock status *after* password validation logic (checking `!isPasswordValid`) inadvertently leaked the result of the password check. Even if timing attacks were mitigated by `bcrypt` usage, the explicit error difference created a logic oracle.
**Prevention:** When an account is locked or disabled, return the same error message regardless of whether the password was correct or not. To prevent timing attacks, perform the expensive password verification (e.g., `bcrypt.compare`) *before* checking the account status, but check the status *before* revealing the password validity result.

## 2024-05-18 - Missing MFA Action Token for Refund
**Vulnerability:** The admin refund API route lacked verification for the MFA action token, allowing sensitive operations without secondary authentication.
**Learning:** Even if an action is defined in the MFA action enum (`MfaActionTypeEnum`), the actual API route might not enforce it.
**Prevention:** Always verify that sensitive actions explicitly require and validate `actionToken` in their request schemas and route handlers using `MfaActionTokenService.verifyAndConsumeToken`.

## 2026-03-04 - [IP Spoofing via Unvalidated x-forwarded-for Header]
**Vulnerability:** The `extractClientIp` function simply parsed and returned the first value from the `x-forwarded-for` header without any validation. This function was used in the Next.js edge middleware (`src/proxy.ts`) for rate-limiting, allowing attackers to bypass rate limits by spoofing the `x-forwarded-for` header.
**Learning:** Naively trusting `x-forwarded-for` without verifying its format or whether it came from a trusted proxy allows trivial IP spoofing.
**Prevention:** Always use safe IP extraction functions (like `extractClientIpSafe` in `src/lib/http/ip-extractor.ts`) that validate the IP address format, check against private IP ranges, and respect the `trustProxy` configuration before using the IP for security controls like rate limiting.

## 2024-05-24 - [Path Traversal in FileStorage]
**Vulnerability:** The `FileStorage` utility in `src/lib/file-storage/index.ts` constructed absolute paths for saving uploaded user documents using `path.join(process.cwd(), relativeDir)` where `relativeDir` included user-controlled parameters `userId` and `documentType`. Because `path.join` resolves `..`, an attacker could supply `../../etc/passwd` to break out of the intended directory `USER_DOCUMENTS_STORAGE_DIR` and write files to arbitrary locations.
**Learning:** Naive path concatenation (e.g., `path.join`) combined with user-controlled input can lead to path traversal, even if the filename itself is auto-generated. This is especially critical when dealing with APIs where parts of the directory path are derived from request parameters.
**Prevention:** Always construct absolute paths using `path.resolve` and verify that the final resolved path strictly falls within the permitted base directory (e.g. `resolvedPath.startsWith(resolvedBase)`).

## 2024-05-24 - [XSS via Unsafe Eval in CSP]
**Vulnerability:** The Content Security Policy (CSP) in `src/lib/http/security-headers.ts` included the `'unsafe-eval'` directive in the `script-src` policy. This effectively bypassed the security provided by CSP against Cross-Site Scripting (XSS) attacks by allowing arbitrary JavaScript code to be executed via functions like `eval()`, `setTimeout(string)`, and `setInterval(string)`.
**Learning:** Including `'unsafe-eval'` in a CSP significantly reduces its effectiveness as a defense-in-depth mechanism against XSS. Modern JavaScript applications rarely need `'unsafe-eval'` unless relying on very outdated libraries or specific dynamic template compilation at runtime.
**Prevention:** Ensure that the `script-src` directive in the Content Security Policy does not include `'unsafe-eval'`. Refactor code to avoid dynamic code execution functions.

## 2026-03-04 - [Reverse Tabnabbing via window.open]
**Vulnerability:** Programmatic navigation using `window.open(url, '_blank')` in frontend components (`document-card.tsx`, `user-documents-section.tsx`, `document-review-tab.tsx`) lacked the `'noopener,noreferrer'` features. This allowed potentially malicious linked pages to gain access to the `window.opener` object and redirect the originating tab to a phishing site (Reverse Tabnabbing).
**Learning:** Reverse Tabnabbing is not limited to `<a>` tags with `target="_blank"`. Any API that opens a new tab, including `window.open`, must be secured to prevent the new context from accessing the opener context.
**Prevention:** Whenever using `window.open(url, '_blank')` in frontend code, explicitly pass `'noopener,noreferrer'` as the third argument (window features) to isolate the newly opened window.
