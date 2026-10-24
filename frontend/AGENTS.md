<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NexDrop UI & Frontend Engineering Standards

**Purpose:** This is the shared source of truth for every NexDrop developer and AI coding agent. Read and follow it before implementing UI work.

---

## 1. Project Stack and Architecture

- **Product:** NexDrop parcel delivery and courier management system.
- **Frontend:** Next.js 16 App Router, React 19, TypeScript (strict mode), Tailwind CSS v4, shadcn/ui.
- **Forms:** React Hook Form + Zod (install when building complex forms: `npm i react-hook-form zod @hookform/resolvers`).
- **Backend:** FastAPI; versioned endpoints under `/api/v1/`.
- **Architecture:** Modular monolith (one frontend and one backend).
- **Rule:** Reuse the current repository structure and dependencies. Do not add UI frameworks, icon libraries, animation libraries, or state-management libraries without team approval.

---

## 2. Rule Priority

1. Existing working architecture and repository conventions.
2. This file and centrally defined NexDrop theme tokens.
3. Existing shared components (`components/ui/`, `components/shared/`).
4. shadcn/ui defaults.
5. New implementation choices.

*Do not refactor unrelated code or overwrite another team's work to complete a page.*

---

## 3. Brand and Color System

NexDrop should look like a modern, dependable logistics SaaS product: clean, calm, efficient, and readable. Avoid excessive gradients, heavy shadows, decorative clutter, and inconsistent styles.

| Purpose | Token / Class | Hex Color | Description |
|---|---|---|---|
| **Brand Primary / Deep Green** | `bg-primary`, `text-primary`, `bg-brand-dark` | `#064E3B` | Main brand identity, headers, primary buttons |
| **Action Green** | `bg-brand-green`, `text-brand-green` | `#16A34A` | Interactive highlights, links, success badges |
| **Lime Accent (sparingly)** | `bg-brand-lime`, `text-brand-lime` | `#A3E635` | Vibrant highlights, active tags |
| **App Background** | `bg-background` | `#F1F5F1` | Soft modern neutral backdrop |
| **Card / Surface** | `bg-card`, `text-card-foreground` | `#FFFFFF` | Main card and panel surface |
| **Main Text** | `text-foreground` | `#1F2937` | High-contrast body and heading text |
| **Muted Text** | `text-muted-foreground` | `#64748B` | Labels, captions, secondary text |
| **Border** | `border-border` | `#E5E7EB` | Subtle structural division lines |
| **Subtle Surface** | `bg-muted` | `#E2E8F0` | Input backgrounds, disabled surfaces |
| **Info** | `text-blue-600`, `bg-blue-50` | `#2563EB` | Informational callouts and active transit states |
| **Warning** | `text-amber-600`, `bg-amber-50` | `#D97706` | Pending actions, delivery dispatches |
| **Danger / Destructive** | `bg-destructive`, `text-destructive-foreground` | `#DC2626` | Errors, cancellation, destructive actions |
| **Success** | `text-green-700`, `bg-green-50` | `#15803D` | Delivered shipments, completed tasks |

