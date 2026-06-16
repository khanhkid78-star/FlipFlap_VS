# Flip Flash Design System

File này tổng hợp màu, font chữ, spacing, padding, margin, border radius, shadow và các pattern UI đang dùng trong web Flip Flash.

---

## 1. Brand Identity

| Item | Value |
|---|---|
| Product name | Flip Flash |
| Visual style | Warm, soft, rounded, friendly learning app |
| Main mood | Cream background, peach surfaces, dark brown typography, brown primary buttons |
| Icon style | Google Material Symbols Outlined |

---

## 2. Font System

### Primary font

```css
font-family: Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Font imports

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

### Font weights

| Usage | Weight |
|---|---:|
| Normal body text | 400 |
| Medium text | 500 |
| Semi-bold text | 600 |
| Navigation / labels | 700 |
| Main headings / buttons | 800 |
| Strong UI emphasis | 900 |

### Font sizes

| Element | Size |
|---|---:|
| Body | 16px |
| User level / small helper | 13px |
| Kicker / uppercase label | 13px |
| Card index | 13px |
| Recent title | 18px |
| Set title | 20px–22px |
| Card question | 21px |
| Brand text | 24px |
| Toolbar title | 24px |
| Folder title | 24px–25px |
| Page title | 34px |
| Study text | 40px desktop, 27px mobile |
| Study answer | 36px desktop, 25px mobile |
| Stat value | 42px |

---

## 3. Color Tokens

### CSS variables

```css
:root {
  --primary: #994700;
  --primary-container: #ffdbc8;
  --on-primary-container: #5d2900;

  --surface: #fff8f5;
  --surface-lowest: #ffffff;
  --surface-low: #fff1ea;
  --surface-container: #ffeadf;
  --surface-variant: #f5ded2;

  --outline: #8c7263;
  --outline-variant: #e0c0af;

  --on-surface: #251912;
  --on-surface-variant: #584235;

  --error: #ba1a1a;
  --success: #16a34a;
}
```

### Color usage

| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#994700` | Main brown brand color, primary buttons, icons, progress bars |
| `--primary-container` | `#ffdbc8` | Peach buttons, active nav background, avatars |
| `--on-primary-container` | `#5d2900` | Text on peach background |
| `--surface` | `#fff8f5` | Main page background |
| `--surface-lowest` | `#ffffff` | Cards, modals, topbar |
| `--surface-low` | `#fff1ea` | Toolbar, hover surfaces, soft sections |
| `--surface-container` | `#ffeadf` | Inputs, soft buttons, search bar |
| `--surface-variant` | `#f5ded2` | Nav hover, secondary surface |
| `--outline` | `#8c7263` | Darker outlines / muted borders |
| `--outline-variant` | `#e0c0af` | Main borders |
| `--on-surface` | `#251912` | Primary text |
| `--on-surface-variant` | `#584235` | Secondary text |
| `--error` | `#ba1a1a` | Incorrect, delete hover, danger |
| `--success` | `#16a34a` | Correct, known state |

### Extra hard-coded colors used

| Color | Usage |
|---|---|
| `#fffaf7` | Card hover / study back face |
| `#ffdad6` | Danger hover background |
| `#f7e4d8` | Auth tab inactive background |
| `#fff` / `#ffffff` | White text / white cards |
| `rgba(0, 0, 0, 0.04)` | Subtle topbar / card shadow |
| `rgba(0, 0, 0, 0.05)` | Card shadow |
| `rgba(0, 0, 0, 0.08)` | Image shadow |
| `rgba(0, 0, 0, 0.12)` | Lifted hover shadow |
| `rgba(0, 0, 0, 0.22)` | Modal shadow |
| `rgba(0, 0, 0, 0.42)` | Modal overlay |
| `rgba(153, 71, 0, 0.10–0.30)` | Brown hover / button shadows |
| `rgba(255, 234, 223, 0.96)` | Mobile nav background |
| `rgba(255, 248, 245, 0.94)` | Sticky edit toolbar background |

---

## 4. Layout System

### Global layout

| Element | Value |
|---|---:|
| Topbar height | 72px |
| Sidebar width | 264px |
| Main desktop left margin | 264px |
| Main desktop padding | `104px 32px 64px` |
| Container max width | 1200px |
| Study container max width | 1240px |

### Main responsive breakpoint

```css
@media (max-width: 1023px) { ... }
```

At this breakpoint:

| Element | Behavior |
|---|---|
| Sidebar | Hidden |
| Main margin-left | 0 |
| Main padding | `96px 18px 96px` |
| Search bar | Hidden |
| Grid columns | 1 column |
| Mobile nav | Visible |

---

## 5. Spacing Scale

Common spacing values used across the UI:

