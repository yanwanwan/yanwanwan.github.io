# Blog Minimal Unix Design

Date: 2026-05-02

## Goal

Restyle the generated Hexo blog into a minimal early-web technical archive. The site should feel like a long-maintained personal Unix document index: plain, fast, text-first, and deliberately undecorated.

The intended impression is quiet technical confidence. The page should not look like a modern landing page, theme showcase, or portfolio card layout.

## Non-Goals

- Do not migrate the Hexo theme or source structure.
- Do not rewrite post content.
- Do not introduce a frontend framework or build step.
- Do not add decorative retro gimmicks such as blinking marquees, terminal roleplay, heavy ASCII art, or novelty colors.
- Do not commit existing unrelated working-tree changes as part of this design work.

## Visual Direction

Use a Unix document index style:

- Near-white background with dark text.
- Monospace-first typography, with safe system fallbacks.
- Standard blue links, lightly underlined or underlined on hover.
- Thin gray rules for separation.
- No hero image, large banner, cards, shadows, rounded panels, parallax, or animation.
- Narrow readable content width.
- Small type scale, closer to a technical changelog than a magazine.

The primary look is a light document page. Existing dark-mode support can remain functional only if it stays similarly plain rather than themed as a terminal.

## Homepage

The homepage should become a plain archive index:

- Header contains the text site name `YanWanWan`.
- Navigation is text-only and keeps the current targets: home, archives, categories, tags, about, search.
- The large Fluid banner is hidden.
- A short intro line appears above the post list, for example: `notes, logs, and unfinished thoughts`.
- Posts are shown as compact rows:
  - date on the left,
  - title on the right,
  - excerpts hidden on the homepage.
- Post rows use simple separators and no card backgrounds.

## Post Pages

Post pages should preserve readability while matching the archive style:

- Remove decorative page chrome where possible.
- Keep a simple back/home link near the top.
- Use the same text-first typography, link color, and narrow content width.
- Keep code blocks usable and readable.
- Keep images readable, but remove decorative shadows and large rounded treatment.

## Navigation And Interaction

- Keep existing navigation targets intact.
- Keep search available, visually reduced to a plain text-sized control.
- Hide the manual color scheme toggle from the main navigation. Existing automatic color-scheme behavior may remain if it does not change the plain document feel.
- Remove or neutralize unnecessary animation:
  - typed subtitle,
  - parallax banner,
  - smooth scroll effects,
  - large progress flourish,
  - hover transforms.

## Implementation Boundaries

Primary implementation should be CSS-only where possible:

- Main work: `css/main.css`.
- Minimal HTML changes may be made to generated pages such as `index.html` if required by the current static output.
- Existing JavaScript changes in the working tree must be treated carefully and not reverted.
- No unrelated cleanup or theme migration.

Because this repository currently contains generated static files, the implementation should target the checked-in output directly.

## Responsiveness

The archive list must remain readable on mobile:

- Header navigation wraps cleanly or stacks.
- Date and title rows may become two-line rows on narrow screens.
- No horizontal scrolling for normal text content.
- Touch targets remain usable.

## Error Handling And Fallbacks

If a page lacks an expected post list, CSS should degrade harmlessly rather than hide content.

If external icon fonts or scripts fail, the site should still expose text navigation and article links.

If the browser does not support newer CSS features, the layout should fall back to a normal single-column document flow.

## Verification

Before claiming completion:

- Inspect the homepage in a browser or screenshot.
- Inspect one post page.
- Check mobile width behavior.
- Confirm the large banner, card styling, shadows, and animations no longer dominate the site.
- Confirm article links, navigation links, search trigger, and back/home link still work.
- Run a simple static sanity check, such as verifying expected files still exist and no obvious syntax-breaking edits were introduced.
