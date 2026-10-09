# Orqiva

**SaaS ERP for small service-based businesses.** Built by Zaltrex Technology (Mansoura, Egypt).

Core idea: **make running the business easier, not harder.**

---

## Status

This branch is a **clean slate**. We are starting the MVP again from scratch, focused on
service-based businesses (agencies, consultancies) — not on inventory or point-of-sale.

The code that used to live here (Inventory / POS / Double-Entry Accounting / HR / Procurement /
ZATCA e-invoicing) was a prototype that did **not** match the product direction. It is not gone —
it is preserved in Git history and can be recovered from commit `ffe6722`:

```bash
git show ffe6722 --stat      # see what was there
git checkout ffe6722 -- .    # bring it back if ever needed
```

Nothing has been built yet on this branch. We are currently in **Phase 1: Planning**.

---

## MVP Scope (planned)

| Module | What it does |
| :--- | :--- |
| **Auth & Users** | Login/logout, roles & permissions, tenant membership |
| **Customers** | Contact info, notes, linked tasks & invoices |
| **Tasks** | Assign to employee, priority, due date, To Do / In Progress / Done |
| **Invoices** | Draft → Issued → Partially Paid → Paid / Overdue, items, totals |
| **Payments** | Recorded separately from the invoice, balance computed automatically |
| **Dashboard** | Active / overdue / completed tasks, unpaid & overdue invoices, recent activity |
| **Notifications** | Simple in-app only (no email or WhatsApp yet) |

Explicitly **out of scope** for the MVP: inventory, POS, payroll, procurement, tax authority
integrations, email/SMS delivery.

---

## Planned stack

- **Next.js** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma** (migrations & typed client)
- **Vitest** for unit tests, **Playwright** for end-to-end
- **Modular monolith** — one deployable, clear internal module boundaries

---

## Principles we build by

1. Business rules live in the **backend**, never only in the UI.
2. Permissions are enforced **per API request**, not by hiding buttons.
3. Every tenant-scoped row carries a `tenantId`; it always comes from the **session**, never
   from the request body.
4. Multi-step writes that must succeed or fail together run inside a **database transaction**.
5. Passwords are hashed; secrets stay on the server.
6. Anything that changes the shape of the system gets **asked about first**.
7. Documentation is updated together with the code, or it is not done.

---

## Local setup

Not runnable yet. Instructions land with Phase 2 (Foundation).