| Value | Usage |
|---:|---|
| 2px | Mobile nav item gap |
| 4px | Tiny icon gaps, set action margin |
| 5px | Metadata icon gap |
| 6px | Label margin, folder actions gap |
| 8px | Nav gap, top action gap, auth tab gap |
| 10px | Set title gap, badge gap, card title margin |
| 12px | Brand gap, user gap, modal action gap |
| 14px | Nav icon gap, card grids gap, study action gap |
| 16px | Topbar gap, sidebar padding X, footer gap |
| 18px | Toolbar padding, set grid gap, deck head margin |
| 20px | Sidebar create margin, card row padding, modal body |
| 22px | Modal head margin, study progress margin |
| 24px | Page/folder/card padding, grid gap |
| 28px | Topbar side padding, modal padding, form card padding |
| 32px | Main/study horizontal padding |
| 42px | Study face padding |
| 64px | Main bottom padding |
| 72px | Topbar/mobile nav height |
| 104px | Main top padding desktop |
| 112px | Study top padding desktop |

---

## 6. Padding Rules

| Component | Padding |
|---|---|
| Topbar | `0 28px` |
| Sidebar | `24px 16px` |
| Main page | `104px 32px 64px` |
| Study main | `112px 32px 64px` |
| Card | `24px` |
| Form card | `28px` |
| Modal panel | `28px` |
| Toolbar | `18px 20px` |
| Folder header | `22px 24px` |
| Folder body | `20px 24px 24px` |
| Set card | `18px` |
| Card row | `20px` |
| Button | `0 18px` |
| Input / textarea / select | `10px 14px` or `10px 12px` |
| Study face | `42px` |
| Upload box | `18px–20px` |

---

## 7. Margin Rules

| Component | Margin |
|---|---|
| Page header | `0 0 32px` |
| User block | `0 0 24px` |
| Sidebar create button | `0 0 20px` |
| Toolbar | `0 0 24px` |
| Folder card | `0 0 24px` |
| Card row | `0 0 18px` |
| Bulk bar | `0 0 20px` |
| Study progress | `0 auto 22px` |
| Study stats | `0 auto 22px` |
| Study actions | `0 auto` |
| Form field | `0 0 16px` |
| Modal actions | `20px 0 0` |
| Inline add area | `22px 0 0` |

---

## 8. Border Radius

| Component | Radius |
|---|---:|
| Buttons / pills | 999px |
| Search input | 999px |
| Avatar | 50% |
| Nav item | 14px |
| Inputs | 14px |
| Deck icon / small blocks | 14px–16px |
| Cards / rows | 18px–20px |
| Toolbar | 20px |
| Form card / modal | 24px |
| Study card | 28px |
| Upload preview | 18px |

---

## 9. Border System

### Main border

```css
border: 1px solid var(--outline-variant);
```

Used for:

- Cards
- Modals
- Inputs
- Folder cards
- Set cards
- Study card
- Image previews

### Danger hover border/background

```css
background: #ffdad6;
color: var(--error);
```

### Focus state

```css
box-shadow: 0 0 0 2px var(--primary);
```

---

## 10. Shadow System

| Shadow | Usage |
|---|---|
| `0 2px 12px rgba(0, 0, 0, 0.04)` | Topbar |
| `0 4px 18px rgba(0, 0, 0, 0.04)` | Card rows |
| `0 4px 20px rgba(0, 0, 0, 0.05)` | Cards |
| `0 8px 24px rgba(0, 0, 0, 0.08)` | Study images |
| `0 8px 30px rgba(0, 0, 0, 0.12)` | Card lift hover |
| `0 10px 28px rgba(153, 71, 0, 0.12)` | Set card hover |
| `0 12px 38px rgba(153, 71, 0, 0.11)` | Study card |
| `0 16px 42px rgba(153, 71, 0, 0.15)` | Study card hover |
| `0 24px 80px rgba(0, 0, 0, 0.22)` | Modal |

---

## 11. Button System

### Base button

```css
.ff-btn {
  min-height: 42px;
  border-radius: 999px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
}
```

### Button variants

| Class | Background | Text |
|---|---|---|
| `.ff-btn-primary` | `var(--primary)` | white |
| `.ff-btn-tonal` | `var(--primary-container)` | `var(--on-primary-container)` |
| `.ff-btn-soft` | `var(--surface-container)` | `var(--on-surface)` |
| `.ff-btn-danger` | `var(--error)` | white |
| `.ff-btn-success` | `var(--success)` | white |

### Button hover

```css
transform: translateY(-2px);
filter: brightness(1.12);
box-shadow: 0 8px 20px rgba(153, 71, 0, 0.12);
```

---

## 12. Icon System

### Icon font

```css
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}
```

### Common icon sizes

