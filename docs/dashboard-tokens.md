# Dashboard Design Tokens

> **Locked reference** — All future dashboard stages (items list, team view, etc.) MUST use these tokens. Do not reinvent or drift from this palette.

## Concept

Schemory is a tool for teams to centrally manage and sync TypeScript types and JSON schemas. The design system reflects **precision, structure, and clarity** — qualities essential to schema/type work. No decorative SaaS palette; every choice is grounded in the product's purpose.

---

## Color Tokens

6 named hex values. Defined as CSS custom properties in `:root` (see `dashboard/src/index.css`).

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#4F46E5` | Primary brand, interactive elements. Indigo purple — evokes the precision of type annotations in IDEs. |
| `--color-valid` | `#10B981` | Success states, validated schemas, confirmed actions. Emerald green. |
| `--color-error` | `#EF4444` | Error states, invalid schemas, failed operations. Red. |
| `--color-surface` | `#FFFFFF` | Primary background surface. |
| `--color-text` | `#1E293B` | Primary text. High contrast, maximum readability. Slate-800 equivalent. |
| `--color-border` | `#E2E8F0` | Subtle borders, element separation. Slate-200 equivalent. |

### Theme Extension

To add a dark theme, define a new `:root.dark` or `[data-theme="dark"]` selector with alternative values for the same variable names. The component files remain unchanged — only the CSS variables swap.

---

## Typeface Tokens

| Role | Font Stack | Rationale |
|------|------------|-----------|
| Display | `'Inter', system-ui, sans-serif` | Clean, geometric sans-serif. Excellent for headings and UI text. |
| Body | `'Inter', system-ui, sans-serif` | Consistent with display face. Optimal readability for UI copy. |
| Monospace | `'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace` | **Critical.** Schema and type content MUST use monospace. JetBrains Mono has superior ligatures for code symbols (`=>`, `{}`, `[]`, etc.). Fira Code is a free fallback. |

### Font Loading

Inter and JetBrains Mono should be self-hosted or loaded from a privacy-respecting CDN. The dashboard uses system fallbacks when custom fonts are unavailable.

---

## Signature Layout Detail

**"Type Plate"** — Schema and type content is always displayed within a distinct visual container:

- Monospace font family
- Very subtle background: `background-color: var(--color-surface)` (or slightly off-white in light theme)
- Thin border: `border: 1px solid var(--color-border)`
- Rounded corners: `border-radius: 4px` (slightly squared, not pill-shaped)
- Padding: `0.75rem` (12px) horizontally, `0.5rem` (8px) vertically for inline, or `1rem` all around for blocks

This creates an immediate visual cue: "this is schema/type content" — reinforcing the product's core function without decoration.

```css
/* Example type plate styling */
.type-plate {
  font-family: var(--font-mono);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
}
```

---

## CSS Variable Reference

Defined in `dashboard/src/index.css`:

```css
:root {
  /* Colors */
  --color-primary: #4F46E5;
  --color-valid: #10B981;
  --color-error: #EF4444;
  --color-surface: #FFFFFF;
  --color-text: #1E293B;
  --color-border: #E2E8F0;

  /* Fonts */
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
}
```

---

## Tailwind Integration

`tailwind.config.js` references CSS variables, **not literal hex values**:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        valid: 'var(--color-valid)',
        error: 'var(--color-error)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
    },
  },
};
```

**Rule**: Component files MUST use Tailwind classes like `bg-primary`, `text-error`, `font-mono` — **never** hardcoded hex values.

---

## Usage Examples

### Button (Primary)
```html
<button class="px-4 py-2 bg-primary text-white rounded font-body">
  Save Schema
</button>
```

### Schema Display
```html
<div class="type-plate font-mono text-text bg-surface border border-border">
  {"type": "object", "properties": {"name": {"type": "string"}}}
</div>
```

### Validation Message
```html
<p class="text-valid font-body text-sm">Schema is valid</p>
<p class="text-error font-body text-sm">Invalid type at line 4</p>
```

---

## Future-Proofing

- **Adding a theme**: Create a new CSS selector (e.g., `:root.dark`) with alternative variable values. No component changes needed.
- **Adding a color**: Add to the token table, define the CSS variable, add to Tailwind config. Document here.
- **Changing a token**: Update the variable definition and documentation. All components update automatically.

---

## Files of Record

| File | Purpose |
|------|---------|
| `dashboard/src/index.css` | CSS variable definitions |
| `dashboard/tailwind.config.js` | Tailwind references to CSS variables |
| This file (`docs/dashboard-tokens.md`) | Human-readable token reference |
