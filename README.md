# Shai Studios — MVP

Public marketing site + agency workspace + client portal for Shai Studios, an independent
digital marketing agency. Zero dependencies: plain HTML, CSS and JavaScript, hash routing,
state persisted in `localStorage`.

## Run locally

```bash
npx serve .
```

Or just open `index.html`.

## What's in it

**Public site** — Home, Services, Work (filterable), About, Pricing, Contact.
The contact form writes a real enquiry that shows up in the workspace.

**Agency workspace** (`#/login` → Overview) — KPIs off live invoice data, enquiry inbox with
one-click convert-to-client, clients + client detail (projects, invoices, balance, notes),
projects with inline status, invoices with filters, an invoice builder (line items, 15% VAT,
draft/send), a printable invoice document, and settings.

**Client portal** — outstanding invoice with pay action, project progress, invoice history.

## Demo sign-in

Any email with a password of 6+ characters, or use the two demo buttons on the sign-in screen
(agency owner / client portal). Auth is front-end only — this is a product MVP, not a
production system. Reset the data from Settings → Reset demo data.