| Icon | Size |
|---|---:|
| Brand icon | 30px |
| Folder title icon | 30px–34px |
| Recent icon | 30px |
| Achievement icon | 34px |
| Upload icon | 36px–42px |
| Add card icon | 34px |
| Mini action icon | 22px |

---

## 13. Card System

### Generic card

```css
.ff-card {
  background: var(--surface-lowest);
  border: 1px solid var(--outline-variant);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
```

### Hover card

```css
.ff-card-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
```

---

## 14. Input System

```css
.ff-field input,
.ff-field textarea,
.ff-field select {
  width: 100%;
  border: 1px solid var(--outline-variant);
  border-radius: 14px;
  background: var(--surface-container);
  min-height: 46px;
  padding: 10px 14px;
  color: var(--on-surface);
  outline: none;
}
```

Textarea default:

```css
min-height: 110px;
resize: vertical;
```

Focus:

```css
box-shadow: 0 0 0 2px var(--primary);
```

---

## 15. Navigation System

### Sidebar nav item

```css
.ff-nav a,
.ff-nav button {
  min-height: 48px;
  border-radius: 14px;
  padding: 0 14px;
  gap: 14px;
  font-weight: 700;
}
```

### Active state

```css
background: var(--primary-container);
color: var(--on-primary-container);
```

### Hover state

```css
background: var(--surface-variant);
transform: translateX(3px);
```

---

## 16. Study Session Format

### Study page layout

| Element | Value |
|---|---:|
| Study main margin-left | 264px |
| Study main padding | `112px 32px 64px` |
| Study container max-width | 1240px |
| Progress width | `min(1040px, 100%)` |
| Study card width | `min(780px, 100%)` |
| Study card min-height | 380px–420px depending current adjustment |
| Study actions width | `min(1040px, 100%)` |

### Study flip card

```css
.ff-study-card {
  width: min(780px, 100%);
  min-height: 420px;
  perspective: 1200px;
}

.ff-study-inner {
  position: relative;
  width: 100%;
  min-height: 420px;
  transform-style: preserve-3d;
  transition: transform 0.58s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ff-study-card.is-flipped .ff-study-inner {
  transform: rotateY(180deg);
}
```

### Study face

```css
.ff-study-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border: 1px solid var(--outline-variant);
  border-radius: 28px;
  background:
    radial-gradient(#e0c0af 0.5px, transparent 0.5px),
    var(--surface-lowest);
  background-size: 18px 18px;
  padding: 42px;
  box-shadow: 0 12px 38px rgba(153, 71, 0, 0.11);
}
```

---

## 17. Upload / Image Format

### Upload box

```css
.ff-new-card-upload {
  min-height: 132px;
  border: 2px dashed var(--outline-variant);
  border-radius: 18px;
  background: var(--surface-container);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 18px;
}
```

### Image preview

```css
.ff-new-card-preview {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 18px;
  border: 1px solid var(--outline-variant);
}
```

### Remove image button

```css
.ff-remove-new-image {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(37, 25, 18, 0.82);
  color: #fff;
}
```

---

## 18. Animation / Transition Rules

### General transition

```css
transition:
  background 0.2s ease,
  color 0.2s ease,
  transform 0.16s ease,
  box-shadow 0.2s ease,
  filter 0.2s ease;
```

### Study flip transition

```css
transition: transform 0.58s cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Progress transition

```css
transition: width 0.28s ease;
```

### Active press

```css
transform: scale(0.97);
```

---

## 19. Responsive Study Session

Recommended responsive block:

```css
@media (max-width: 1023px) {
  .ff-study-main {
    margin-left: 0;
    padding: 92px 18px 92px;
  }

  .ff-study-card,
  .ff-study-inner {
    min-height: 460px;
  }

  .ff-study-progress,
  .ff-study-stats,
  .ff-study-card,
  .ff-study-actions {
    width: 100%;
  }

  .ff-study-text {
    font-size: 27px;
  }

  .ff-study-answer {
    font-size: 25px;
  }

  .ff-study-actions {
    flex-direction: column;
  }

  .ff-study-actions .ff-btn {
    width: 100%;
  }
}
```

---

## 20. Design Do / Don’t

### Do

- Keep warm cream / peach / brown palette consistent.
- Use rounded corners heavily.
- Use `var(--primary)` for primary actions.
- Use `var(--primary-container)` for soft/secondary actions.
- Use `var(--outline-variant)` for borders.
- Use `Montserrat` everywhere.
- Use Material Symbols Outlined for icons.

### Don’t

- Don’t introduce strong cold colors unless they are semantic states.
- Don’t use square corners.
- Don’t use pure black for body text; use `--on-surface`.
- Don’t use raw image URL inputs in user-facing card creation/editing.
- Don’t make hover effects too aggressive.
- Don’t break the warm theme by adding unrelated blues/purples as primary UI colors.

