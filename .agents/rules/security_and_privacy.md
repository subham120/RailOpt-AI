# Security & Privacy Policy

This workspace strictly adheres to the following privacy and security principles:

## 1. Secrets & Environment Isolation
- Real API keys, tokens, certificates, and database credentials must never be committed to source control.
- `.env`, `.env.local`, `.env.*.local`, `.secrets`, private keys (`*.pem`, `*.key`), and user credentials must always remain in `.gitignore`.
- `.env.example` must contain only non-sensitive dummy placeholders.

## 2. Telemetry & Data Privacy
- Critical infrastructure telemetry (TMS/P-Way, SMMS/Signalling, TDMS/OHE) is securely processed server-side with strict parameterization.
- Cloud AI features strictly send anonymized operational task metadata with zero PII or credential exposure over encrypted TLS/HTTPS.

## 3. Web & API Security Standards
- **HTTP Security Headers**: Enforce `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Authentication**: Salted password hashing (bcrypt / PBKDF2-SHA256 with >=100,000 rounds) and constant-time string comparison (`hmac.compare_digest`) to prevent timing attacks.
- **Role-Based Access Control (RBAC)**: All sensitive routes (block approvals, manual overrides, schedule generation) must verify user roles and identity before execution.
- **SQL & Data Protection**: Parameterized SQLAlchemy ORM queries exclusively. Zero raw unescaped SQL concatenation.

## 4. GIGW 3.0 Auditability
- All administrative overrides, data imports, and schedule approvals must be recorded immutably in `AuditLog` with user ID, IP address, action type, and timestamp.
