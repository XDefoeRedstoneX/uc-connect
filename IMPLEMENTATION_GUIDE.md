# UC Connect — Implementation Guide

> **Last Updated:** May 8, 2026
> **Stack:** Next.js 16 (Pages Router) · Supabase · TypeScript · Tailwind CSS + CSS Variables

---

## Project Overview

UC Connect is a premium, community-based student business directory for universities in Indonesia. Registered student businesses are listed as verified vendors, and the platform includes a forum for community interaction.

---

## Architecture

```
pages/                    → Next.js Pages Router (SSR/SSG)
  api/                    → Serverless API routes
    admin/                → Admin-only endpoints (stats, vendors, users, forum)
    vendor/               → Vendor-owner endpoints (profile, hours, items, whatsapp-click)
    vendors/              → Public vendor endpoints (list, detail)
  admin/                  → Admin panel pages
  auth/                   → Login, register, forgot password, set username
  community/              → Forum pages
  customer/               → Customer profile
  directory/              → Explore + vendor detail
  vendor/                 → Vendor dashboard + onboarding
components/
  vendor/                 → TabOverview, TabEditProfile, TabItems, TabHours
  SiteLayout.tsx          → Global layout with auth-aware nav, mobile drawer
  VendorOnboardingWizard  → Multi-step vendor registration
  LoadingSkeleton.tsx     → Shimmer skeleton loading states
  HeroSection, VendorCard, BottomCTA, AuthSplitLayout, FormField
lib/
  api-admin.ts            → requireAdmin() middleware
  api-auth.ts             → resolveAuthedUser() + readBearerToken()
  api-response.ts         → Shared HTTP response helpers
  compress-image.ts       → Canvas-based image compression/resize
  language-context.tsx     → React context for ID/EN translations
  profile-image-upload.ts → Avatar upload to Supabase Storage
  public-errors.ts        → User-facing error message mapper
  supabase-browser.ts     → Browser-side Supabase client
  supabase-server.ts      → Server-side Supabase client (service key)
  translations.ts         → Translation strings (ID + EN)
  vendor-registration-draft.ts → SessionStorage draft persistence
styles/
  globals.css             → Design system (CSS variables, tokens, components)
supabase/
  schema.sql              → Full database schema + RLS policies + migrations
types/
  domain.ts               → TypeScript types (Vendor, VendorItem, VendorHour, etc.)
```

---

## Environment Variables

Create `.env` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Database

### Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) — role: customer/vendor/admin |
| `vendors` | Business listings — name, category, city, whatsapp, hero_image_url, whatsapp_clicks |
| `vendor_hours` | Operating hours per day (0=Sunday–6=Saturday) |
| `vendor_items` | Products/menu/services — item_type, price, is_active |
| `forum_categories` | Forum category list |
| `forum_threads` | Discussion threads |
| `forum_replies` | Thread replies |
| `favorites` | User → vendor favorites (DB exists, no frontend UI yet) |
| `vendor_metrics` | Engagement metrics (DB exists, temporarily hidden in UI) |

### RLS Policies
- **Public read** on vendors (verified only), forum categories/threads/replies
- **Self-update** on profiles (`auth.uid() = id`)
- **Owner-write** on vendors, vendor_hours, vendor_items (via `owner_id`)
- **Admin-all** via `is_admin()` SQL function — profiles, vendors, threads, replies

### Required Migrations
If starting from the base `schema.sql`, the following additions at the bottom must also be applied:
1. `whatsapp_clicks` column on vendors
2. `increment_whatsapp_clicks(uuid)` RPC function
3. Vendor owner update/insert policies
4. Admin RLS policies

---

## API Routes

### Public
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/vendors` | List vendors (filtered by search/category) |
| GET | `/api/vendors/[id]` | Single vendor detail with hours + items |
| POST | `/api/vendor/whatsapp-click` | Increment WhatsApp click counter |
| GET | `/api/health` | Health check |

### Authenticated (Bearer token)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/PUT | `/api/profile` | Current user profile |
| POST | `/api/vendor-onboarding` | Start vendor registration |
| GET/PUT | `/api/vendor/profile` | Vendor's own profile |
| GET/PUT | `/api/vendor/hours` | Vendor operating hours (batch upsert) |
| GET/POST | `/api/vendor/items` | Vendor items list + create |
| PUT/DELETE | `/api/vendor/items/[id]` | Update/delete single item |
| GET/POST/DELETE | `/api/favorites` | Manage user favorites |

### Admin Only (Bearer token + role=admin)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/stats` | KPI counts |
| GET/PATCH | `/api/admin/vendors` | List + approve/reject vendors |
| GET/PATCH | `/api/admin/users` | List + change user roles |
| GET/DELETE | `/api/admin/forum` | List + delete threads/replies |

---

## Design System

Defined in `styles/globals.css` using CSS custom properties:

```css
--pacific: #1CA9C9       /* Primary — Pacific Blue */
--orange: #E86100        /* Accent — Spanish Orange */
--gradient-main          /* Pacific → Orange */
--gradient-warm          /* Orange → Pacific */
--gradient-subtle        /* Low-opacity background gradient */
```

### Key Classes
| Class | Usage |
|-------|-------|
| `.card` | Standard content card |
| `.dash-card` | Dashboard-specific card |
| `.dash-stat` | Stat tile (value + label) |
| `.action-card` | Clickable action tile |
| `.product-row` | Item row in vendor dashboard |
| `.thread-card` | Forum thread card |
| `.badge.pacific` / `.badge.success` | Color-coded badges |
| `.chip` | Filter chip button |
| `.hero` | Page hero section |
| `.bubble-section` | Section with floating bubble decorations |
| `.dropzone` | File upload dropzone |
| `.btn` / `.btn.ghost` | Standard buttons |

---

## Development

```bash
# Install
npm install

# Run dev server
npm run dev

# Type check
npx tsc --noEmit

# Node version (required for @tailwindcss/oxide)
nvm use 21
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy — Vercel auto-detects Next.js

---

## Security Checklist

- [x] Bearer token auth on all mutating endpoints
- [x] RLS policies on all tables
- [x] Admin middleware (`requireAdmin`) checks profile role
- [x] Image compression prevents oversized uploads
- [x] Ownership verification on vendor item/hour updates
- [x] No hardcoded secrets (all via `.env`)

---

**Version:** 2.0.0
**Status:** Feature Complete (MVP) ✅
