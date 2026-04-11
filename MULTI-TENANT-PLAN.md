# Multi-Tenant Architecture Plan

## Context
TCL Waiver is currently a single-tenant app for Tennis Cricket League. The goal is to make it multi-tenant so other sports leagues can use the same platform, and each league can manage multiple seasons. TCL becomes just one tenant among many.

## Architecture Decision: Shared DB with tenant_id
- Single Neon Postgres database, every table gets a `tenant_id` column
- Path-based routing: `/tcl/...`, `/nba/...`, `/dpl/...` (simpler than subdomains on Vercel)
- Per-tenant branding, teams, waivers, admin auth, Drive folder, email config
- Super-admin panel for managing tenants

## New DB Tables

### `tenants`
| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL PK | |
| slug | TEXT UNIQUE | URL path segment ("tcl", "nba") |
| name | TEXT | Display name ("Tennis Cricket League") |
| logo_url | TEXT | Logo image URL/path |
| primary_color | TEXT | Header color (default "#1E2533") |
| accent_color | TEXT | Button/accent color (default "#f97316") |
| email_from | TEXT | Sender email |
| google_client_id | TEXT | Per-tenant OAuth (nullable, falls back to global) |
| google_client_secret | TEXT | |
| google_refresh_token | TEXT | |
| drive_folder_id | TEXT | Root Drive folder |
| admin_password_hash | TEXT | bcrypt hash |
| waiver_template | TEXT | Custom waiver text (nullable = use default) |
| doc_id_prefix | TEXT | "TCL", "NBA", etc. |
| custom_fields | JSONB | Toggle features like cricclubsId per tenant |
| governing_law_state | TEXT | "Pennsylvania", "California", etc. |

### `seasons`
| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL PK | |
| tenant_id | FK → tenants | |
| name | TEXT | "Spring 2026" |
| is_active | BOOLEAN | Only active season accepts waivers |
| start_date | DATE | |
| end_date | DATE | |

## Existing Table Changes
- `waivers` — add `tenant_id` (FK, NOT NULL after backfill) + `season_id` (FK, nullable)
- `teams` — add `tenant_id` (FK, NOT NULL after backfill)
- `verification_codes` — add `tenant_id` (FK, NOT NULL after backfill)
- Email uniqueness becomes per-tenant: `UNIQUE(LOWER(email), tenant_id)`
- Team name uniqueness becomes per-tenant: `UNIQUE(name, tenant_id)`
- All 37 SQL queries across the app get `WHERE tenant_id = $X`

## URL Structure
```
/                    → Landing page (tenant selection or redirect to /tcl)
/tcl/                → TCL waiver form
/tcl/admin           → TCL admin panel
/tcl/api/teams       → TCL teams API
/nba/                → NBA league waiver form
/nba/admin           → NBA admin panel
/super-admin         → Super-admin tenant management
```

### File Structure Change
```
src/app/
  page.tsx                              → Landing/redirect
  [tenant]/
    page.tsx                            → Waiver form (moved from app/page.tsx)
    admin/page.tsx                      → Admin panel (moved)
    api/submit-waiver/route.ts          → (moved, all 14 API routes)
    api/send-code/route.ts
    api/verify-code/route.ts
    api/check-status/route.ts
    api/teams/route.ts
    api/add-team/route.ts
    api/admin/stats/route.ts
    api/admin/waivers/route.ts
    api/admin/waivers/[id]/route.ts
    api/admin/teams/route.ts
    api/admin/reports/route.ts
    api/admin/export/route.ts
  super-admin/
    page.tsx                            → Tenant management UI
  api/super-admin/tenants/route.ts      → Tenant CRUD API
```

## New Files
| File | Purpose |
|------|---------|
| `src/lib/tenant.ts` | Tenant type, lookup with cache, requireTenant() |
| `src/lib/tenant-context.tsx` | React context for client-side tenant branding |
| `src/app/[tenant]/layout.tsx` | Tenant-scoped layout, injects CSS custom properties |
| `src/app/super-admin/page.tsx` | Super-admin dashboard |
| `src/app/api/super-admin/tenants/route.ts` | Tenant CRUD |

## Key Changes Per File

### `src/lib/db.ts`
- Create tenants + seasons tables in initSchema()
- Migrate: insert default TCL tenant, backfill tenant_id on all existing rows
- Every exported function gets a `tenantId` parameter
- generateDocumentId() gets a `prefix` parameter

### `src/lib/tenant.ts` (NEW)
- getTenant(slug) — DB lookup with 60s in-memory cache
- requireTenant(slug) — throws 404 if not found

### `src/lib/email.ts`
- sendVerificationEmail() accepts Tenant, uses tenant.name + tenant.emailFrom in template
- Falls back to global env vars if tenant doesn't have its own OAuth creds

### `src/lib/google-drive.ts`
- All functions accept Tenant, use tenant.driveFolderId + tenant OAuth creds
- Falls back to global env vars

### `src/lib/pdf-generator.ts`
- Accepts tenant branding: name, logo URL/path, colors
- Logo loaded dynamically per tenant (not hardcoded tcl.jpg)

### `src/lib/waiver-template.ts`
- Accepts tenant name, governing_law_state
- If tenant.waiverTemplate is set, use it instead of default

### `src/lib/admin-auth.ts`
- checkAuth() accepts Tenant, compares against tenant.adminPasswordHash (bcrypt)
- Super-admin check via SUPER_ADMIN_PASSWORD env var

### All 14 API routes
- Extract tenant slug from params.tenant
- Call requireTenant(slug) at top
- Pass tenant.id to all DB queries

### `src/app/[tenant]/page.tsx`
- Use TenantContext for branding (name, logo, colors)
- API calls prefixed with tenant slug

### `src/app/[tenant]/admin/page.tsx`
- Session key scoped: `${slug}-admin-session`
- All branding from TenantContext

## Phased Rollout

### Phase 1: Schema + Tenant Table
- Add tenants/seasons tables
- Add tenant_id columns, backfill TCL data
- Add tenantId parameter to all DB functions (with default = TCL id)
- **Deploys safely, nothing breaks**

### Phase 2: Routing + Tenant Context
- Move all pages/APIs under [tenant]/
- Add tenant lookup to every route
- Add redirects from old URLs to /tcl/...
- Remove defaults from DB functions (tenant required)

### Phase 3: Branding + Super-Admin
- TenantContext for dynamic colors/logo/name
- Dynamic PDF, email, waiver template
- Super-admin panel for tenant CRUD
- Per-tenant admin auth with bcrypt

### Phase 4: Onboarding + Seasons
- Self-service tenant signup wizard
- Season management per tenant
- Tenant settings page for self-service config

## Backward Compatibility
- Add Next.js redirects: `/admin` → `/tcl/admin`, `/api/*` → `/tcl/api/*`
- Existing TCL URLs become `/tcl/...`
- All existing data preserved (backfilled with tenant_id = TCL)

## Verification
1. Existing TCL flow works at /tcl/ (form, verify, sign, admin)
2. Create a test tenant at /test/ via super-admin
3. Verify data isolation — test tenant can't see TCL waivers
4. Verify branding — test tenant shows different logo/colors/name
5. Verify Drive — test tenant uploads to its own folder
6. Verify email — test tenant sends from its own address

## Effort Estimate
- Phase 1: ~1 day (schema + DB layer)
- Phase 2: ~2 days (routing + 14 API routes + 2 pages)
- Phase 3: ~2 days (branding + super-admin)
- Phase 4: ~1-2 days (onboarding + seasons)
- Total: ~6-8 days
