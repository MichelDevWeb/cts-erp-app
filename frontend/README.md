# CTS ERP Frontend

A modern ERP web application for managing orders, invoices, shipments, and item status built with React, TypeScript, and Supabase.

## Tech Stack

- **React 19** with Vite for fast development
- **TypeScript** for type safety
- **React Router** for routing
- **TailwindCSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Zustand** for UI state management
- **Supabase** for authentication and database

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase project (create one at [supabase.com](https://supabase.com))

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project details:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project dashboard:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key

### 3. Set Up the Database

Run the database schema SQL in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `../database-schema.sql`
5. Run the query

This will create all the necessary tables, RLS policies, triggers, and functions.

### 4. Configure Supabase Auth

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Optionally configure email templates under **Authentication** → **Email Templates**

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── api/                 # Supabase API functions
│   ├── supabaseClient.ts
│   ├── customers.ts
│   ├── products.ts
│   ├── orders.ts
│   ├── invoices.ts
│   └── shipments.ts
├── components/
│   ├── layout/          # App layout components
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/              # shadcn/ui components
├── hooks/
│   └── useAuth.ts       # Authentication hook
├── lib/
│   └── utils.ts         # Utility functions
├── pages/               # Route pages
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── OrdersPage.tsx
│   ├── InvoicesPage.tsx
│   ├── ShipmentsPage.tsx
│   ├── CustomersPage.tsx
│   └── ProductsPage.tsx
├── routes/
│   ├── AppRoutes.tsx    # Route configuration
│   └── ProtectedRoute.tsx
├── stores/
│   └── uiStore.ts       # Zustand UI store
├── types/
│   └── database.types.ts
├── index.css            # Global styles with Tailwind
└── main.tsx             # App entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Implementation Phases

### Phase 0 (Current) - Project Setup ✅
- React + Vite + TypeScript setup
- Supabase client configuration
- Authentication flow (login/register)
- Protected routes
- Basic layout (sidebar, topbar)
- Database schema with RLS

### Phase 1 (Next) - Core Orders Management
- CRUD for customers and products
- Order management with line items
- Order status workflow

### Phase 2 - Invoices & Billing
- Invoice generation from orders
- Invoice status tracking
- PDF export (optional)

### Phase 3 - Shipments & Tracking
- Shipment creation from orders
- Carrier and tracking info
- Status updates (pending → in_transit → delivered)

### Phase 4 - Polish & Analytics
- Dashboard KPIs
- Global search
- Role-based permissions
- Audit trail

## Multi-Tenant Architecture

This ERP uses a multi-tenant architecture where each organization (tenant) has isolated data:

- All data tables include a `tenant_id` column
- Row Level Security (RLS) policies ensure users can only access their tenant's data
- The `tenant_id` is extracted from the user's JWT claims

### Setting Up a New Tenant

After a user signs up:
1. Create a new tenant in the `tenants` table
2. Update the user's profile with the `tenant_id`
3. Set the user's role (admin, manager, or staff)

## Troubleshooting

### "Missing Supabase environment variables"
Make sure you've created `.env.local` with valid Supabase credentials.

### Authentication not working
1. Check that Email auth is enabled in Supabase
2. Verify your anon key is correct
3. Check the browser console for errors

### RLS policy errors
Make sure the database schema SQL has been run completely, including all policies and triggers.

## License

MIT
