---
name: Obsidian Deep Indigo
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0e1c2d'
  surface-container: '#122031'
  surface-container-high: '#1d2b3c'
  surface-container-highest: '#283647'
  on-surface: '#d5e4fa'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d5e4fa'
  inverse-on-surface: '#233143'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#2fd9f4'
  on-tertiary: '#00363e'
  tertiary-container: '#008395'
  on-tertiary-container: '#000608'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#a2eeff'
  tertiary-fixed-dim: '#2fd9f4'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e5a'
  background: '#051424'
  on-background: '#d5e4fa'
  surface-variant: '#283647'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for deep focus, academic rigor, and cognitive immersion. The brand personality is intellectual, sophisticated, and high-performance, catering to researchers and power-users who require a low-distraction environment for complex workflows. 

The aesthetic follows a **Modern-Corporate** direction with **Minimalist** leanings, utilizing a deep-space background to reduce eye strain. High-contrast accents in Electric Indigo and Soft Violet provide a sense of energy and technical precision, while the Cyan/Teal tertiary color anchors the experience with a sense of progress and system stability. The emotional response is one of calm authority and mental clarity.

## Colors

The palette is anchored by a deep obsidian base (`#051424`), creating a high-contrast canvas for vibrant functional accents.

- **Primary (Electric Indigo):** Used for the most critical actions, active focus states, and primary navigational highlights. It signifies intent and direction.
- **Secondary (Soft Violet):** Used for supporting elements, selection markers, and decorative highlights that require distinction without the weight of the primary color.
- **Tertiary (Cyan/Teal):** Dedicated to progress indicators, success feedback, and the "Ofensiva" (streak) counter, providing a cool, motivating signal of achievement.
- **Neutral:** The background layers move from the base obsidian to lighter navy-greys for surfaces and overlays to maintain structural depth without breaking the dark-mode immersion.

## Typography

The typographic system balances contemporary aesthetics with technical precision. 

**Hanken Grotesk** is used for headlines to provide a sharp, modern, and high-quality feel. **Inter** handles the body copy, ensuring maximum legibility during long reading sessions. **Geist** is employed for labels and technical data, offering a mono-inspired clarity that fits the "Deep Study" narrative. Use tight tracking for large displays and generous line-heights for body text to prevent visual fatigue.

## Layout & Spacing

The layout utilizes a **fixed-width container strategy** for reading-heavy content (max-width 800px) to maintain optimal line lengths, while dashboards use a **12-column fluid grid**.

- **Rhythm:** An 8px base unit governs all dimensions.
- **Margins:** Desktop views utilize wide 40px margins to emphasize the "Obsidian" whitespace, while mobile views compress to 16px.
- **Reflow:** On tablet and mobile, multi-column dashboard widgets stack vertically, and the sidebar transitions to a bottom-bar or drawer-based navigation.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Low-Contrast Outlines**.

Since the background is near-black, traditional shadows are replaced by subtle border strokes (`1px solid #ffffff10`) or slight shifts in background luminosity. 
- **Base:** `#051424` (Deepest)
- **Cards/Modules:** `#0f172a` with a subtle 1px border.
- **Popovers/Modals:** `#1e293b` with a soft 20% opacity primary-colored glow (`#6366f1`) to indicate active focus.
- **Glassmorphism:** Use 12px backdrop blurs on sticky headers and sidebars to maintain a sense of context.

## Shapes

The design system employs a **Rounded** shape language to soften the high-contrast technical aesthetic.

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px).
- **Large Elements (Cards, Modals):** 1rem (16px).
- **Pill Elements (Chips, Status Badges, Progress Bars):** Full radius for a distinct functional feel.
- **Selection States:** Use a subtle internal 2px radius "inner-glow" or ring for active focus.

## Components

- **Buttons:** 
    - *Primary:* Solid Electric Indigo with white text.
    - *Secondary:* Ghost style with Soft Violet border and text.
    - *Tertiary:* Clear background with Cyan text for low-priority actions.
- **Input Fields:** Dark fill (`#0f172a`) with a 1px border that glows Electric Indigo on focus. Geist font for placeholder text.
- **The "Ofensiva" Counter:** High-visibility chip using Cyan/Teal background with dark text, often paired with a subtle outer glow to signify "active energy."
- **Cards:** No shadow; instead, use a 1px border (`#ffffff15`). Use Soft Violet for header icons within cards to differentiate content types.
- **Progress Bars:** Thin 4px tracks in neutral-grey with a Cyan/Teal fill to represent completion and positive momentum.
- **Selection Lists:** Active items should have a Soft Violet left-accent bar (4px width) and a 5% opacity Soft Violet background tint.