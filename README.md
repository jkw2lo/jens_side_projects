# Jen's Side Projects

A single-page portfolio site. A garage door rolls up into a garage, and
each project is a banker box in the left-hand column. Click a box to open
the project; click it again (or press Esc, or ×) to close it.

Plain HTML/CSS/JS, no build step, so it deploys straight to GitHub Pages.

## Where things live

```
index.html          page skeleton
js/content.js       ALL of the site's text, project list, and settings
js/app.js           renders the site from content.js
js/editor.js        Edit mode (only downloaded when you click Edit)
css/styles.css      the look
assets/images/      project screenshots, your photo, etc.
assets/resume/      your resume PDF
```

## Adding images and files

1. Drop the file into `assets/images/` (or your resume into `assets/resume/`).
2. Refer to it **by file name only**. For example, a project's
   `images: ["recipe-app-1.png", "recipe-app-2.png"]` or
   `resume: "resume.pdf"`.

Content only stores file names, never the image data, so the site stays
lightweight no matter how many images you add.

## Editing content in the browser (Edit mode)

Run the site locally (see below), then click **✎ Edit** at the top right.

- **Text:** every editable piece of text has a dashed outline. Click it
  and type. In the one-line fields (titles, taglines, features), **Enter**
  finishes the edit. In a feature, Enter starts the next feature.
- **Projects:** each box gets ★ (feature it, max 3), ↑ ↓ (reorder) and
  ✕ (delete). **+ New project** is at the bottom of the list.
- **Images:** open a project and click **+ Add image**, then pick files
  from `assets/images/`. Reorder them with ‹ › and remove them with ×.
  If a file you picked isn't in `assets/images/` yet, its name shows in
  red. Copy it in before you publish.
- **Link:** type the project URL into the box at the top right of the
  project.
- **About-me photo:** **+ Add photo** in the about card.
- **⚙ Site & theme** (in the dock at the bottom right): door title, email,
  resume file, door-title font, box style and colors.

Edits autosave as a **draft in that browser only**. To publish them:

1. Click **💾 Save content.js**.
   - In Chrome or Edge you can choose `js/content.js` in your local copy
     of this repo and overwrite it directly. Later saves go to the same file.
   - In other browsers it downloads `content.js`. Replace `js/content.js`
     with it.
2. Commit and push `js/content.js` plus any new files in `assets/`.

Once the published `content.js` matches your draft, the draft is cleared
automatically. **Discard draft** throws your local edits away and returns
to the published version.

## Editing content by hand

You can also open `js/content.js` and edit it directly. It's one
`CONTENT` object (`site`, `welcome`, `projects`), with a comment
explaining each field.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

In the repo settings, go to **Pages**, set **Source** to "Deploy from a
branch", and pick `main` and `/ (root)`. The site is published at
`https://<your-username>.github.io/<repo-name>/`.
