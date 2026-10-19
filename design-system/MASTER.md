# Agaram Business Mart — Storefront Design System

## Design goal

Make stationery discovery feel curated and easy to scan, inspired by category-led merchandising while preserving Agaram's own name, logo, products, Tamil language option and visual identity.

## Visual system

- **Style:** bright retail editorial with a confident navy foundation, teal shopping actions, warm stationery accents, white surfaces, quiet borders and soft shadows.
- **Palette:** ink `#172b45`; primary teal `#087f78`; supporting blue `#245b82`; warm stationery accent `#ed8b36`; pale teal surface `#e7f5f2`; muted surface `#f5f9f8`; success `#168257`; border `#e4ebee`.
- **Typography:** DM Sans for interface/body text and Outfit for display headings. Tamil glyph fallback uses the browser/system font stack.
- **Spacing:** 4/8px rhythm, 1320px desktop content width, responsive gutters, 16–18px card corners.
- **Product imagery:** contain-fit on neutral surfaces; use real, licensed product images with fixed image frames to reduce layout shifts.
- **Iconography:** Lucide outline icons for functional actions and category marks; avoid emoji as navigational controls.

## Storefront hierarchy

1. Announcement strip and search-first sticky header.
2. Compact category navigation with a mobile menu.
3. Store-specific hero with direct shop and bulk enquiry actions.
4. Shop by category, featured product rail, shop by brand, budget discovery, and bulk enquiry.
5. Product cards keep image, name, price, quantity savings, stock and cart action visible.

## Responsive and accessibility rules

- Mobile-first, no horizontal page overflow; 2-column product grid on phones and 4-column category grid when space allows.
- Primary touch controls target at least 44px, with visible keyboard focus.
- Images below the fold are lazy-loaded; product image frames keep a stable height.
- Keep text readable at 16px where practical; preserve zoom; include labels and icon-button names.
- Respect `prefers-reduced-motion`; hover styles are supplemental to tap/keyboard behavior.
