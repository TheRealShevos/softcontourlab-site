# Soft Contour Lab — softcontourlab.me

Public site for Soft Contour Lab, an early-stage startup building a radiologist-facing tool that highlights pancreatic tumours on CT with a soft,
shape-faithful contour.

Plain static HTML/CSS/JS. No build step and no dependencies beyond Google Fonts.
Deploying: see [DEPLOY.md](DEPLOY.md).

## Preview locally

```bash
python3 -m http.server 8765
```

Then open <http://127.0.0.1:8765>. `404.html` uses root-absolute paths, so preview it through the
server rather than via `file://`.

## Layout

| Path | What |
|---|---|
| `index.html` | Home: product vision, concept viewer, pricing, evidence teaser, roadmap |
| `research.html` | Method, Task 4 soft-boundary evidence, nulls, success bar (no dataset detail, by design) |
| `team.html` | Eight members, one grid, one specialty line each |
| `contact.html` | Contact: shevaan@softcontourlab.me |
| `privacy.html`, `terms.html` | Plain-English privacy policy and terms of use (not legal advice; have them reviewed once incorporated) |
| `assets/css/site.css` | Design system: tokens at the top |
| `assets/js/site.js` | Nav, scroll reveals, copy button |
| `assets/js/viewer.js` | Hero concept viewer (synthetic CT slice, not patient data) |
| `assets/brand/` | Logo mark (SVG), favicon/touch icons, social card |
| `assets/figures/` | Real Task 4 figures, copied from the evidence pack |

The nav and footer are duplicated in each page on purpose, because there is no build step. If you
change one, change all four (plus `404.html`).

## Content rules (non-negotiable)

- **No invented metrics.** Every number must trace to the table below.
- **R-Super is prior work.** Never present its results as ours.
- **No clinical claims.** The product is delineation support, not diagnosis.
- **No company claims** (Pty Ltd, ABN, etc.) unless real registration details exist.
- The hero viewer is labelled synthetic and illustrative. Keep it that way.

## Where every number comes from

Every figure on the site traces to an internal research record. The mapping lives in
`SOURCES.local.md`, which is git-ignored and kept on the maintainer's machine. Check it before
changing any number.

## Adding team photos

Put a square JPG at `assets/team/<initials-or-slug>.jpg` (400×400 is plenty). In `team.html`, add
`<img src="assets/team/<slug>.jpg" alt="">` inside that person's `<div class="avatar">`. The
monogram ring hides automatically when a photo is present.
