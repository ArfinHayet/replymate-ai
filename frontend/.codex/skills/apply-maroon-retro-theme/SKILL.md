---
name: apply-maroon-retro-theme
description: Restyle an existing website or web application using SupportMate's approved maroon retro-futuristic design, warm paper surfaces, graph-paper texture, editorial typography, and terminal-inspired panels. Use when asked to apply this design, change an existing project to a maroon retro theme, or extend components consistently with this theme. Preserve functionality and manage every theme colour through one central project entry point.
---

# Apply Maroon Retro Theme

## Design authority and scope

Use `assets/supportmate-maroon-reference.html` as the approved visual reference. Read its structure and styles before implementing. Render it locally if browser tooling is available. Treat it as a visual specification, not production application code: its scattered literal colours and illustrative data must not be copied into the application's architecture.

Apply the visual language to the existing framework, routes, components, and design system. Preserve business logic, API contracts, authentication, form validation, navigation, content, and integrations. Preserve the real brand logo unless replacement is explicitly requested. Do not substitute demo chat behaviour for a working assistant or replace real analytics with reference sample data.

Default to restyling the landing page when that is the requested scope. If asked to change the project's theme, cover shared primitives and the applicable screens, including dialogs, menus, forms, tables, empty states, and authentication pages. Do not silently expand a landing-page request to the entire application.

Keep copy and commercial claims grounded in the project. Do not introduce fictional customers, testimonials, metrics, plan limits, or product capabilities. Retain working contact delivery rather than replacing it with the reference's email-draft interaction.

## Inspect before editing

1. Read applicable project instructions and inspect package manifests, route structure, global styles, component libraries, and existing theme configuration.
2. Identify the current colour entry point and trace how colours reach CSS, utility classes, component-library themes, SVGs, charts, portals, and embedded widgets.
3. Identify the actual scope from the request and inspect representative screens. Reuse established components and dependencies.
4. State the chosen central theme file and explain which shared components will change. Proceed with implementation when requested; a plan-only request does not authorize implementation.
5. Ask only for decisions the repository and request cannot resolve, such as conflicting brand requirements, genuinely ambiguous screen scope, or required dark-mode support. Do not ask for the framework if the repository reveals it.
6. When explicitly asked for a plan, include concrete implementation code and intended file changes, so the user can review the code before implementation.

## Visual direction

Create a warm, deliberate retro-futuristic editorial identity: maroon ink-like accents on cream paper, an understated engineering grid, compact technical labels, and framed terminal or instrument panels. Use asymmetry and typography to establish hierarchy, while retaining clear reading order.

- Use warm cream for the primary canvas and slightly brighter paper for cards.
- Use maroon for primary actions, selected states, highlighted plan panels, and a small number of strong section fills.
- Use deep burgundy for terminal interiors and dark text; use pale text on maroon fills.
- Use one-pixel borders, mostly square corners, and restrained offset solid shadows. Avoid applying a heavy shadow to every component.
- Use graph-paper texture sparingly at approximately 24px spacing. Keep it faint enough for text and form readability.
- Use tape, handwritten annotations, technical numbering, bracketed links, or barcode-like decorative marks selectively. Do not repeat every motif on every screen.
- Avoid generic glowing gradients, glass panels, excessive pills, random emoji decoration, and identical feature-card grids throughout the page.
- Keep dense application screens efficient. Use the decorative reference layout chiefly on marketing surfaces; translate it into orderly controls and restrained borders inside the application.

## Central colour architecture — mandatory

Create or consolidate one authoritative project theme entry point. Prefer the existing entry point when it can serve this purpose. Choose exactly one of these patterns:

- A single global CSS/SCSS theme file defining semantic custom properties.
- A single TypeScript/JavaScript theme object consumed by the framework's existing theme provider and exported to CSS variables.
- The existing component-library theme configuration, extended to own all semantic colours and expose variables to custom styles.

Do not maintain a duplicate palette in CSS, Tailwind configuration, JavaScript, or a second provider. Generated adapters may reference the canonical tokens but must not repeat colour literals. Import the canonical stylesheet once from the project's global application entry, or mount one existing theme provider at the application root.

