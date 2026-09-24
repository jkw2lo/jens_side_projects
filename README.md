# Jen's Side Projects

A single-page portfolio site: a garage door intro rolls up into a garage
where each project is shown as a banker box in a left-hand menu. Project
details open as a panel that overlays the welcome content — click a project
to open it, click it again to close and return to the background. Plain
HTML/CSS/JS — no build step, so it deploys straight to GitHub Pages.

## Editing your content: Edit Mode (recommended)

Click **Edit** in the top-right corner of the live site. This turns on an
in-page editor:

- Add, delete, reorder, and star projects as "Featured" (max 3) right from
  the left column.
- Click a project to edit its title, tagline, link, purpose, audience, key
  features, images, and personal note through forms in the overlay panel.
- Upload images straight from your computer, or add an image by path/URL.
- From the welcome screen: edit the welcome heading/intro/about-me text, the
  header text shown top-left and on the garage door, your resume (upload a
  file or link to one) and contact email, and appearance — site font, 7
  colors (accent/door/wall/floor/boxes/featured boxes/panel), a separate
  font+size+angle+color just for the big door title (handwriting, spray
  paint, poster styles, etc.), where the welcome text sits (left/center/right,
  top/center/bottom — handy for balancing it against a custom background
  photo), and an optional custom background image.

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
whenever a browser has no local edits saved.

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
