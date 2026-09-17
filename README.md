# Shai Studios — MVP

Public marketing site + role-based agency workspace + client portal for Shai Studios,
an independent digital marketing agency. Zero dependencies: plain HTML, CSS and
JavaScript with hash routing and `localStorage` persistence.

## Run locally

```bash
npx serve .
```

## Public site

Home (hero, client strip, services, selected work, process, stats, testimonials, CTA),
Services (+ process), Work (filterable case studies), About (+ team), Pricing (+ FAQ),
Contact. Photography is stock imagery from Unsplash; every image URL is editable in the
admin, so swapping in real brand photography is a field edit, not a code change.

## Roles

| Role | Can do |
|---|---|
| Super Admin | Everything, including users, audit log and data reset |
| Admin | Everything except deleting users or clearing the audit log |
| Manager | Clients, projects, enquiries in full; invoices create/edit; content edit |
| Staff | Read-only, plus create/edit clients and projects |
| Client | Client portal only |

The permission matrix is rendered live on **Users & roles**. A user can only edit or
delete accounts ranked below their own.

## CRUD coverage

Every record has create, read, update and delete through the same permission-checked
form engine: clients, projects, invoices (line items, 15% VAT, draft/send/paid),
enquiries, users, services, case studies, pricing plans, page copy and agency settings.
Every write is stamped into the **audit log** with who, what, when and which fields changed.
Breadcrumbs appear on every workspace screen.

## Demo sign-in

Password `demo1234` for all accounts, or use the role buttons on the sign-in screen.

| Email | Role |
|---|---|
| admin@shaistudios.co.za | Super Admin |
| tayla@shaistudios.co.za | Admin |
| naledi@shaistudios.co.za | Manager |
| sipho@shaistudios.co.za | Staff |
| sarah@lumi.co.za | Client |

Auth is front-end only — this is a product MVP, not a production system. Super Admin →
Settings → Reset all data restores the seed.
