# Agaram Business Mart

Responsive Tamil/English stationery marketplace. The frontend is React, TypeScript and Vite; the API is Node.js 24 + Express 5 with PostgreSQL 18.

## Customer account verification

Phone OTP is removed. Customers create an account with a name, email and password, then verify ownership by clicking a single-use email link. Passwords are bcrypt-hashed; verification tokens are random, expire after 24 hours, and only their SHA-256 hashes are stored. Customer sign-in is blocked until email verification. Email links are rate-limited to one per minute and five per hour per account.

Email sending uses the Resend HTTP API from the backend. Resend currently advertises a free transactional-email tier with 3,000 messages/month and a 100/day limit. Free-plan quotas and eligibility can change; verify its current terms before launch. For real customer delivery, configure a sender domain you control and verify it in Resend. Email delivery has no SMS charge, but it depends on a working provider and an approved sender.

## Recommended database and backend

Use Node.js + Express because this project already uses TypeScript/JavaScript, and PostgreSQL for the linked users, products, inventory and order data. Transactions keep inventory changes and order creation together. Python + FastAPI is also a sound alternative if your team already operates Python services.

## Start locally on Windows

Install Node.js 24 and Docker Desktop. In PowerShell, from the project folder:

```powershell
cd backend
Copy-Item .env.example .env
```

Set `RESEND_API_KEY` and `EMAIL_FROM` in `backend/.env`. Keep the API key on the backend only. For local links, `PUBLIC_FRONTEND_URL=http://localhost:5173` should match the Vite URL. In Resend, verify the sender domain before expecting delivery to arbitrary recipients.

```powershell
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

In a second PowerShell window, from the project folder:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set the frontend `.env` value `VITE_API_URL=http://localhost:4000`. Sign up, open the message sent to that email address, and click the verification link. Then sign in with the email and password.

## API security

- Customer passwords are hashed with bcrypt; session IDs are random, stored hashed in PostgreSQL, and sent using `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production).
- Email verification links are single-use and time-limited. Per-account and IP rate limits reduce abuse. Unknown and verified addresses receive generic resend responses.
- Keep `RESEND_API_KEY`, database credentials and admin credentials out of Vite variables and source control.
- Production requires HTTPS and matching same-site storefront/API domains for the session cookie. Configure exact `FRONTEND_ORIGIN` and `PUBLIC_FRONTEND_URL` values.
- Before scaling multiple API instances, use a shared rate-limit store or edge rate limit. Back up PostgreSQL.

## Connected API

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| GET | `/api/products` | Public | Read active products; supports business/category filters |
| POST | `/api/auth/signup` | Public, rate limited | Create a pending customer and send a verification link |
| POST | `/api/auth/email/verify` | Public, rate limited | Verify the address and set a customer session cookie |
| POST | `/api/auth/email/resend` | Public, rate limited | Resend a verification link |
| POST | `/api/auth/login` | Public, rate limited | Sign in with verified email and password |
| POST | `/api/auth/admin/login` | Public, rate limited | Sign in to the admin account |
| GET | `/api/auth/session` | Session cookie | Restore customer/admin session |
| POST | `/api/auth/logout` | Session cookie | Revoke session |
| GET | `/api/admin/products` | Admin session | Read the live inventory |
| POST | `/api/admin/products` | Admin session | Add a product to the shared catalogue |
| PUT/DELETE | `/api/admin/products/:id` | Admin session | Edit or archive a catalogue entry |
| POST/GET | `/api/orders` | Customer session | Place order and view order history |
| GET | `/api/admin/orders` | Admin session | Review orders |

At checkout, the backend recalculates prices, quantity discounts, GST and stock from database values. The shipping phone number is entered at checkout; it is not used as an authentication factor.
Customer delivery addresses are attached to the signed-in user ID and retained for ten years, so saved checkout destinations remain available across visits.

## Production deployment

1. Create managed PostgreSQL with TLS certificate verification enabled. Keep the database private and allow connections only from the API host.
2. Run `npm run db:migrate` using the database owner before deploying the API. It adds email/password fields, user-scoped delivery addresses, product image galleries, wholesale price tiers, product subcategories, and editable storefront categories, and removes the obsolete OTP challenge table. Existing phone-only accounts are retained but must create email/password accounts to use the new sign-in flow. Run `npm run db:seed` only when initializing an empty database; the seed script replaces the product catalogue.
3. Put values from `backend/.env.production.example` in the backend host's secret manager. Use a verified email sender domain, `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_FRONTEND_URL`, secure database credentials, and strong admin credentials.
4. Configure same-site storefront/API domains (for example, `shop.example.com` and `api.example.com`). Set `FRONTEND_ORIGIN` to the exact storefront origin and `VITE_API_URL` to the API origin. Set `PUBLIC_FRONTEND_URL` to the storefront URL.
5. Give the API runtime database role only the table permissions it needs. Run migration/bootstrap with a separate database owner role. Do not grant `SUPERUSER`, `CREATEDB`, or `CREATEROLE` to the runtime account.
6. Set `TRUST_PROXY=true` only behind exactly one trusted reverse proxy. Configure backups, rate limits and operational monitoring before switching production traffic.

Example runtime grants (adjust database and owner names):

```sql
CREATE ROLE abm_runtime LOGIN PASSWORD 'use-a-long-random-secret';
GRANT CONNECT ON DATABASE agaram_mart TO abm_runtime;
GRANT USAGE ON SCHEMA public TO abm_runtime;
GRANT SELECT ON admins TO abm_runtime;
GRANT SELECT, INSERT, UPDATE ON users TO abm_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_verification_tokens TO abm_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO abm_runtime;
GRANT SELECT, INSERT, UPDATE ON products TO abm_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON storefront_categories TO abm_runtime;
GRANT SELECT, INSERT, DELETE ON user_addresses TO abm_runtime;
GRANT SELECT, INSERT ON orders TO abm_runtime;
GRANT SELECT, INSERT ON order_items TO abm_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO abm_runtime;
```
