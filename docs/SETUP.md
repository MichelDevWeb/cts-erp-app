# CTS ERP - Setup Guide

## Quick Start

### 1. Prerequisites

- Node.js 18+
- npm
- A Supabase project

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Migrations

In your Supabase SQL Editor, run these files **in order**:

1. **`database-schema.sql`** - Creates base tables
2. **`migrations/001_tenant_onboarding_flow.sql`** - Adds onboarding features

### 5. Create Super Admin

1. In Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: `micheldevweb2020@gmail.com`
4. Password: `@Ctserp!@@7`
5. Check "Auto Confirm User"
6. Click "Create user"

Then run `create-super-admin.sql` in SQL Editor.

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
cts-erp-app/
├── database-schema.sql              # Base database schema
├── create-super-admin.sql           # Super admin setup script
├── migrations/
│   └── 001_tenant_onboarding_flow.sql  # Onboarding features
├── docs/
│   ├── FLOWS.md                     # User flow documentation
│   └── SETUP.md                     # This file
└── frontend/
    ├── .env.example                 # Environment template
    ├── src/
    │   ├── api/                     # Supabase API functions
    │   ├── components/              # React components
    │   ├── hooks/                   # Custom hooks
    │   ├── pages/                   # Route pages
    │   ├── routes/                  # Routing configuration
    │   ├── stores/                  # Zustand stores
    │   └── types/                   # TypeScript types
    └── ...config files
```

---

## Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## Features

### Implemented (Phase 0.5)

- ✅ User authentication (login/register)
- ✅ Role-based access (admin, guest, staff, customer)
- ✅ Tenant onboarding flow
- ✅ Admin approval system
- ✅ In-app notifications
- ✅ Protected routing
- ✅ Responsive layout (sidebar, topbar)

### Coming Soon (Phase 1+)

- [ ] Customer CRUD
- [ ] Product CRUD
- [ ] Order management
- [ ] Invoice generation
- [ ] Shipment tracking
- [ ] Dashboard analytics

---

## Troubleshooting

### "Missing Supabase environment variables"

- Ensure `.env.local` exists with correct values
- Restart the dev server after editing `.env.local`

### "relation does not exist" errors

- Run `database-schema.sql` first
- Then run `migrations/001_tenant_onboarding_flow.sql`

### Can't login / stuck on loading

- Check browser console for errors
- Verify Supabase credentials are correct
- Ensure user exists and is confirmed

### Stuck on onboarding page

- Check if profile has `role = 'guest'` and `tenant_id = NULL`
- To fix manually:
  ```sql
  UPDATE profiles SET role = 'staff', tenant_id = 'your-tenant-id' WHERE id = 'user-id';
  ```

---

## Support

For issues or questions, check:
- `docs/FLOWS.md` for flow documentation
- Console logs for error details
- Supabase logs for backend errors

