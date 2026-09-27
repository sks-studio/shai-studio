# Connecting shaistudiodb

Everything below is a one-time setup. The site works without it (local demo data),
and switches to the database the moment `config.js` is filled in.

## 1. Create the project (2 minutes, free)

1. Go to https://supabase.com/dashboard → **New project**
2. Organisation: `mr-karabonhlamulo's Org`
3. Name: **shaistudiodb** · Region: **West EU (Ireland)** · Plan: **Free**
4. Save the database password somewhere safe (Bitwarden) — you will not see it again.

Wait for the project to finish provisioning (~2 minutes).

## 2. Create the tables

Dashboard → **SQL Editor** → New query. Paste and run each file in order:

1. `supabase/migrations/0001_init.sql` — tables, row-level security, invoice totals
2. `supabase/migrations/0002_bootstrap.sql` — super admins, seed content, store products

Both are safe to run more than once.

## 3. Point the site at it

Dashboard → **Project Settings → API**. Copy:

- **Project URL** → `config.js` → `url`
- **Publishable / anon key** → `config.js` → `key`

Both are safe to commit: the anon key only grants what row-level security allows.

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