Use semantic names such as `--color-brand`, `--color-text`, and `--color-surface`, not names tied to old yellow/grey variants. Put all colour literals, including hover colours, opacity variants, shadows, chart series, terminal colours, and status colours in that entry point. Component files must consume tokens. Do not use component-level hex, RGB, HSL, named-colour, or arbitrary utility colour literals for themed UI. `transparent`, `currentColor`, inherited values, and genuine external image colours are acceptable exceptions.

Define derived hover, pressed, disabled, grid, overlay, shadow, focus, and selection colours centrally. Keep status meanings distinct; do not recolour every success, warning, error, and information state maroon. Pair status colours with an icon or text label.

Use this canonical starting palette. Refine semantic pairings for accessibility without changing the primary maroon identity:

```css
/* Example path: src/styles/theme.css; adapt to the repository. */
:root {
  color-scheme: light;
  --color-brand: #8b2942;
  --color-brand-hover: #742137;
  --color-brand-active: #601b2d;
  --color-on-brand: #fff0ec;
  --color-canvas: #f2e9e3;
  --color-surface: #f8efea;
  --color-surface-muted: #e5d6d2;
  --color-text: #351e25;
  --color-text-muted: #70545c;
  --color-border: #b49b9f;
  --color-border-strong: #351e25;
  --color-grid: rgb(139 41 66 / 9%);
  --color-overlay: rgb(48 24 32 / 45%);
  --color-shadow: #351e25;
  --color-shadow-soft: #ba969e;
  --color-focus: #8b2942;
  --color-selection: #e5b9b8;
  --color-selection-text: #351e25;
  --color-terminal-bg: #301820;
  --color-terminal-text: #f6e9e7;
  --color-terminal-accent: #e5b9b8;
  --color-terminal-muted: #e7cbd0;
  --color-terminal-border: #b8838e;
  --color-tape: rgb(186 123 130 / 60%);
  --color-tape-edge: #9c5967;
  --color-disabled-bg: #e5d6d2;
  --color-disabled-text: #70545c;
  --color-success: #286044;
  --color-warning: #795100;
  --color-error: #9c2335;
  --color-info: #315a78;
  --color-status-surface: #f8efea;
  --color-chart-primary: #8b2942;
  --color-chart-secondary: #70545c;
  --color-chart-tertiary: #315a78;
}
```

Also centralize the principal typography, spacing, border, radius, and shadow tokens in this same theme entry point if the repository supports it. Keep one canonical source for each value; do not establish a competing design system.

### Connect each styling system

- CSS/SCSS/CSS Modules: consume `var(--color-...)`; keep component layout rules local.
- Tailwind: map utilities to canonical variables using the project's installed-version syntax. Do not add another literal palette or upgrade Tailwind for this change.
- MUI, Bootstrap, PrimeReact, or another library: use its supported theme customization mechanism, sourcing colours from the canonical entry point. Avoid fragile global selectors and repeated `!important` patches.
- Charts/canvas: use the canonical theme object or a small adapter that reads the CSS variables. Do not export a second literal chart palette.
- SVG/icons: use `currentColor` or theme variables for authored UI artwork. Leave externally supplied logos intact.
- Portals/popovers: ensure they inherit the theme at their actual mount point, usually the document root.
- Public widgets: retain host-page isolation. Pass tokens from the canonical source into the widget's existing shadow root or style boundary rather than leaking global page styles.

If multiple themes already exist, make the existing theme registry the single entry point and add this named theme there. Preserve existing switching behaviour. Do not invent a dark variant unless requested or required by the established product.

## Typography and composition

Use a heavy sans-serif display face for major headings, a serif italic for an occasional editorial emphasis, and a monospace face for technical labels or selected body text. Prefer existing fonts or system fallbacks rather than adding external font dependencies.

Suggested stacks:

```css
--font-display: Arial, Helvetica, sans-serif;
--font-editorial: Georgia, 'Times New Roman', serif;
--font-mono: 'Courier New', ui-monospace, monospace;
```

Use approximately 58–92px desktop hero headings, 34–46px section headings, 14–16px body text, and 11–12px secondary labels. Keep critical information readable; do not reproduce the reference's tiny decorative labels as functional control text. Scale down oversized lettering and negative tracking on narrow screens. Do not force monospace on long dense tables or forms if it reduces usability.

