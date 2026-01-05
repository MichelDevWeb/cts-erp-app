# Project Implementation – Basic ERP Web App

## 1. Overview

This project is a basic ERP web application for managing orders, invoices, shipments, and item status, built with **ReactJS** on the frontend and **Supabase** (Postgres, Auth, Storage, Realtime) on the backend.

---

## 2. Tech Stack

### 2.1 Frontend

- **ReactJS** (with Vite) as SPA framework.
- **TypeScript** for type safety and maintainability.
- **React Router** for routing (auth pages, dashboard, orders, invoices, settings). 
- **UI Library**: TailwindCSS for consistent design system.  
- **State Management**: 
  - TanStack Query: All data from Supabase (orders, invoices, shipments, customers, products). 
  - Zustand: UI/app-only state – sidebar open/close, active filters, wizard steps, modal visibility, temporary form state. 
  - Context API: Only for small cross-cutting concerns (e.g., theming) if you want zero extra dependency there. 

### 2.2 Backend (Supabase)

- **Supabase Postgres** as primary database (hosted). 
- **Supabase Auth** for user management and access control (email/password, magic link). 
- **Row Level Security (RLS)** to enforce per-tenant and per-user data rules.
- **Supabase Realtime** to update order/invoice status live (optional phase).
- **Supabase Storage** for file attachments (e.g., invoice PDFs, shipping docs) in later phases.

### 2.3 Tooling & DevOps

- **Package manager**: npm.
- **Linting / Formatting**: ESLint + Prettier.
- **Environment**: `.env` for Supabase URL and anon key.
- **Deployment**:  
  - Frontend: Vercel / Netlify / Render. [PENDING - NOT NEED NOW]  
  - Supabase: Hosted Supabase project (managed).
- **GitHub / GitLab** for version control and CI/CD.

---

## 3. Initial Data Model (Minimal ERP)

> Implemented in Supabase as Postgres tables with RLS policies.

- **users** (Supabase `auth.users` + business profile table)  
  - `id (uuid, PK, FK to auth.users)`  
  - `tenant_id (uuid)`  
  - `full_name (text)`  
  - `role (enum: admin, manager, staff)`  
  - `created_at (timestamp)`  

- **tenants** (company / organization)  
  - `id (uuid, PK)`  
  - `name (text)`  
  - `created_at (timestamp)`  

- **customers**  
  - `id (uuid, PK)`  
  - `tenant_id (uuid, FK)`  
  - `name (text)`  
  - `phone (text)`  
  - `address (text)`  
  - `created_at (timestamp)`  

- **products**  
  - `id (uuid, PK)`  
  - `tenant_id (uuid, FK)`  
  - `sku (text)`  
  - `name (text)`  
  - `unit (text)`  
  - `price (numeric)`  
  - `created_at (timestamp)`  

- **orders**  
  - `id (uuid, PK)`  
  - `tenant_id (uuid, FK)`  
  - `customer_id (uuid, FK)`  
  - `status (enum: draft, confirmed, shipped, completed, canceled)`  
  - `order_date (timestamp)`  
  - `total_amount (numeric)`  
  - `created_by (uuid, FK to users.id)`  

- **order_items**  
  - `id (uuid, PK)`  
  - `order_id (uuid, FK)`  
  - `product_id (uuid, FK)`  
  - `quantity (numeric)`  
  - `unit_price (numeric)`  
  - `line_total (numeric)`  

- **invoices**  
  - `id (uuid, PK)`  
  - `tenant_id (uuid, FK)`  
  - `order_id (uuid, FK)`  
  - `invoice_number (text)`  
  - `status (enum: draft, issued, paid, void)`  
  - `issue_date (timestamp)`  
  - `due_date (timestamp)`  
  - `total_amount (numeric)`

- **shipments**  
  - `id (uuid, PK)`  
  - `tenant_id (uuid, FK)`  
  - `order_id (uuid, FK)`  
  - `shipment_number (text)`  
  - `carrier (text)`  
  - `tracking_code (text)`  
  - `status (enum: pending, in_transit, delivered)`  
  - `shipped_at (timestamp)`  
  - `delivered_at (timestamp)`  

---

## 4. Implementation Phases (Basic ERP)

### Phase 0 – Project Setup

**Goal**: Skeleton React + Supabase app with auth and protected routes.

Tasks:

- Create Supabase project, configure Auth (email/password, magic link).
- Create initial tables: `tenants`, `profiles`, `customers`, `products`, `orders`, `order_items`.
- Enable RLS and write basic policies:  
  - Users can only access data where `tenant_id = current_setting('request.jwt.claims')::json->>'tenant_id'`.
- Bootstrap React app (Vite + TS + React Router + Tailwind).
- Configure Supabase client in React and basic auth flow (login, logout, session).
- Implement layout:  
  - Public: `/login`, `/register` (optional).  
  - Private: `/dashboard` placeholder.

### Phase 1 – Core Orders Management

**Goal**: MVP to create and list orders with items.

Tasks:

- Implement CRUD UI for `customers` and `products`.
- Implement `orders` page:  
  - List with filters (status, date range, customer).  
  - Detail view: order header + line items.  
  - Create/Edit order:  
    - Select customer.  
    - Add/remove line items (product, quantity, unit price).  
    - Auto-calc `line_total` and `total_amount`.
- Use React Query for all Supabase reads/writes with optimistic updates if needed.
- Add basic validation and error handling for forms.

### Phase 2 – Invoices & Basic Billing

**Goal**: Generate invoices from orders and track payment state.

Tasks:

