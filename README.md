# Orqiva ERP 🏛️
### High-Performance Bespoke Modular Enterprise Monolith

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Architecture: Modular Monolith](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](#architecture)
[![SOC2 Type II](https://img.shields.io/badge/Compliance-SOC2%20Type%20II%20Ready-emerald.svg)](#security--compliance)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](#tech-stack)

**Orqiva** is an enterprise-grade ERP system engineered as a **Modular Monolith**, delivering hotel-level luxury UI/UX and uncompromising transactional integrity for **Inventory**, **Point of Sale (POS)**, **Double-Entry Accounting**, and **Human Resources (HR)**.

---

## 🏗️ Architecture & Domain Isolation

Orqiva applies Domain-Driven Design (DDD) to isolate business concerns into autonomous internal modules within a unified Next.js + Node.js runtime:

```
src/
├── app/                  # Next.js 15 App Router & Server Actions
│   ├── (auth)/           # Enterprise Authentication & MFA
│   └── (dashboard)/      # Domain Views (Overview, Inventory, POS, Accounting, HR)
├── components/           # Bespoke Luxury UI System (Tailwind + Framer Motion)
│   ├── ui/               # Hotel-grade primitives (Cards, Buttons, Badges)
│   ├── layout/           # Sidebar, Header, Breadcrumbs
│   └── dashboard/        # Bento KPI Grid, Audit Feed, Logistics Health
├── modules/              # Core Business Domains (Modular Monolith)
│   ├── core/             # Shared Kernel & Result<T, E> Pattern
│   ├── auth/             # Granular RBAC Matrix & Token Management
│   ├── inventory/        # Multi-Warehouse Routing, AVCO Valuation, Row Locks
│   ├── pos/              # Session Lifecycle, Cart, Cash & Card Checkout
│   ├── accounting/       # Strict Double-Entry Ledger Invariant Engine
│   └── hr/               # Personnel Directory & Automated Payroll Calculator
├── lib/                  # Infrastructure (Prisma Client, Redis, BullMQ, Audit)
└── prisma/               # Schema, PostgreSQL composite indexes, Seed master data
```

---

## 🔒 Security, Concurrency & Compliance

### 1. Mathematical Invariant Double-Entry Accounting
* Modeled on strict Odoo/IFRS principles: Every posted journal entry enforces $\sum \text{Debit} \equiv \sum \text{Credit}$.
* Floating-point discrepancies are strictly eliminated using high-precision database decimals (`DECIMAL(18, 4)`).

### 2. High-Concurrency Row Locking
* High-volume concurrent checkouts from multiple POS terminals are protected from overselling race conditions via explicit PostgreSQL row-level locks:
  ```sql
  SELECT id, quantity, "reservedQuantity" FROM stock_quants WHERE ... FOR UPDATE
  ```

### 3. Immutable Audit Trails (SOC-2 & GDPR Compliant)
* Every sensitive action (ledger posting, stock adjustment, cashier session reconciliation) emits an immutable event to the `audit_logs` ledger with actor identity, before/after state snapshots, and IP provenance.

### 4. Granular Role-Based Access Control (RBAC)
* Explicit role hierarchies for:
  * `SUPER_ADMIN` – Full governance across domains
  * `ACCOUNTANT` – General ledger, chart of accounts, tax reports
  * `INVENTORY_MANAGER` – Physical warehouses, quants, transfers
  * `CASHIER` – POS sessions and order register
  * `HR_MANAGER` – Payroll execution and employee files
  * `AUDITOR` – Read-only immutable compliance inspection

---

## 🎨 Hotel-Grade UI/UX Design System

Developed using **StitchMCP** and **21st** themes:
* **Palette:** Deep Obsidian Slate (`#070a12`, `#0c111d`), Warm Amber Gold accents (`#f59e0b`), Royal Emerald (`#10b981`), and Indigo (`#6366f1`).
* **Micro-interactions:** Framer Motion spring physics on buttons, cards, and modal sheets.
* **Responsive Layout:** Adaptive sidebar navigation with real-time cluster health indicators.

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v20+ / v24+
* PostgreSQL 15+
* Redis 7+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/zaltrex-tech/Orqiva-ERP.git
cd Orqiva-ERP

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client
npx prisma generate

# Seed Master Enterprise Data (Admin, Accounts, Warehouses, Products)
npm run prisma:seed
```

### 3. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the executive ERP console.

### 4. Running Unit Tests
```bash
npm run test
```

---

## 👥 Master Enterprise Users (Development Seed)

| Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@orqiva.io` | `Admin@Orqiva2026!` | Full Root Access |
| **Accountant** | `finance@orqiva.io` | `Admin@Orqiva2026!` | Ledger & Tax Reconciliation |
| **Inventory Mgr** | `inventory@orqiva.io` | `Admin@Orqiva2026!` | Warehouses & Transfers |
| **Senior Cashier** | `cashier@orqiva.io` | `Admin@Orqiva2026!` | POS Terminal & Register |

---

## 📄 License
Enterprise MIT License - Built by Zaltrex Tech & Antigravity Enterprise Architecture.
