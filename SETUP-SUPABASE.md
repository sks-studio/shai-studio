# shaistudiodb — live

| | |
|---|---|
| Project | **shaistudiodb** (), region eu-central-1, Free plan |
| URL | https://szxlbhktvtquindgvvif.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/szxlbhktvtquindgvvif |
| Connected | yes — keys are in  |

Steps 1–3 below are **already done**. Step 4 still needs you.

## Done: tables, security, seed data

All 15 tables, row-level security on every one, the invoice VAT view, seed
content (4 services, 6 case studies, 4 blog posts, 6 products, page copy) and the
super-admin allowlist are applied. Verified from the browser: the public can read
published content and submit enquiries, quotes and orders, and cannot read
clients, invoices, orders, profiles, the audit log or the allowlist.

## Done: auth URLs

Site URL , redirects allow that domain
and .

## 4. Turn on the sign-in methods

Dashboard → **Authentication → Providers**.

- **Email** is on by default (password + magic link). Nothing to do.
- **Google**: create an OAuth client at https://console.cloud.google.com/apis/credentials
  (type: Web application). Paste the Client ID and Secret into Supabase.
- **GitHub**: create an OAuth app at https://github.com/settings/developers.
  Paste the Client ID and Secret into Supabase.

Both providers need this **callback URL**, which Supabase shows on the provider page:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Then Dashboard → **Authentication → URL Configuration**:

- Site URL: `https://shai-studio-lemon.vercel.app`
- Redirect URLs: add `https://shai-studio-lemon.vercel.app/**` and `http://localhost:4321/**`

## 5. Super admins

`0002_bootstrap.sql` adds an allowlist:

| Email | Role |
|---|---|
| sir.karabom@gmail.com | Super Admin |
| mbalimsereko@gmail.com | Super Admin |

Whenever either address signs in — Google, GitHub, magic link or password — the
account is created as **Super Admin** automatically. Everyone else becomes a
client. To add another owner later, insert a row into `public.role_allowlist`.

## What works once connected

- Real sign-in with Google, GitHub, magic link or password
- Site content (services, work, blog, products, page copy) served from the database
- Enquiries, quote requests and store orders written to the database from any device
- Row-level security: clients see only their own projects and invoices

## Still to build after this

- Reading clients/projects/invoices from the database in the workspace (they are
  written locally today; the tables and policies are ready)
- Payments for store orders
- Email delivery of downloads and invoices
