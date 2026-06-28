# Customer Design Audit

## Objective

This document inventories the customer-facing dashboard routes and defines a single design direction for the customer system.

## Executive Summary

- Customer dashboard routes currently split into 5 design behaviors: dashboard tabs, immersive editorial pages, boutique property pages, utility commerce pages, and legacy utility pages.
- The customer area does not have a single visual language today.
- The strongest reusable direction already present in the codebase is a premium editorial interface with strong typography, monochrome surfaces, paper neutrals, deep botanical green accents, and sheet-based motion.
- Recommended target direction: unify all customer surfaces under one system called `Editorial Botanical`.

## Implementation Status

- Shared customer design tokens and primitives now exist in `styles/customer-editorial.css` and are loaded from `app/dashboard/customer/layout.tsx`.
- Placeholder customer service routes have been consolidated into redirects to avoid dead-end empty screens.
- The shared `Editorial Botanical` layer has already been applied to these pages:
	- `app/dashboard/customer/marketplace/[plantId]/page.tsx`
	- `app/dashboard/customer/marketplace/cart/page.tsx`
	- `app/dashboard/customer/marketplace/checkout/page.tsx`
	- `app/dashboard/customer/houses/measurements/page.tsx`
	- `app/dashboard/customer/houses/add-quick/page.tsx`
	- `app/dashboard/customer/houses/page.tsx`
	- `app/dashboard/customer/houses/add/page.tsx`
	- `app/dashboard/customer/houses/edit/[houseId]/page.tsx`
- Duplicate house edit routing has also been consolidated so `app/dashboard/customer/houses/[houseId]/edit/page.tsx` redirects to the canonical edit flow.
- Main remaining style outliers are the order detail route and any customer surfaces that still carry large page-local style sheets instead of shared primitives.

## Route Inventory

### Totals

- Total customer route files: 22
- Real UI pages: 14
- Redirect pages: 5
- Placeholder pages: 3

### Real UI Pages

| Route | File | Role | Current Design Language |
| --- | --- | --- | --- |
| `/dashboard/customer` | `app/dashboard/customer/page.tsx` | Main customer dashboard with tabbed views | Editorial mobile magazine / luxury app |
| `/dashboard/customer/reports` | `app/dashboard/customer/reports/page.tsx` | Cross-house report center | Clean editorial report center |
| `/dashboard/customer/orders/[orderId]` | `app/dashboard/customer/orders/[orderId]/page.tsx` | Order tracking and feedback | High-contrast editorial tracking page |
| `/dashboard/customer/houses` | `app/dashboard/customer/houses/page.tsx` | House collection overview | Editorial botanical collection |
| `/dashboard/customer/houses/[houseId]` | `app/dashboard/customer/houses/[houseId]/page.tsx` | House detail and full service view | Boutique architecture portfolio |
| `/dashboard/customer/houses/add` | `app/dashboard/customer/houses/add/page.tsx` | Rich onboarding / property registration | Editorial botanical onboarding wizard |
| `/dashboard/customer/houses/add-quick` | `app/dashboard/customer/houses/add-quick/page.tsx` | Fast property registration | Editorial botanical utility form |
| `/dashboard/customer/houses/measurements` | `app/dashboard/customer/houses/measurements/page.tsx` | Measurement request status | Editorial botanical status page |
| `/dashboard/customer/houses/[houseId]/edit` | `app/dashboard/customer/houses/[houseId]/edit/page.tsx` | House edit flow | Lightweight utility edit page |
| `/dashboard/customer/houses/edit/[houseId]` | `app/dashboard/customer/houses/edit/[houseId]/page.tsx` | Alternate house edit flow | Editorial botanical form page |
| `/dashboard/customer/documents/[docId]` | `app/dashboard/customer/documents/[docId]/page.tsx` | Document detail / PDF preview | Clean document viewer |
| `/dashboard/customer/marketplace/[plantId]` | `app/dashboard/customer/marketplace/[plantId]/page.tsx` | Plant detail | Utility commerce detail |
| `/dashboard/customer/marketplace/cart` | `app/dashboard/customer/marketplace/cart/page.tsx` | Cart | Utility commerce page |
| `/dashboard/customer/marketplace/checkout` | `app/dashboard/customer/marketplace/checkout/page.tsx` | Checkout | Utility commerce page |

