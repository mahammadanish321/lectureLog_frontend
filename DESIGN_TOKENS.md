# LectureLog Design Tokens Reference

## Color Palette

### Primary Colors
```css
--primary: #1E7145;           /* Forest Green - Main Brand */
--primary-light: #10B981;     /* Emerald Green - Accents */
--primary-dark: #15553A;      /* Dark Green - Depth */
--primary-foreground: #ffffff;
```

### Background & Surfaces
```css
--background: #fdfcf7;        /* Warm Creamy White */
--foreground: #1c1917;        /* Warm Dark Coffee */
--card: #ffffff;              /* Pure White */
--secondary: #f5f2eb;         /* Light Warm Gray */
--accent: #F3F4F6;            /* Light Gray Accent */
```

### Status Colors
```css
--success: #10B981;           /* Emerald - Success */
--warning: #F59E0B;           /* Amber - Warning */
--error: #EF4444;             /* Red - Error */
```

### Semantic Colors
```css
--text-primary: #1c1917;
--text-secondary: #78716c;
--muted: #f5f2eb;
--muted-foreground: #78716c;
--border: #e7e1d3;
--input: #e7e1d3;
--ring: #1E7145;              /* Focus ring color */
--popover: #ffffff;
```

## Shadow System

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
```

## Typography

### Font Families
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: monospace (if needed);
--font-serif: serif (if needed);
```

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

### Common Font Sizes
- H1: 2.25rem (36px)
- H2: 1.75rem (28px)
- H3: 1.5rem (24px)
- H4: 1.3rem (20px)
- Body: 0.95rem-1rem (15-16px)
- Small: 0.85rem-0.875rem (13-14px)
- Caption: 0.75rem (12px)

### Letter Spacing
- Normal: 0
- Uppercase: 0.05em (for labels)
- Headings: -0.025em (tighter)

## Spacing

All spacing follows a base unit of 1rem (16px):

```css
0.25rem = 4px
0.5rem = 8px
0.75rem = 12px
1rem = 16px
1.25rem = 20px
1.5rem = 24px
1.75rem = 28px
2rem = 32px
2.5rem = 40px
3rem = 48px
```

## Border Radius

```css
--radius: 0.75rem (12px)
```

Use cases:
- Cards and panels: `var(--radius)`
- Small components: `0.5rem`
- Pill buttons: `9999px`

## Transitions

Default timing function: `ease` or `ease-in-out`

Common durations:
- Quick: 0.2s
- Smooth: 0.3s
- Slow: 0.4s-0.5s

## Component Styles

### Buttons

#### Primary Button
```css
background-color: var(--primary);
color: var(--primary-foreground);
box-shadow: var(--shadow-md);
```

Hover:
```css
background-color: var(--primary-dark);
box-shadow: var(--shadow-lg);
transform: translateY(-1px);
```

#### Secondary Button
```css
background-color: var(--secondary);
color: var(--secondary-foreground);
border-color: var(--border);
```

Hover:
```css
background-color: var(--accent);
border-color: var(--primary-light);
```

#### Outline Button
```css
background-color: transparent;
border: 1px solid var(--border);
color: var(--foreground);
```

Hover:
```css
background-color: var(--accent);
border-color: var(--primary);
```

### Cards

Base:
```css
background-color: var(--card);
border: 1px solid var(--border);
border-radius: var(--radius);
box-shadow: var(--shadow-sm);
```

Hover:
```css
box-shadow: var(--shadow-md);
border-color: var(--primary-light);
```

### Badges

#### Success Badge
```css
background-color: rgba(16, 185, 129, 0.1);
color: var(--success);
```

#### Error Badge
```css
background-color: rgba(239, 68, 68, 0.1);
color: var(--error);
```

#### Warning Badge
```css
background-color: rgba(245, 158, 11, 0.1);
color: var(--warning);
```

#### Primary Badge
```css
background-color: rgba(30, 113, 69, 0.1);
color: var(--primary);
```

### Form Inputs

Base:
```css
background-color: var(--secondary);
border: 1px solid var(--border);
border-radius: var(--radius);
color: var(--foreground);
```

Focus:
```css
background-color: var(--card);
border-color: var(--primary);
box-shadow: 0 0 0 3px rgba(30, 113, 69, 0.1);
```

## Responsive Breakpoints

```css
/* Tablet & Desktop (768px+) */
@media (min-width: 768px) { }

/* Tablet (768px - 1023px) */
@media (max-width: 1023px) { }

/* Mobile (below 768px) */
@media (max-width: 767px) { }

/* Small Mobile (below 480px) */
@media (max-width: 479px) { }
```

## Animation Keyframes

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Slide In
```css
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### Pulse
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Usage Examples

### Green Gradient Background
```css
background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
```

### Focus Ring
```css
box-shadow: 0 0 0 3px rgba(30, 113, 69, 0.1);
```

### Active Navigation Item
```css
border-left: 3px solid var(--primary);
background-color: rgba(30, 113, 69, 0.1);
color: var(--primary);
```

### Hover Lift Effect
```css
transform: translateY(-2px);
box-shadow: var(--shadow-lg);
```

## Best Practices

1. **Always use CSS variables** - Never hardcode colors
2. **Use semantic tokens** - Use `--primary` instead of hex codes
3. **Maintain contrast** - Ensure WCAG AA compliance
4. **Consistent spacing** - Use base unit multiples
5. **Smooth transitions** - Keep animations between 0.2s-0.4s
6. **Mobile first** - Design for mobile, enhance for larger screens
7. **Status colors** - Always use for indicating state (success, error, warning)
8. **Shadows for depth** - Use shadow system consistently

---
Last Updated: May 2, 2026
Design System Version: 1.0
