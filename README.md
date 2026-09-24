# Jen's Side Projects

A single-page portfolio site: a garage door intro rolls up into a garage
where each project is shown as a banker box in a left-hand menu. Project
details open as a panel that overlays the welcome content — click a project
to open it, click it again to close and return to the background. Plain
HTML/CSS/JS — no build step, so it deploys straight to GitHub Pages.

## Editing your content: Edit Mode (recommended)

Click **Edit** in the top-right corner of the live site. All the edit
controls live in a dock in the **bottom-right corner** — the "+ Text /
+ Image / + Box" buttons above the "Edit mode" info card — so the canvas
itself stays clear while you work:

- **The welcome area (when no project is selected) is a free-form canvas —
  like a single slide.** Drag any block by its ✥ handle, resize it from its
  corner handle, and layer blocks with "Bring to front"/"Send to back".
  Click **+ Text**, **+ Image**, or **+ Box** in the bottom-right dock to
  add a new block anywhere. Click a block to select it — a **Block** panel
  opens with exact X/Y/Width/Height percentages (for precise placement, not
  just eyeballed dragging), its own background color + opacity, and for
  text blocks a font/size/bold/italic/align/color, all independent of the
  other blocks. Delete a block from the same panel. Nothing here is fixed
  chrome — the shipped heading/intro/about/nav-hint are just the starting
  blocks, fully movable, resizable, restylable, or deletable.
- **Alignment guides**: a faint fixed center guide (both axes) is always
  there for quick eyeballing. Click **+ V Guide** / **+ H Guide** to drop a
  draggable line anywhere — drag it into position, and blocks will snap to
  it (edge or center) while you drag or resize them near it. Hover a custom
  guide to reveal its × and remove it.
- **Click any project text** (name, purpose, audience, features, personal
  note) and type. A floating toolbar appears above it with a font picker
  that previews every option in its own real typeface, a size stepper,
  bold/italic, alignment, and a color swatch with an opacity slider — set
  any of these to override that block, or leave it on "Default font" to
  inherit the site font. **Reset** in the toolbar clears a block's
  overrides back to the default.
- Images: click **+ Add** in a project's thumbnail strip to upload, or drop
  an image path/URL into the field below it. Reorder or remove with the
  arrows/× on each thumbnail.
- Features: click **+ Add feature**, type directly into the list, hover a
  feature to reveal its × to remove it.
- A project's link: click **Visit project** in edit mode to edit the URL in
  a small popover instead of navigating away.
- Add, delete, reorder, and star projects as "Featured" (max 3) from the
  left column. Pick a different **box style** for them — Banker Box, Flat
  Card, or Minimal — in the Design panel.
- Site-wide settings live in the **🎨 Design** panel (top toolbar): header
  text, resume, contact email, the default site font, 7 colors (each with
  its own opacity slider), the project box style, the door title's own
  font/size/angle/color, and an optional custom background image.

Changes autosave to that browser's local storage as you go — nothing is
published yet, it's just visible to you, in that browser, until you publish
it:

1. Click **Export data.js** in the edit toolbar. This downloads a `data.js`
   file with everything you've edited.
2. Replace [`js/data.js`](js/data.js) in this repo with the downloaded file.
3. Commit and push. GitHub Pages picks it up automatically.
4. Optionally click **Reset local edits** afterward so this browser goes
   back to showing the published version instead of your local draft.

If uploaded images (or a custom background/resume) make the exported file
huge, drop the actual files into `assets/` instead, commit them, and point
the relevant field at that path (e.g. `assets/images/recipe-1.png`) rather
than an uploaded one.

## Editing your content directly (alternative)

You can also hand-edit **[`js/data.js`](js/data.js)** instead of using Edit
Mode — it defines `SITE_CONFIG`, `ABOUT_ME`, and `PROJECTS` with comments
explaining each field. This is what Edit Mode reads as its starting point
whenever a browser has no local edits saved. `ABOUT_ME.blocks` is the
welcome canvas — each entry has its own `type` (`text`/`image`/`container`),
`x`/`y`/`width`/`height` percentages, and (for text) a `style` override.
`ABOUT_ME.guides` holds your custom alignment guides as `{ v: [...], h: [...] }`
percentage arrays. Each project's text field formatting override (if any) lives in a sibling
`styles` object, e.g. `project.styles.purpose` — leave a field out of
`styles` (or leave `styles: {}`) to use the site default.

## Running it locally

No build tools needed — just serve the folder, e.g.:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch",
   pick the `main` branch and `/ (root)` folder, then save.
4. GitHub will publish it at `https://<your-username>.github.io/<repo-name>/`.
