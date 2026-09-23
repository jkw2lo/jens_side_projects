# Jen's Side Projects

A single-page portfolio site: a garage door intro that rolls up into a garage
where each project is shown as a banker box in a left-hand menu, with details
in a center panel. Plain HTML/CSS/JS — no build step, so it deploys straight
to GitHub Pages.

## Editing your content: Edit Mode (recommended)

Click **Edit** in the top-right corner of the live site. This turns on an
in-page editor:

- Add, delete, reorder, and star projects as "Featured" (max 3) right from
  the left column.
- Click a project to edit its title, tagline, link, purpose, audience, key
  features, images, and personal note through forms in the center panel.
- Edit the welcome heading/intro/about-me text and your resume URL / contact
  email from the welcome screen.
- Upload images straight from your computer, or add an image by path/URL.

Changes autosave to that browser's local storage as you go — nothing is
published yet, it's just visible to you, in that browser, until you publish
it:

1. Click **Export data.js** in the edit toolbar. This downloads a `data.js`
   file with everything you've edited.
2. Replace [`js/data.js`](js/data.js) in this repo with the downloaded file.
3. Commit and push. GitHub Pages picks it up automatically.
4. Optionally click **Reset local edits** afterward so this browser goes
   back to showing the published version instead of your local draft.

If uploaded images make the exported file huge, drop the actual image files
into `assets/images/` instead, commit them, and point each project's image
at that path (e.g. `assets/images/recipe-1.png`) rather than an uploaded one.

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