### Redirect Pages

| Route | File | Redirect Target |
| --- | --- | --- |
| `/dashboard/customer/orders` | `app/dashboard/customer/orders/page.tsx` | `/dashboard/customer?tab=orders` |
| `/dashboard/customer/services` | `app/dashboard/customer/services/page.tsx` | `/dashboard/customer?tab=orders` |
| `/dashboard/customer/documents` | `app/dashboard/customer/documents/page.tsx` | `/dashboard/customer?tab=documents` |
| `/dashboard/customer/marketplace` | `app/dashboard/customer/marketplace/page.tsx` | `/dashboard/customer?tab=marketplace` |
| `/dashboard/customer/profile` | `app/dashboard/customer/profile/page.tsx` | `/dashboard/customer?tab=profile` |

### Placeholder Pages

| Route | File | Current State |
| --- | --- | --- |
| `/dashboard/customer/services/step1` | `app/dashboard/customer/services/step1/page.tsx` | Returns `null` |
| `/dashboard/customer/services/step3` | `app/dashboard/customer/services/step3/page.tsx` | Returns `null` |
| `/dashboard/customer/services/pricing` | `app/dashboard/customer/services/pricing/page.tsx` | Returns `null` |

## Existing Design Languages

### 1. Editorial Mobile Magazine

Primary references:

- `app/dashboard/customer/page.tsx`
- `app/dashboard/customer/reports/page.tsx`

Characteristics:

- Large serif headlines
- Thin dividers and paper-white surfaces
- Black, warm gray, and deep green palette
- Overlay sheets and sliding detail panels
- App-like screen transitions instead of standard page reload feel

### 2. Boutique Architecture Portfolio

Primary references:

- `app/dashboard/customer/houses/[houseId]/page.tsx`

Characteristics:

- Pridi serif with Plus Jakarta Sans
- Architectural / portfolio tone
- More expressive heading scale
- Property-first presentation
- Strong use of whitespace and single-column pacing

### 3. High-Contrast Editorial Tracking

Primary reference:

- `app/dashboard/customer/orders/[orderId]/page.tsx`

Characteristics:

- Bodoni Moda / Noto Serif Thai pairing
- Large title treatment
- Monochrome layout with strong contrast
- Tracking, status, and feedback framed like a field dossier

### 4. Utility Commerce UI

Primary references:

- `app/dashboard/customer/marketplace/[plantId]/page.tsx`
- `app/dashboard/customer/marketplace/cart/page.tsx`
- `app/dashboard/customer/marketplace/checkout/page.tsx`

Characteristics:

- Standard utility spacing
- Rounded surfaces
- Conventional ecommerce hierarchy
- Weaker relationship to the editorial customer dashboard look

Status note:

- These routes have now been refactored toward the shared editorial botanical system.

### 5. Legacy Utility Dashboard

Primary references:

- `app/dashboard/customer/houses/[houseId]/edit/page.tsx`

Characteristics:

- Traditional Tailwind utility layout
- Standard cards and form rows
- Minimal overlap with the premium editorial direction

Status note:

- Measurement, quick-add, and canonical edit flows have already been moved onto the shared editorial layer.

## Current Inconsistencies

### Typography Drift

- Dashboard home uses `Playfair Display`, `Cormorant Garamond`, `Inter`, `Plus Jakarta Sans`.
- Houses pages use `Pridi` and `Plus Jakarta Sans`.
- Order detail uses `Bodoni Moda`, `Noto Serif Thai`, and `Inter`.
- Utility pages often fall back to generic Tailwind styling.

