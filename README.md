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

## Editing the site (the builder)

Open your live site with `#edit` on the end of the address, e.g.
`https://jkw2lo.github.io/jens_side_projects/#edit`. Visitors never see the
Edit button; it only shows up with `#edit` (or when running locally).

- **Text:** every editable piece of text has a dashed outline. Click it
  and type. In the one-line fields (titles, taglines, features), **Enter**
  finishes the edit. In a feature, Enter starts the next feature.
- **Projects:** each box gets ★ (feature it, max 3), ↑ ↓ (reorder) and
  ✕ (delete). **+ New project** is at the bottom of the list.
- **Images:** open a project, click **+ Add image** and pick files from
  your computer. Reorder them with ‹ › and remove them with ×. Large
  photos are shrunk automatically when you publish.
- **Link:** type the project URL into the box at the top right of the
  project.
- **About-me photo:** **+ Add photo** in the about card.
- **⚙ Site & theme** (in the dock at the bottom right): door title, email,
  resume upload, door-title font, box style and colors.

When you're done, click **🚀 Publish**. It uploads any new images and your
resume, and saves `js/content.js`, all in one commit to GitHub. The live
site updates a minute or two later. **Undo changes** throws away everything
since your last publish.

Your edits are kept in memory only, not in browser storage. If you try to
close the tab with unpublished changes, the browser warns you first.

### One-time setup: connect GitHub

The first time you publish, the editor asks for a GitHub token:

1. Go to [GitHub → new fine-grained token](https://github.com/settings/personal-access-tokens/new).
2. **Repository access:** "Only select repositories" → this repo.
3. **Permissions → Repository permissions → Contents:** "Read and write".
4. Generate it and paste it into the editor.

The token is kept for that browser tab only, unless you tick "Remember me
on this device". **Disconnect** (under ⚙ Site & theme → Publishing)
removes it.

## Editing content by hand

You can also open `js/content.js` and edit it directly. It's one
`CONTENT` object (`site`, `welcome`, `projects`). Images go in
`assets/images/` and the resume in `assets/resume/`, referred to by file
name only.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Edit mode and Publish work here too.

## Deploying to GitHub Pages

In the repo settings, go to **Pages**, set **Source** to "Deploy from a
branch", and pick `main` and `/ (root)`. The site is published at
`https://<your-username>.github.io/<repo-name>/`.
