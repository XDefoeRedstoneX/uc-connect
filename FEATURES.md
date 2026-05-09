# UC Connect — Features

> **Last Updated:** May 8, 2026
> **Stack:** Next.js 16 (Pages Router) · Supabase · TypeScript · Tailwind CSS + Custom Design System

---

## ✅ Authentication System

### Login (`/auth/login`)
- Email + password sign-in via Supabase Auth
- Session token management (Bearer)
- Profile auto-fetch after login → redirect to set-username if missing
- Redirect to `?next=` path or homepage on success
- Error handling with user-friendly Indonesian messages

### Registration (`/auth/register`)
- Full name, email, password (min 8 chars), confirm password
- Indonesian phone number normalization (+62 / 0812 → local format)
- Live international format preview
- Supabase Auth sign-up with user metadata
- Email confirmation flow

### Forgot Password (`/auth/forgot-password`)
- Password reset email via Supabase

### Set Username (`/auth/set-username`)
- Post-registration username selection
- Uniqueness check

---

## ✅ Public Pages

### Homepage (`/`)
- Hero section with bubble decorations + gradient background
- "How It Works" 3-step cards (Temukan Vendor → Hubungi → Komunitas)
- Featured vendors grid (verified vendors from DB)
- Empty state with vendor registration CTA
- Bottom CTA with gradient + animated bubbles

### Explore Directory (`/directory/explore`)
- Full-text search with server-side filtering
- **Working category filter chips** (Makanan, Kreatif, Jasa, Fashion)
- Vendor count label
- VendorCard grid with verified/campus badges
- Styled empty state

### Vendor Detail (`/directory/vendor/[id]`)
- Hero banner + verified/category/city badges
- WhatsApp button (branded green) with **click tracking** → increments `whatsapp_clicks`
- About section with description
- Stats tiles (rating, response rate, reply time) — hidden when no metrics
- Menu/product/service items with pricing in IDR
- Operating hours table with open/closed color coding
- Sidebar with contact + quick response badge

### Community Forum (`/community`)
- Category grid with auto-detected emoji icons
- Hero section with badge

### Forum Category (`/community/[slug]`)
- Thread list with `thread-card` design
- "New Thread" button

### Thread Detail (`/community/[slug]/[thread_id]`)
- Original post display
- Replies with `reply-card` + `reply-avatar` styling
- Reply submission form

### New Discussion (`/community/[slug]/new`)
- Auth guard (redirects to login if not authenticated)
- Title + content textarea
- Auto-links to category

---

## ✅ Customer Features

### Customer Profile (`/customer/profile`)
- Avatar upload with canvas compression (1200×1200, 500KB max)
- Profile fields: username, full name, phone
- Language switcher (ID/EN)
- Logout with redirect
- Link to favorites tab

### Favorites System (`/customer/favorites`)
- `GET/POST/DELETE` endpoints for managing favorites
- Heart toggle button on `VendorCard` and vendor detail pages
- Optimistic UI updates
- Grid view of all favorited vendors with empty state

---

## ✅ Vendor Features

### Vendor Onboarding (`/vendor/onboarding`)
- Multi-step wizard form (react-hook-form + zod validation)
- KTM file upload with compression
- Business details: name, category, university, WhatsApp
- Sales system + delivery method selection
- Draft persistence in sessionStorage

### Vendor Dashboard (`/vendor/dashboard`) — 4 Tabs

#### Tab 1: Overview
- Banner preview + verified/pending badge
- **WhatsApp click count** (replaces removed vendor_metrics)
- Total items + active items count
- Today's open/close status
- WhatsApp Insights card with link
- Quick action buttons → Edit Profile / Manage Items / Hours

#### Tab 2: Edit Profile
- **Banner image upload** — auto-compressed to 1200×400, max 300KB via canvas
- All fields: name, tagline, category (dropdown), city, description, WhatsApp, website
- **Live preview panel** (sticky on desktop) showing how profile will appear
- Uploads to Supabase Storage

#### Tab 3: Products & Services
- **Auto-infers item type from vendor category:**
  - `Makanan & Minuman` → `menu` items
  - `Jasa & Layanan` → `service` items
  - Everything else → `product` items
- Inline add/edit form
- Toggle active/inactive per item
- Delete with confirmation
- Price in IDR format

#### Tab 4: Operating Hours
- 7-day grid (Mon–Sun) with checkbox open/close toggle
- Time pickers for opens_at / closes_at
- "Terapkan ke Semua" (Apply to All open days) shortcut
- Batch save via upsert

---

## ✅ Admin Panel

### Admin Dashboard (`/admin`)
- KPI stats grid: Total Users, Total Vendors, Pending Verifications, Threads, Replies
- Orange-highlighted pending vendor alert card
- Quick action cards → Vendor / Users / Forum

### Vendor Verification (`/admin/vendors`)
- Filter chips: Pending / Verified / All
- Vendor cards with owner name, category, city, date
- **Approve ✓** button (sets `is_verified = true`)
- **Reject ✕** button (deletes vendor + resets owner to customer role)
- View button → links to public vendor detail page

### User Management (`/admin/users`)
- Filter by role (All / Customer / Vendor / Admin)
- User list with avatar, name, username, phone
- Role badge (color-coded per role)
- Inline role change dropdown (Customer / Vendor / Admin)

### Forum Moderation (`/admin/forum`)
- Tabs: Threads / Replies
- Content preview with author + category + date
- Delete button with confirmation

### Access Control
- Admin nav link (`🛡 Admin`) appears only when `profile.role === 'admin'`
- All admin API routes use `requireAdmin()` middleware
- RLS policies: `is_admin()` SQL function for row-level security

---

## ✅ Legal & Support

### Privacy Policy (`/legal/privacy`)
- 5-section policy covering data collection, usage, security, rights, and contact.

### Terms of Service (`/legal/terms`)
- 7-section ToS covering account rules, content, vendors, liability, and changes.

### Support (`/support`)
- FAQ accordion with common questions
- Styled 2-column contact form

---

## ✅ Design System (Pacific Blue → Spanish Orange)

- **CSS Variables**: `--pacific`, `--orange`, `--gradient-main/warm/cool/subtle`
- **Topbar**: Pacific → Orange gradient with glow shadow
- **Buttons**: Gradient backgrounds, glow on hover
- **Hero sections**: Floating bubble pseudo-elements with `float-bubble` keyframe
- **Auth panels**: Gradient background + animated bubbles
- **Cards**: Tonal layering without borders ("No-Line" philosophy)
- **Mobile**: Hamburger drawer menu at `< 960px`
- **Component classes**: `dash-card`, `dash-stat`, `action-card`, `product-row`, `thread-card`, `reply-card`, `profile-header`, `profile-form`, `dropzone`, `section-cta`, `bubble-section`

---

## ✅ Infrastructure

- **Image Compression**: `lib/compress-image.ts` — canvas-based resize + iterative quality reduction
  - Banner: 1200×400, 300KB
  - Avatar: 400×400, 150KB
  - Item image: 800×600, 200KB
- **Auth**: Supabase Auth with Bearer token flow
- **RLS**: Row-level security on all tables
- **Translations**: `lib/translations.ts` (ID + EN)
- **Deployment**: Vercel-ready with `vercel.json`
- **SEO & Meta**: Global `og:title`, `og:description`, `og:image`, `twitter:card` tags via `SiteLayout`. Page-specific descriptions.
- **Polish**: `LoadingSkeleton.tsx` for shimmer effects.

---

**Total Features: 80+**
**Status: Feature Complete (MVP) ✅**
