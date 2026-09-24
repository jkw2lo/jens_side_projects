# Jen's Side Projects

A single-page portfolio site: a garage door intro rolls up into a garage
where each project is shown as a banker box in a left-hand menu. Project
details open as a panel that overlays the welcome content — click a project
to open it, click it again to close and return to the background. Plain
HTML/CSS/JS — no build step, so it deploys straight to GitHub Pages.

## Editing your content: Edit Mode (recommended)

Click **Edit** in the top-right corner of the live site. Editing happens
directly on the page — there's no separate form to fill out:

- **Click any text** (the welcome heading/intro/about-me, a project's name,
  purpose, audience, features, personal note...) and type. A floating
  toolbar appears above it with a font picker that previews every option in
  its own real typeface, a size stepper, bold/italic, alignment, and a
  color swatch with an opacity slider — set any of these to override that
  one block, or leave it on "Default font" to inherit the site font. Click
  elsewhere to dismiss the toolbar; **Reset** in the toolbar clears a
  block's overrides back to the default.
- Images: click **+ Add** in a project's thumbnail strip to upload, or drop
  an image path/URL into the field below it. Reorder or remove with the
  arrows/× on each thumbnail.
- Features: click **+ Add feature**, type directly into the list, hover a
  feature to reveal its × to remove it.
- A project's link: click **Visit project** in edit mode to edit the URL in
  a small popover instead of navigating away.
- Add, delete, reorder, and star projects as "Featured" (max 3) from the
  left column.
- Site-wide settings live in the **🎨 Design** panel (top toolbar): header
  text, resume, contact email, the default site font, 7 colors (each with
  its own opacity slider), where the welcome text sits over the background
  (a visual 3x3 grid), the door title's own font/size/angle/color, and an
  optional custom background image.

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
whenever a browser has no local edits saved. Each text field's formatting
override (if any) lives in a sibling `styles` object, e.g.
`ABOUT_ME.styles.heading` or `project.styles.purpose` — leave a field out
of `styles` (or leave `styles: {}`) to use the site default.

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