### Layout Drift

- Some pages feel like immersive app screens.
- Some pages feel like editorial landing pages.
- Some pages feel like internal admin utilities repurposed for customers.

### Component Drift

- Sheet-based interactions exist in dashboard home and report center but not in all detail flows.
- Button shapes, border treatment, and radius vary heavily.
- Some pages use square editorial buttons while commerce pages use rounded utility buttons.

### Tone Drift

- The system alternates between luxury editorial, architectural boutique, standard ecommerce, and plain utility admin language.

## Recommended Single Direction

### Target System: Editorial Botanical

Use one consistent customer-facing language built from the strongest current patterns:

- Premium editorial layout hierarchy
- Botanical luxury palette
- Property and service narratives presented like curated records, not admin tables
- Sheet-based detail presentation for mobile and split-panel detail on desktop

### Core Rules

#### Typography

- One serif family role for large headings and emotional emphasis
- One sans family role for UI controls, labels, metadata, and forms
- No page-specific font stacks unless the page is a branded campaign

Recommended implementation direction:

- Serif role: one Thai-safe editorial serif token
- Sans role: one operational sans token

### Color System

- Base: `#FFFFFF`
- Paper: `#FCFBF7` or equivalent neutral background
- Ink: `#111111`
- Soft text: muted warm gray
- Accent: deep botanical green
- Alert color: amber only for ratings / highlights, red only for failures

### Surface System

- Prefer flat white and paper surfaces with thin borders
- Avoid rounded SaaS cards on customer pages
- Use square or near-square action buttons consistently

### Motion System

- Use slide-up sheet, split-panel detail, and stagger reveal patterns consistently
- Avoid mixing static utility pages with no transition inside the same customer journey

### Information Hierarchy

- Headline
- Supporting narrative sentence
- Summary stats
- Content feed or detail panel
- Action bar

This should be the default skeleton for report, order, house, document, and marketplace flows.

## Alignment Decisions By Area

### Keep and Standardize

- `app/dashboard/customer/page.tsx`
- `app/dashboard/customer/reports/page.tsx`
- `app/dashboard/customer/orders/[orderId]/page.tsx`
- `app/dashboard/customer/houses/page.tsx`
- `app/dashboard/customer/houses/[houseId]/page.tsx`
- `app/dashboard/customer/houses/add/page.tsx`
- `app/dashboard/customer/documents/[docId]/page.tsx`

These should define the canonical customer style.

### Refactor Toward Canonical Style

- `app/dashboard/customer/houses/add-quick/page.tsx`
- `app/dashboard/customer/houses/measurements/page.tsx`
- `app/dashboard/customer/houses/[houseId]/edit/page.tsx`
- `app/dashboard/customer/houses/edit/[houseId]/page.tsx`
- `app/dashboard/customer/marketplace/[plantId]/page.tsx`
- `app/dashboard/customer/marketplace/cart/page.tsx`
- `app/dashboard/customer/marketplace/checkout/page.tsx`

These currently feel visually separate from the main customer system.

### Remove or Consolidate

- `app/dashboard/customer/services/step1/page.tsx`
- `app/dashboard/customer/services/step3/page.tsx`
- `app/dashboard/customer/services/pricing/page.tsx`

These are placeholders and should either be deleted or replaced with real journeys that inherit the canonical style.

## Recommended Implementation Order

1. Establish shared customer design tokens for typography, color, spacing, and borders.
2. Standardize all customer buttons, stat cards, section headers, and sheet patterns.
3. Bring marketplace pages into the editorial botanical system.
4. Bring measurement and quick-add flows into the same language.
5. Remove duplicate or placeholder service routes.

## Bottom Line

The customer system already contains a strong brandable direction, but it is fragmented across multiple page families. The correct move is not to invent another style. The correct move is to standardize everything around the editorial, premium, botanical direction already visible in the dashboard, reports, orders, and house portfolio flows.