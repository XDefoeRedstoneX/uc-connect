# Design System Document: The Curated Architectural Interface

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves beyond the standard utility of a directory to create an editorialized concierge experience. The **Creative North Star** is "The Digital Curator"—a philosophy that treats every screen like a high-end travel monograph or a boutique gallery guide. 

The system breaks away from generic "box-and-grid" layouts by utilizing **intentional asymmetry**, high-contrast typography scales, and a "floating" architectural structure. Instead of cramming information, we prioritize "negative space as a luxury." The goal is to make the user feel like they are being guided by a knowledgeable human expert, not a database.

---

## 2. Colors & Tonal Depth
We utilize a palette that emphasizes airiness and professional authority. By moving away from lines and focusing on tonal shifts, the UI feels integrated and expansive.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning or container definition. Boundaries are established exclusively through **background color shifts**. 
- To separate a content block, place a `surface-container-low` (#eff4ff) block against a `surface` (#f8f9ff) background. 
- This creates a soft "zone" of information without the visual clutter of structural scaffolding.

### Surface Hierarchy & Nesting
Treat the interface as physical layers of fine stationery.
*   **Base Layer:** `surface` (#f8f9ff) – The primary canvas.
*   **Secondary Context:** `surface-container-low` (#eff4ff) – Used for large background sections or subtle grouping.
*   **Elevated Content:** `surface-container-lowest` (#ffffff) – Reserved for cards and interactive elements that need to "pop" forward against a lower-tier background.
*   **Deep Focus:** `surface-container-highest` (#d9e3f6) – For small utility elements like search bars or inactive tabs.

### The "Glass & Gradient" Rule
To add "soul" to the minimalism:
*   **Glassmorphism:** Navigation bars and floating action buttons should use a semi-transparent `surface` color with a `backdrop-filter: blur(20px)`. This allows the content to bleed through, softening the interface.
*   **Signature Textures:** For high-impact CTAs or Hero backgrounds, use a linear gradient: `primary` (#00236f) to `primary-container` (#1e3a8a). This adds a subtle 3D depth that flat color cannot provide.

---

## 3. Typography: The Editorial Voice
Our typography pairing balances the technical precision of **Inter** with the architectural elegance of **Manrope**.

*   **Display & Headlines (Manrope):** These are the "Editorial" voice. Use `display-lg` (3.5rem) and `headline-md` (1.75rem) with tighter letter-spacing (-0.02em) to create an authoritative, magazine-like feel.
*   **Titles & Body (Inter):** These are the "Instructional" voice. Use `title-md` (1.125rem) for sub-headers to ensure high legibility and a modern, utilitarian feel.
*   **Labels (Inter):** Use `label-sm` (0.6875rem) in all-caps with increased letter-spacing (+0.05em) for category tags or metadata, conveying a "curated" index aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
We reject the heavy drop-shadows of the early web. Depth in this system is organic and ambient.

*   **The Layering Principle:** Rather than using a shadow to show a card, place a `surface-container-lowest` (#ffffff) card on top of a `surface-container-low` (#eff4ff) background. The subtle difference in hex value provides all the separation a sophisticated eye needs.
*   **Ambient Shadows:** For floating elements (e.g., a "Book Now" drawer), use a shadow with a 40px blur at 6% opacity, using the `on-surface` (#121c2a) color. It should feel like a soft glow of light, not a black smudge.
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., input fields), use `outline-variant` (#c5c5d3) at **20% opacity**. It should be felt more than seen.

---

## 5. Components: Refined Interaction

### Cards & Lists (The Directory Core)
*   **Constraint:** Zero dividers. No horizontal lines between list items.
*   **The Look:** Separate list items using `spacing-xl` (vertical white space) or by alternating background tones. 
*   **Images:** All directory images must use `rounded-xl` (0.75rem) and a subtle inner `0.5px` stroke of `outline-variant` at 10% to "set" the photo into the page.

### Buttons (The Curated Action)
*   **Primary:** `primary` (#00236f) background with `on-primary` (#ffffff) text. Shape: `rounded-md`. Use a subtle scale-down transform (0.98) on click for tactile feedback.
*   **Secondary (The Emerald Accent):** Use `secondary` (#2b6954) for "Success" paths or "Verified" directory listings. It provides a sophisticated counterpoint to the Navy.
*   **Tertiary:** Ghost style. No background, no border. Use `on-surface` text with a `label-md` weight.

### Input Fields
*   **Styling:** A bottom-border only approach (1px `outline-variant` at 40%) to mimic high-end stationary, or a solid `surface-container-low` block with no border. Focus states should transition the bottom border to `primary`.

### Specialized Component: The "Curator’s Badge"
*   **Style:** A small, circular chip using `secondary-container` (#adedd3) with `on-secondary-container` (#306d58) text. Used to mark "Top Picks" or "Verified Concierge" selections.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align a headline to the left and a CTA to the far right with significant white space between them.
*   **Use Tonal Shifts:** Always ask, "Can I define this area with a background color instead of a line?"
*   **Prioritize Hierarchy:** Use the massive gap between `display-lg` and `body-md` to tell the user what to read first.

### Don’t:
*   **Don't Use Pure Black:** Always use `on-surface` (#121c2a) for text to maintain a soft, premium feel.
*   **Don't Use Default Shadows:** Standard "Drop Shadows" break the high-end illusion. Stick to tonal layering.
*   **Don't Over-Round:** While `rounded-xl` is used for images, interactive elements like buttons should stay at `rounded-md` (0.375rem) to keep a professional, "architectural" edge.