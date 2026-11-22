---
name: Sovereign Financial
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  numeric-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system sets the standard for high-trust personal wealth and expense intelligence. The visual narrative combines modern Swiss precision with understated luxury fintech cues: sharp mathematical layout, calm whitespace, and subtle atmospheric depth.

### Visual Aesthetic & Philosophy
- **Style:** Precision Minimalist with Atmospheric Translucency.
- **Core Mood:** Discerning, disciplined, effortless, and financially secure.
- **Emotional Response:** Empowers users with a feeling of absolute control over complex cash flows without cognitive fatigue or visual clutter.
- **Surface Strategy:** Layered off-white panels suspended over quiet, tinted surfaces with ultra-crisp hairline dividers and subtle blur dynamics.

## Colors

The palette balances authoritative deep slate foundations against focused emerald and teal performance accents. 

### Roles & Harmonies
- **Primary (`#0D9488` - Deep Teal):** Directs the primary flow, active states, key interactive controls, and financial accumulation markers.
- **Secondary (`#0F172A` - Rich Midnight Slate):** Anchors core typography, high-priority navigation, and dense data labels, projecting institutional stability.
- **Tertiary (`#10B981` - Growth Emerald):** Strictly communicates positive cash flow, matched budgets, and verified receipt attachments.
- **Neutral (`#64748B` - Slate Grey):** Provides measured mid-tone contrast for meta tags, micro-labels, and structural hairline boundaries.
- **Canvas Base:** Off-white `#F8FAFC` to reduce glare, supported by pure white (`#FFFFFF`) card planes and micro-translucent overlays (`rgba(255, 255, 255, 0.75)`).
- **Critical Accents:** Warm Rose (`#E11D48`) reserved strictly for deficit markers, subscription alerts, and overdue categorizations.

## Typography

Typography establishes an immediate hierarchy between high-value financial telemetry and narrative transactional history.

- **Primary Structure:** Plus Jakarta Sans delivers contemporary precision for macro numbers, net worth metrics, and main module headers.
- **Functional Body:** Inter handles the information density required for ledger tables, expense logs, and status readouts.
- **Tabular Numerics:** All currency, percentage shifts, and ledger entries must utilize tabular figures (`font-variant-numeric: tabular-nums`) to maintain vertical alignment down balance sheets.

## Layout & Spacing

The layout is built on a responsive 12-column fluid framework governed by an 8-point geometric scale.

### Breakpoints & Canvas Flow
- **Mobile (< 768px):** 4 columns. Edge-to-edge cards with `margin: 1rem`. Bottom navigation replaces side rails. Quick transaction actions move to a sticky base container.
- **Tablet (768px – 1024px):** 8 columns with `margin: 1.5rem`. Side navigation collapses into an icon dock. Split views for categories and details become vertically stacked modules.
- **Desktop (> 1024px):** 12 columns with `margin-desktop: 2.5rem` and fixed left command rail (260px). Main metrics span 3-4 columns, ledger tables span 8 columns, and secondary expense breakdowns occupy the remaining 4 columns.

## Elevation & Depth

Depth is established via structural translucency and ghost borders rather than heavy, distracting drop shadows.

- **Surface Tiers:**
  - `Tier 0 (Base Canvas):` Solid `#F8FAFC`.
  - `Tier 1 (Cards & Data Panels):` Pure `#FFFFFF` framed by a 1px border (`rgba(226, 232, 240, 0.8)`).
  - `Tier 2 (Sticky Headers & Filters):` Frosted background (`rgba(255, 255, 255, 0.82)`), backed by a `12px` Gaussian blur and 1px border (`rgba(226, 232, 240, 0.6)`).
  - `Tier 3 (Floating Overlays & Modals):` Ambient shadow (`0px 20px 25px -5px rgba(15, 23, 42, 0.06), 0px 8px 10px -6px rgba(15, 23, 42, 0.04)`), paired with a deep translucent backdrop scrim (`rgba(15, 23, 42, 0.35)`).
- **Hairline Precision:** No element floats unbounded. Every structural box utilizes soft low-contrast containment to preserve architectural order.

## Shapes

The shape system leverages a refined 8px baseline curvature (`roundedness: 2`). This curve softens heavy numeric structures without sacrificing the clean, professional geometry needed for analytical fintech tools.

- **Containers & Panels:** `16px` (`rounded-lg`) for major visual modules, financial summaries, and metric containers.
- **Interactive Controls:** `8px` (`base`) for buttons, text inputs, search fields, and contextual dropdowns.
- **Badges & Tags:** Fully curved pill geometries for operational status badges, category chips, and receipt tags to contrast with square metric cards.

## Components

### Buttons
- **Primary:** Background `#0D9488`, label `#FFFFFF`, borderless, 8px corner radius. Subtle hover state to `#0F766E` with a micro-scale transition (`transform: scale(0.99)`).
- **Secondary:** Surface `#FFFFFF`, border `1px solid #E2E8F0`, label `#0F172A`. On hover: surface transitions to `#F1F5F9`.
- **Tertiary / Destructive:** Muted rose background (`rgba(225, 29, 72, 0.08)`), label `#E11D48`, hover to `#E11D48` with label `#FFFFFF`.

### Expense Status Badges
- Built as pill shapes with `label-sm` typography and a micro dot indicator (6px).
- **Cleared / Paid:** Green wash (`#ECFDF5`), dot & label `#059669`.
- **Pending:** Amber wash (`#FFFBEB`), dot & label `#D97706`.
- **Disputed / Flagged:** Red wash (`#FFF1F2`), dot & label `#E11D48`.

### Input Fields & Search Bars
- Background `#FFFFFF`, 1px boundary (`#CBD5E1`), 8px border radius.
- Padding: `0.625rem 0.875rem`. Focus ring: `2px solid #0D9488` with `0px` shadow offset.
- Numeric inputs always feature prefix/suffix currency symbols set in static `#94A3B8`.

### Ledger Lists & Transaction Rows
- Compact layout rhythm (56px row height desktop, 64px mobile).
- Border-bottom: `1px solid #F1F5F9`.
- Hover style: Complete row shifts to `#F8FAFC` smoothly with active cursor.
- Category icon: Centered inside a 36px rounded-full slate/teal wash container to the left of the merchant name.

### Receipt Attachments
- Compact thumbnail preview (40x40px) with 6px border radius, enclosed in a 1px border (`#E2E8F0`).
- Unattached state: Subtle dashed border (`1px dashed #CBD5E1`) displaying a micro clip icon, transforming on hover to `#0D9488` dashed stroke.

### Metric Cards
- Background `#FFFFFF`, radius `16px`, inset padding `1.25rem`.
- Features metric header (`label-md`), numeric balance (`numeric-metric`), and trailing trajectory pill showing comparative weekly delta.