Use semantic shadcn/Tailwind tokens (`bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, and `bg-destructive`). Tokens are centrally mapped in `src/app/globals.css`. Do not hardcode arbitrary hex colors in page components.

### Contrast & Accessibility
- Check contrast. Never communicate meaning through color alone.
- Do not use lime text on a white background.

---

## 4. Parcel Status Mapping

Use the single, centralized parcel status mapping matching the backend database schema (`backend/app/modules/parcels/models.py`) and frontend types (`src/features/parcels/index.ts`):

| Backend / DB Enum | Human-Readable Label | Visual Style | Meaning |
|---|---|---|---|
| `pending` | **Pending** | Neutral / Secondary (`bg-slate-100 text-slate-800`) | Parcel created, awaiting courier assignment |
| `picked_up` | **Picked Up** | Info / Blue (`bg-blue-50 text-blue-700 border-blue-200`) | Courier has collected package from sender |
| `in_transit` | **In Transit** | Info / Blue (`bg-blue-50 text-blue-700 border-blue-200`) | En route between dispatch hubs |
| `out_for_delivery` | **Out for Delivery** | Warning / Amber (`bg-amber-50 text-amber-700 border-amber-200`) | Courier is delivering to recipient today |
| `delivered` | **Delivered** | Success / Green (`bg-green-50 text-green-700 border-green-200`) | Successfully delivered to recipient |
| `cancelled` | **Cancelled** | Destructive / Red (`bg-red-50 text-red-700 border-red-200`) | Shipment cancelled or returned |

*Always show human-readable labels, never raw enum keys. Do not invent custom status strings.*

---

## 5. Typography

- Keep the configured system font stack; do not add external fonts without approval.
- **Hierarchy:**
  - Page title: `text-2xl` / `text-3xl font-bold`
  - Section title: `text-lg` / `text-xl font-semibold`
  - Body text: `text-sm` / `text-base`
  - Captions & helper text: `text-xs` / `text-sm text-muted-foreground`
- Use `font-medium` for labels and table headings; reserve `font-semibold` / `font-bold` for titles.
- Dashboards should prioritize readable information density over oversized display headings.

---

## 6. Spacing, Radius, Borders, and Shadows

Use Tailwind's standard 4px-based spacing scale:
- **Page padding:** `p-4` on mobile, `p-6` on desktop (`p-8` reserved for landing hero sections).
- **Section gap:** `gap-6` or `space-y-6`.
- **Card padding:** `p-4` or `p-5`; larger overview cards may use `p-6`.
- **Form controls:** `space-y-4`; inline controls: `gap-2`.
- **Borders & Radius:**
  - Small badges & tags: `rounded-md` (~6px).
  - Inputs & buttons: `rounded-lg` (~8px).
  - Cards & panels: `rounded-xl` (~12px).
  - Subtle borders: `border border-border`.
  - Shadows: use `shadow-sm` sparingly. Avoid heavy blur, neon glow, or dark shadows.
- **Focus States:** Never remove focus outlines without providing a visible focus ring (`focus:ring-2 focus:ring-primary focus:outline-none`).

---

## 7. Layout and Responsive Design

- Internal role portals (Customer, Merchant, Courier, Dispatcher, Admin) use clean, consistent shells.
- Keep sidebar width, header height, icon sizing, active navigation indicators, and spacing consistent across roles.
- Standard internal page layout:
  1. `PageHeader` (title, description, breadcrumbs, primary action button)
  2. Summary stat cards (if relevant to the role)
  3. Search / filter controls
  4. Main data table or card grid
  5. Pagination controls
- Test responsiveness at ~360px (mobile), ~768px (tablet), and ~1280px (desktop).
- Tables must handle narrow viewports gracefully (horizontal scroll wrapper or mobile card view).
- Ensure a minimum touch target of 40–44px for primary mobile interactive controls.

---

## 8. Components and Design System

Before creating a new UI component, inspect `src/components/ui/`, `src/components/shared/`, and the relevant feature folder.
- **Currently Available:** `Button` (`components/ui/button.tsx`), `Card` (`components/ui/card.tsx`), `Badge` (`components/ui/badge.tsx`), `Navbar`, `Footer`.
- **Adding Primitives:** When your feature requires new primitives (`Input`, `Select`, `Dialog`, `Table`, `Tabs`), add standard accessible implementations into `src/components/ui/` so other squads can reuse them.
- Always use the project's standard `cn()` helper from `@/lib/utils`.
- Use icons exclusively from `lucide-react` (already installed). Do not import other icon packages.
- Do not duplicate buttons, badges, tables, or sidebars across feature teams.

---

## 9. Forms, Tables, and Data Display

- Every form input must have a visible `<label>`. Do not use placeholder text as the only label.
- Display field validation errors directly beneath the relevant input.
- Disable submit buttons during pending requests (`disabled={isSubmitting}`) to prevent duplicate submissions.
- Confirm destructive actions (deleting records, revoking merchant API keys, cancelling shipments).
- Tables must include:
  - Loading skeleton state
  - Empty state with clear explanation and a primary action
  - Error state with a retry button
  - Populated data state with consistent formatting for dates, currency, and tracking numbers (`ND-XXXXXXXXXX`).

---

## 10. API Integration and Real-Time Telemetry

- **Centralized Client:** Always make API calls using the centralized client (`@/lib/api-client`). Never hardcode backend URLs like `http://localhost:8000` in page components.
- **Environment URL:** The client automatically reads `process.env.NEXT_PUBLIC_API_URL` (defaults to `/api/v1`).
- **Real-Time (WebSockets):** REST provides authoritative initial page data. WebSockets (`/ws/{channel_id}`) push live updates (courier GPS coordinates, parcel status transitions).
- On WebSocket reconnection, re-fetch data via REST to catch any missed events.
- Never expose database credentials, merchant secret tokens, or private environment variables to the frontend.

---

## 11. AI Agent Procedure

### Before Editing
1. Inspect the target route, feature folder, shared components, theme tokens, types, and related pages.
2. Read this file and repository-specific instructions.
3. Identify existing components in `src/components/` and types in `src/features/`.
4. Verify the backend API contract in `docs/api/endpoints.md` or Swagger UI.

### While Implementing
1. Reuse semantic theme tokens, existing primitives, and shared utilities.
2. Build functional behavior, not just static markup.
3. Implement loading, empty, error, and success states.
4. Keep Git diffs focused strictly on the assigned module.

### Before Finishing
1. Run `npm test` and `npm run build` inside `frontend/` to ensure zero compilation or type errors.
2. Test responsive layouts on mobile and desktop widths.
3. Verify parcel status codes use the official enum (`pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `cancelled`).
4. Report files changed and checks actually verified.

---

## 12. Pull Request Checklist

- [ ] Reused existing layout and shared components.
- [ ] No unapproved colors, fonts, icon libraries, or dependencies added.
- [ ] Responsive across mobile, tablet, and desktop.
- [ ] Loading, empty, error, and success states handled.
- [ ] Forms have accessible labels and validation feedback.
- [ ] Parcel statuses adhere strictly to backend enum (`pending` ... `cancelled`).
- [ ] No hardcoded API URLs or leaked secrets.
- [ ] `npm test` and `npm run build` executed and passed cleanly.
- [ ] No unrelated files or another squad's code modified.