- Create `invoices` table and relations in Supabase.
- Add “Generate Invoice” action on order (status `confirmed`).  
- Implement invoices list + detail view:  
  - Link back to order.  
  - Display invoice number, dates, totals.  
  - Update status (`draft` → `issued` → `paid`).  
- (Optional) Simple PDF export using client-side library (phase 3 if needed).  

### Phase 3 – Shipments & Status Tracking

**Goal**: Track shipments and their delivery status.

Tasks:

- Create `shipments` table in Supabase.  
- Link shipments to orders with 1–N relationship.  
- Implement shipments UI:  
  - Create shipment from order (`confirmed` or `invoiced`).  
  - Set carrier, tracking code, shipped/delivered dates.  
  - Update status and reflect that in order timeline.  
- (Optional) Use Supabase Realtime to push live updates to shipment status.

### Phase 4 – Polishing & Basic Analytics

**Goal**: Improve UX and add simple KPIs.

Tasks:

- Add dashboard tiles (total orders this month, revenue, top customers).
- Implement global search (orders by id, customer, invoice number).  
- Improve roles and permissions (admin/manager/staff) using roles in profile table + RLS.
- Add basic audit columns (`created_by`, `updated_by`, triggers later if needed).  

---

## 5. Folder Structure (Frontend)

```txt
src/
  api/
    supabaseClient.ts
    orders.ts
    customers.ts
    products.ts
    invoices.ts
    shipments.ts
  components/
    layout/
      Sidebar.tsx
      Topbar.tsx
    orders/
      OrderList.tsx
      OrderForm.tsx
      OrderDetail.tsx
    invoices/
    shipments/
    common/
      Table.tsx
      Modal.tsx
  hooks/
    useAuth.ts
  pages/
    Login.tsx
    Dashboard.tsx
    OrdersPage.tsx
    OrderDetailPage.tsx
    InvoicesPage.tsx
    ShipmentsPage.tsx
  routes/
    AppRoutes.tsx
  styles/
    index.css
  main.tsx
```

---

## 6. Startup Business Suggestions (Early Stage)

### 6.1 Narrow the ICP (Ideal Customer Profile) and job-to-be-done

- **Pick 1–2 verticals first**: e.g., small distributors, import/export, light manufacturing, e-commerce fulfillment, wholesale. “ERP for everyone” is hard to sell early.
- **Pick the core job**: “Quote → order → invoice → shipment with visibility” is a strong wedge. Optimize for speed + accuracy, not feature breadth.
- **Separate buyer vs user**: owner/ops manager (buyer) vs sales admin/warehouse staff (users). Their pain and success metrics differ.

### 6.2 Make the MVP a workflow product (not CRUD screens)

Your current model is good; the early-stage risk is shipping table forms that don’t save time.

- **Suggested MVP workflow**:
  - Create customer/product quickly (inline create, defaults, import).
  - Create order in < 2 minutes (templates, recent products, keyboard-first).
  - One-click generate invoice + shipment from order.
  - Clear order timeline + “next action” prompts (confirmed → invoice → ship → complete).
- **Defer until you have paying users**: deep accounting, procurement, inventory, multi-warehouse, complex permissions, heavy reporting.

### 6.3 Differentiate with “boring but valuable” basics

- **Auditability**: who changed what, and when (audit columns + simple activity feed).
- **Documents**: attach PO/invoice/shipping docs (Supabase Storage). This is sticky.
- **Exports/Imports**: CSV export/import for customers/products/orders (reduces onboarding friction).
- **Notifications**: invoice due, shipment delivered, order stuck in confirmed.

### 6.4 Reduce onboarding friction (where early SaaS wins)

- **Time-to-first-value < 10 minutes**:
  - Seed demo data for new tenants (sample customers/products/orders).
  - Provide a CSV import wizard (customers + products first).
  - Add a dashboard checklist: Add customers → Add products → Create first order.
- **Spreadsheet compatibility**: most prospects start in Excel/Google Sheets—build migration for that.

### 6.5 Pricing & packaging (simple at launch)

- **Start with 2 tiers**:
  - Starter: base price + small number of users.
  - Team: more users + storage + exports + basic roles.
- **Charge around value drivers**: users, orders/month, storage, premium support.
- **Avoid complexity early**: optimize for “I understand this in 30 seconds.”

### 6.6 Go-to-market (GTM) motions that work early

- **Founder-led sales**: interview 20–30 target businesses; convert 3–5 into design partners.
- **Distribution**:
  - Local business communities + industry groups.
  - Partnerships with small bookkeeping/accounting firms or logistics providers.
  - Content that matches real queries (“order tracking spreadsheet alternative”, “invoice + shipment tracking tool”).
- **Proof**: small case studies: “reduced order-to-invoice time by X%”, “fewer missed deliveries”.

### 6.7 Product metrics to track from day one

- **Activation**: % of tenants that create first order within 24h.
- **Time-to-first-value**: minutes from signup to first completed order/invoice.
- **Weekly usage**: active users, orders created, invoices issued, shipments delivered.
- **Retention proxy**: do they return weekly to update statuses and create new orders?

### 6.8 Suggested near-term roadmap (business-driven)

- **Week 1–2 (sellable MVP)**: orders + customers/products + generate invoice + shipment + status timeline + CSV export.
- **Week 3–4 (stickiness)**: attachments + email invoice + reminders + basic audit trail/activity feed.
- **Month 2+ (expansion)**: inventory-lite, permission hardening, analytics, realtime updates, integrations (QuickBooks/Xero/Stripe) only if demanded.
