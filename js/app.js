/* ==========================================================================
   Renders the site from CONTENT (js/content.js). Edit mode lives in
   js/editor.js and is only downloaded when someone clicks "Edit".
   ========================================================================== */

const App = (function () {
  "use strict";

  const DOOR_FONTS = {
    bebas: { label: "Bebas Neue — poster", stack: '"Bebas Neue", sans-serif', google: "Bebas+Neue" },
    anton: { label: "Anton — heavy poster", stack: '"Anton", sans-serif', google: "Anton" },
    staatliches: { label: "Staatliches — industrial", stack: '"Staatliches", sans-serif', google: "Staatliches" },
    typewriter: { label: "Special Elite — typewriter", stack: '"Special Elite", monospace', google: "Special+Elite" },
    marker: { label: "Permanent Marker — handwriting", stack: '"Permanent Marker", cursive', google: "Permanent+Marker" },
    system: { label: "System font", stack: "inherit", google: null },
  };
  const BOX_STYLES = { banker: "Banker box", card: "Flat card", minimal: "Minimal" };

  const $ = (id) => document.getElementById(id);
  // js/editor.js defines a global Editor once it has been loaded.
  const editor = () => (typeof Editor === "undefined" ? null : Editor);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- data ---------------- */
  // Edits live in memory only (nothing is written to browser storage).
  // "Publish" in Edit mode commits them straight to GitHub.
  let data = clone(CONTENT);
  let dirty = false;

  function markChanged() {
    dirty = true;
    if (editor()) editor().updateStatus();
  }

  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // Set a value by dotted path, e.g. "projects.2.purpose".
  function set(path, value) {
    const keys = path.split(".");
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    markChanged();
  }

  /* ---------------- asset paths ---------------- */
  // Previews for files picked in Edit mode (file name -> object URL), so a
  // new image shows right away, before it has been published.
  const previews = new Map();

  function assetUrl(name, folder) {
    if (!name) return "";
    if (/^(https?:|data:|blob:)/.test(name)) return name;
    return encodeURI(name.includes("/") ? name : folder + name);
  }
  const imageUrl = (name) => previews.get(name) || assetUrl(name, "assets/images/");

  /* ---------------- small DOM helpers ---------------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // A piece of editable text. In view mode empty fields are left out; in
  // Edit mode they show a placeholder and become click-to-type.
  function field(tag, cls, path, value, placeholder) {
    if (!state.editing && !value) return null;
    const e = el(tag, cls, value || "");
    if (state.editing) {
      e.dataset.path = path;
      e.dataset.placeholder = placeholder || "Click to add text";
      e.classList.add("editable");
      e.classList.toggle("is-empty", !value);
      e.contentEditable = PLAINTEXT_OK ? "plaintext-only" : "true";
      e.spellcheck = true;
    }
    return e;
  }
  const PLAINTEXT_OK = (() => {
    const d = document.createElement("div");
    d.contentEditable = "plaintext-only";
    return d.contentEditable === "plaintext-only";
  })();

  function actionBtn(action, label, title, extra) {
    const b = el("button", "action-btn", label);
    b.type = "button";
    b.dataset.action = action;
    if (title) b.title = title;
    Object.assign(b.dataset, extra || {});
    return b;
  }

  const append = (parent, ...kids) => kids.forEach((k) => k && parent.appendChild(k));

  /* ---------------- view state ---------------- */
  const state = { activeId: null, slide: 0, editing: false };
  const projectIndex = (id) => data.projects.findIndex((p) => p.id === id);
  const featured = () => data.projects.filter((p) => p.featured).slice(0, 3);

  /* ---------------- theme + chrome ---------------- */
  function applyTheme() {
    const theme = data.site.theme || {};
    const root = document.documentElement.style;
    const c = theme.colors || {};
    const vars = { accent: "--accent", door: "--door", wall: "--wall", floor: "--floor", box: "--box", featuredBox: "--featured-box", panel: "--panel" };
    Object.keys(vars).forEach((k) => c[k] && root.setProperty(vars[k], c[k]));

    const font = DOOR_FONTS[theme.doorFont] || DOOR_FONTS.bebas;
    root.setProperty("--door-font", font.stack);
    let link = $("doorFontLink");
    if (font.google) {
      if (!link) {
        link = el("link");
        link.id = "doorFontLink";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = "https://fonts.googleapis.com/css2?family=" + font.google + "&display=swap";
    } else if (link) {
      link.remove();
    }
    $("sidebar").dataset.boxStyle = theme.boxStyle || "banker";
  }

  function renderChrome() {
    const s = data.site;
    $("doorTitle").textContent = s.title;
    document.title = s.title;
    $("resumeBtn").href = assetUrl(s.resume, "assets/resume/") || "#";
    $("resumeBtn").classList.toggle("hidden", !s.resume);
    $("emailAddress").textContent = s.email;
    $("mailtoLink").href = "mailto:" + s.email;
    $("emailBtn").parentElement.classList.toggle("hidden", !s.email);
  }

  /* ---------------- sidebar boxes ---------------- */
  function makeBox(p) {
    const box = el("div", "project-box" + (p.id === state.activeId ? " active" : ""));
    box.dataset.id = p.id;
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    const inner = el("div", "box-inner");
    const label = el("div", "box-label");
    append(label, el("span", "box-title", p.name || "Untitled"), p.tagline ? el("span", "box-tagline", p.tagline) : null);
    append(inner, el("div", "box-lid"), label);
    box.appendChild(inner);

    if (state.editing) {
      const tools = el("div", "box-tools");
      append(
        tools,
        actionBtn("toggle-featured", p.featured ? "★" : "☆", p.featured ? "Unfeature" : "Feature (max 3)", { id: p.id }),
        actionBtn("move-project", "↑", "Move up", { id: p.id, dir: "-1" }),
        actionBtn("move-project", "↓", "Move down", { id: p.id, dir: "1" }),
        actionBtn("delete-project", "✕", "Delete project", { id: p.id })
      );
      box.appendChild(tools);
    }
    return box;
  }

  function renderSidebar() {
    const top = featured();
    const fl = $("featuredList");
    const pl = $("projectList");
    fl.replaceChildren(...top.map(makeBox));
    pl.replaceChildren(...data.projects.filter((p) => !top.includes(p)).map(makeBox));
    fl.parentElement.classList.toggle("hidden", !top.length && !state.editing);
    if (state.editing) pl.appendChild(actionBtn("add-project", "+ New project", "Add a project"));
  }

  /* ---------------- welcome (no project open) ---------------- */
  function renderWelcome() {
    const w = data.welcome;
    const wrap = el("div", "welcome-content");
    const card = el("div", "about-card");
    if (w.photo) {
      const img = el("img", "about-photo");
      img.src = imageUrl(w.photo);
      img.alt = "";
      markMissing(img, w.photo);
      card.appendChild(img);
    }
    const aboutText = el("div", "about-text");
    append(aboutText, field("p", "", "welcome.about", w.about, "A short bio"));
    if (state.editing) {
      append(
        aboutText,
        w.photo
          ? actionBtn("remove-photo", "Remove photo")
          : actionBtn("add-photo", "+ Add photo", "Pick an image from assets/images")
      );
    }
    card.appendChild(aboutText);
    append(
      wrap,
      field("h1", "welcome-heading", "welcome.heading", w.heading, "Heading"),
      field("p", "welcome-intro", "welcome.intro", w.intro, "Intro"),
      w.about || w.photo || state.editing ? card : null,
      field("p", "welcome-hint", "welcome.hint", w.hint, "A hint about how to browse")
    );
    $("welcome").replaceChildren(wrap);
  }

  // If an image path doesn't exist yet (not copied into assets/), say so
  // in Edit mode instead of showing a broken image.
  function markMissing(img, name) {
    img.addEventListener("error", () => {
      img.classList.add("missing");
      img.title = state.editing ? "Can't load " + name + " yet — if you just published it, the live site takes a minute to update." : "";
    });
  }

  /* ---------------- project panel ---------------- */
  function renderProject() {
    const overlay = $("projectOverlay");
    const i = projectIndex(state.activeId);
    const p = data.projects[i];
    overlay.classList.toggle("open", !!p);
    $("welcome").classList.toggle("behind", !!p);
    if (!p) {
      overlay.replaceChildren();
      return;
    }
    const base = "projects." + i + ".";

    // header
    const header = el("header", "project-header");
    const titles = el("div", "project-titles");
    append(
      titles,
      field("h1", "", base + "name", p.name, "Project name"),
      state.editing ? field("p", "project-tagline", base + "tagline", p.tagline, "Tagline (shown on the box)") : null
    );
    const actions = el("div", "project-actions");
    const hasLink = p.link && p.link !== "https://";
    if (state.editing) {
      const input = el("input", "link-input");
      input.type = "url";
      input.placeholder = "https://… (link for Visit project)";
      input.value = p.link || "";
      input.dataset.path = base + "link";
      actions.appendChild(input);
    } else if (hasLink) {
      const a = el("a", "visit-btn", "Visit project →");
      a.href = p.link;
      a.target = "_blank";
      a.rel = "noopener";
      actions.appendChild(a);
    }
    actions.appendChild(actionBtn("close-project", "×", "Close (Esc)"));
    append(header, titles, actions);

    // info column
    const info = el("div", "info-column");
    const section = (title, node) => node && append(info, el("h3", "", title), node);
    section("Purpose", field("p", "", base + "purpose", p.purpose, "Why you built it"));
    section("Who it's for", field("p", "", base + "audience", p.audience, "Who it's for"));
    const features = p.features || [];
    if (features.length || state.editing) {
      const ul = el("ul", "features-list");
      features.forEach((f, j) => {
        const li = el("li");
        append(li, field("span", "", base + "features." + j, f, "Feature"));
        if (state.editing) li.appendChild(actionBtn("remove-feature", "×", "Remove", { index: String(j) }));
        ul.appendChild(li);
      });
      section("Key features", ul);
      if (state.editing) info.appendChild(actionBtn("add-feature", "+ Add feature"));
    }

    // media column
    const media = el("div", "media-column");
    media.appendChild(renderSlideshow(p));
    if (state.editing) media.appendChild(renderImageStrip(p));

    const body = el("div", "project-body");
    append(body, info, media);

    const note = field("p", "", base + "personal", p.personal, "How you use it and what you learned");
    let noteBox = null;
    if (note) {
      noteBox = el("div", "personal-note");
      append(noteBox, el("h3", "", "From me"), note);
    }

    overlay.replaceChildren(header, body);
    append(overlay, noteBox);
  }

  function renderSlideshow(p) {
    const imgs = p.images || [];
    const show = el("div", "slideshow");
    if (!imgs.length) {
      const ph = el("div", "placeholder");
      append(ph, el("span", "icon", "🖼️"), el("span", "", state.editing ? "Add images below" : "No images yet"));
      show.appendChild(ph);
      return show;
    }
    state.slide = Math.min(state.slide, imgs.length - 1);
    const img = el("img");
    img.src = imageUrl(imgs[state.slide]);
    img.alt = p.name + " screenshot " + (state.slide + 1);
    markMissing(img, imgs[state.slide]);
    show.appendChild(img);
    if (imgs.length > 1) {
      const go = (n) => {
        state.slide = (n + imgs.length) % imgs.length;
        show.replaceWith(renderSlideshow(p));
      };
      const prev = el("button", "slide-nav prev", "‹");
      const next = el("button", "slide-nav next", "›");
      prev.onclick = () => go(state.slide - 1);
      next.onclick = () => go(state.slide + 1);
      const dots = el("div", "slide-dots");
      imgs.forEach((_, n) => {
        const d = el("button", "dot" + (n === state.slide ? " active" : ""));
        d.setAttribute("aria-label", "Image " + (n + 1));
        d.onclick = () => go(n);
        dots.appendChild(d);
      });
      append(show, prev, next, dots);
    }
    return show;
  }

  function renderImageStrip(p) {
    const strip = el("div", "thumb-strip");
    (p.images || []).forEach((name, j) => {
      const cell = el("div", "thumb" + (j === state.slide ? " current" : ""));
      const img = el("img");
      img.src = imageUrl(name);
      img.loading = "lazy";
      img.alt = name;
      img.title = name;
      markMissing(img, name);
      img.onclick = () => {
        state.slide = j;
        renderProject();
      };
      const tools = el("div", "thumb-tools");
      append(
        tools,
        actionBtn("move-image", "‹", "Move left", { index: String(j), dir: "-1" }),
        actionBtn("remove-image", "×", "Remove", { index: String(j) }),
        actionBtn("move-image", "›", "Move right", { index: String(j), dir: "1" })
      );
      append(cell, img, el("span", "thumb-name", name), tools);
      strip.appendChild(cell);
    });
    strip.appendChild(actionBtn("add-image", "+ Add image", "Pick images from assets/images"));
    return strip;
  }

  /* ---------------- selection ---------------- */
  function select(id) {
    state.activeId = state.activeId === id ? null : id;
    state.slide = 0;
    renderSidebar();
    renderProject();
    $("projectOverlay").scrollTop = 0;
  }

  function render() {
    applyTheme();
    renderChrome();
    renderSidebar();
    renderWelcome();
    renderProject();
  }

  /* ---------------- events ---------------- */
  function onBoxActivate(e) {
    if (e.target.closest("[data-action]")) return;
    const box = e.target.closest(".project-box");
    if (box) select(box.dataset.id);
  }
  $("sidebar").addEventListener("click", onBoxActivate);
  $("sidebar").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("project-box")) {
      e.preventDefault();
      select(e.target.dataset.id);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.activeId && !e.target.isContentEditable) select(state.activeId);
  });
  $("projectOverlay").addEventListener("click", (e) => {
    if (e.target.closest('[data-action="close-project"]')) select(state.activeId);
  });

  // garage door
  let doorOpened = false;
  function openDoor() {
    if (doorOpened) return;
    doorOpened = true;
    $("garageDoor").classList.add("opening");
    $("garageScene").removeAttribute("aria-hidden");
    setTimeout(() => ($("doorOverlay").style.display = "none"), 750);
  }
  $("doorOverlay").addEventListener("click", openDoor);
  $("doorOverlay").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openDoor();
  });

  // email popover
  $("emailBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    $("emailPopover").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".email-wrap")) $("emailPopover").classList.add("hidden");
  });
  $("copyEmailBtn").addEventListener("click", () => {
    const btn = $("copyEmailBtn");
    navigator.clipboard.writeText(data.site.email).then(() => {
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1400);
    });
  });

  // edit mode: fetch js/editor.js the first time it's needed
  function loadEditor() {
    if (editor()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "js/editor.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function setEditing(on) {
    const apply = () => {
      state.editing = on;
      document.body.classList.toggle("editing", on);
      $("editBtn").classList.toggle("active", on);
      $("editBtn").textContent = on ? "✓ Done" : "✎ Edit";
      if (editor()) editor().setOpen(on);
      render();
    };
    if (on) loadEditor().then(apply);
    else apply();
  }
  $("editBtn").addEventListener("click", () => setEditing(!state.editing));

  // Visitors don't see the Edit button. Open the site with #edit on the end
  // of the address (or run it locally) to get it.
  const LOCAL = /^(localhost|127\.0\.0\.1|)$/.test(location.hostname);
  function showEditButton() {
    const wanted = LOCAL || location.hash === "#edit";
    $("editBtn").classList.toggle("hidden", !wanted && !state.editing);
    return location.hash === "#edit";
  }
  window.addEventListener("hashchange", () => {
    if (showEditButton() && !state.editing) {
      openDoor();
      setEditing(true);
    }
  });

  render();
  if (showEditButton()) {
    openDoor();
    setEditing(true);
  } else {
    setTimeout(openDoor, 2200);
  }

  return {
    get data() {
      return data;
    },
    set data(next) {
      data = next;
    },
    state,
    DOOR_FONTS,
    BOX_STYLES,
    previews,
    set,
    markChanged,
    isDirty: () => dirty,
    // Replace everything (after loading or publishing); clears "unpublished".
    reset(next) {
      data = clone(next);
      dirty = false;
      render();
    },
    projectIndex,
    featured,
    render,
    renderSidebar,
    renderWelcome,
    renderProject,
    renderChrome,
    applyTheme,
    select,
  };
})();
