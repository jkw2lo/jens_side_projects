# Jen's Side Projects

A single-page portfolio site: a garage door intro that rolls up into a garage
where each project is shown as a banker box in a left-hand menu, with details
in a center panel. Plain HTML/CSS/JS — no build step, so it deploys straight
to GitHub Pages.

## Editing your content

Everything you'll want to change day-to-day lives in **[`js/data.js`](js/data.js)**:

- `SITE_CONFIG` — your resume file path and contact email.
- `ABOUT_ME` — the heading/intro/bio shown when no project is selected.
- `PROJECTS` — one object per project (see the comments at the top of the
  file for what each field does). Set `featured: true` on up to 3 projects
  to pin them above the scrollable list.

### Adding images

Drop screenshots into `assets/images/` and reference them in a project's
`images` array, e.g. `images: ["assets/images/recipe-1.png", "assets/images/recipe-2.png"]`.
Until you add images, the slideshow shows a placeholder automatically.

### Adding your resume

Put a PDF at `assets/resume/resume.pdf` (or change `SITE_CONFIG.resumeUrl`
in `js/data.js` to point wherever you'd rather host it).

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
