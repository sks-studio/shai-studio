# Shai Studios — MVP

Public marketing site + role-based agency workspace + client portal for Shai Studios,
an independent digital marketing agency. Zero dependencies: plain HTML, CSS and
JavaScript with hash routing and `localStorage` persistence.

## Run locally

```bash
npx serve .
```

## Public site

Five pages: **Home**, **About**, **Services**, **Blog**, **Contact**. Pricing and case
studies live inside Services and Home; the old /work and /pricing URLs still resolve.
The blog has an index, a featured lead post and article pages at , all
managed from the admin. Photography is Unsplash stock; every image URL is an editable
field, so swapping in brand photography is a content change, not a code change.

## Client onboarding wizard

 is a six-step wizard: about you → your business → goals → budget and
timeline → portal account → review. Progress is saved to the device between steps, each
step validates before advancing, and submitting creates the client record, their portal
user, a discovery project, a qualified enquiry and a stored answer sheet — then signs the
new client straight into their portal with a next-steps checklist. The answers appear on
the client record in the admin.

## Responsive

Built mobile-first and verified at 375px, 768px and desktop: no horizontal page scroll on
any route, a slide-in drawer with scrim for both the public menu and the workspace sidebar,
tables that scroll inside their card, modals that become bottom sheets, and full-width
actions on small screens.

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