Keep marketing content within approximately 1240px, with 20–48px responsive side padding. Use generous spacing between sections, thin dividers, and a mix of editorial rows and purposeful panels. Retain established app-screen layout constraints where applicable.

## Component rules

- Primary buttons: maroon fill, pale label, thin strong border, optional small offset shadow. Provide explicit hover, pressed, disabled, and focus states. Keep important click targets about 44px tall.
- Secondary actions: paper or transparent surface, strong text, understated border or bracketed styling. Give link and button semantics correctly.
- Selected controls: pair maroon backgrounds with `--color-on-brand`. Never leave dark text on dark maroon navigation items.
- Headline emphasis: use pale tint or maroon text on paper. If using a solid maroon highlight, apply pale foreground text. Do not copy a dark underline that obscures glyphs.
- Terminal panels: deep burgundy interior, pale readable text, a maroon title bar with pale labels, and muted source metadata. Keep sample interactions explicitly illustrative and separate from actual AI requests.
- Cards/tables: use paper surfaces, restrained borders, clear row hierarchy, and meaningful empty/loading/error states. Avoid rotating functional application panels.
- Forms: retain labels, validation, required indicators, error messages, autofill support, and existing submission logic. On a maroon section, use pale labels/input text and visible pale borders; check browser autofill colours.
- Pricing: preserve real plan content and checkout destinations. Highlight the featured plan in maroon, with pale text throughout its body and compatible button colours.
- FAQ: use accessible disclosure primitives or native `details`/`summary`; maintain keyboard access and visible state indicators.
- Analytics: use real data and existing chart functionality. Apply semantic chart tokens without sacrificing series distinction or legibility.
- Texture/decoration: use CSS or existing SVG where practical. Keep overlays non-interactive, mark decoration as hidden from assistive technology, and avoid external asset requests solely for texture.

## Responsive and accessible behaviour

Collapse marketing columns into a sensible single reading order. Make navigation usable on narrow screens, avoid horizontal page overflow, and allow button labels to wrap gracefully. Make wide tables scroll within their own container. Test at roughly 390px, 768px, and 1440px widths.

Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and essential UI boundaries. Do not assume every palette combination meets these requirements. Check muted text on paper, pale text on maroon, selected navigation, form placeholders, focus rings, disabled states, charts, and translucent layers. Use a contrasting central focus token or contextual focus treatment on dark sections.

Retain semantic heading hierarchy, labels, keyboard order, accessible names, and screen-reader states. Respect reduced-motion preferences. Prefer brief opacity/translation interactions over constant CRT flicker or animated scan lines. Ensure texture does not obscure content or introduce performance-heavy full-screen effects.

## Migration and verification

1. Implement the canonical tokens and connect the existing global entry point.
2. Update shared primitives before individual screens to minimize drift.
3. Apply the approved visual motifs within the requested scope.
4. Audit remaining legacy colour classes and literals in the affected UI; trace any exceptions instead of running blind find-and-replace across the repository.
5. Check the real theme consumer paths, including popovers, tooltips, chart labels, form validation, widget boundaries, and selected states.
6. Run the project's relevant lint, type-check, build, and established tests. Do not add tests that merely repeat colour constants.
7. Render representative screens at desktop and mobile sizes when browser tooling is available. Test navigation, forms, dialogs, disclosures, and existing key interactions. Inspect console errors.
8. Temporarily change only the central brand token locally and verify that brand consumers update together, including chart/SVG/library consumers where applicable. Revert that temporary change before completion.
9. Confirm there are no unintended functional, routing, or content changes. Record genuine remaining colour exceptions, such as third-party branding or host-controlled embeds.

Report the implemented visual changes, the exact central theme path, the checks completed, and any unavailable visual verification. Explain how changing the central brand token controls the project and whether dependent shade tokens are derived or intentionally explicit. Never claim browser verification passed when only source or build checks ran.

## Completion criteria

Finish only when the scoped UI expresses the maroon retro design, every authored theme colour comes from one central entry point, primary interactions still work, responsive layouts remain usable, and required checks pass or concrete blockers are disclosed. Keep all future additions consistent with these same semantic tokens and component conventions.
