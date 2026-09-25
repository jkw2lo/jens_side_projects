/* ==========================================================================
   Edit mode. Loaded on demand by js/app.js when "Edit" is clicked.

   - Click any outlined text to type in place.
   - Buttons (+ Add image, ★, ↑ ↓, ✕ …) change the content directly.
   - Edits are kept as a draft in this browser until you click
     "Save content.js" and publish that file (see README).
   ========================================================================== */

const Editor = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MAX_FEATURED = 3;

  /* ---------------- dock (bottom-right) ---------------- */
  const dock = document.createElement("div");
  dock.className = "edit-dock hidden";
  dock.innerHTML =
    '<p class="edit-dock-text">Click any outlined text to change it. ' +
    'Images come from <code>assets/images/</code>.</p>' +
    '<p id="editStatus" class="edit-status"></p>' +
    '<div class="edit-dock-actions">' +
    '<button type="button" data-dock="settings">⚙ Site &amp; theme</button>' +
    '<button type="button" data-dock="save" class="primary">💾 Save content.js</button>' +
    '<button type="button" data-dock="discard" class="danger">Discard draft</button>' +
    "</div>";
  document.body.appendChild(dock);

  const toastEl = document.createElement("div");
  toastEl.className = "toast hidden";
  document.body.appendChild(toastEl);
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 4200);
  }

  function updateStatus() {
    const status = $("editStatus");
    if (App.hasDraft()) {
      status.textContent = "● Unsaved draft (only in this browser)";
      status.className = "edit-status draft";
    } else {
      status.textContent = "✓ Matches your saved content.js";
      status.className = "edit-status";
    }
  }

  function setOpen(on) {
    dock.classList.toggle("hidden", !on);
    if (!on) closeSettings();
    updateStatus();
  }

  /* ---------------- typing into text ---------------- */
  function readValue(node) {
    if (node.tagName === "INPUT") return node.value.trim();
    // innerText keeps line breaks the user typed; drop a trailing one.
    return node.innerText.replace(/\n$/, "");
  }

  document.addEventListener("input", (e) => {
    const node = e.target.closest && e.target.closest("[data-path]");
    if (!node || !App.state.editing) return;
    const path = node.dataset.path;
    const value = readValue(node);
    App.set(path, value);
    node.classList.toggle("is-empty", !value);
    if (/^projects\.\d+\.(name|tagline)$/.test(path)) App.renderSidebar();
    updateStatus();
  });

  // Single-line fields: Enter finishes (or adds the next feature).
  // Multi-line (paragraphs): Enter makes a new line.
  document.addEventListener("keydown", (e) => {
    const node = e.target.closest && e.target.closest("[data-path]");
    if (!node || e.key !== "Enter" || node.tagName === "P") return;
    e.preventDefault();
    const m = node.dataset.path.match(/^projects\.(\d+)\.features\.(\d+)$/);
    if (m) addFeature(Number(m[2]) + 1);
    else node.blur();
  });

  // Paste as plain text (for browsers without contenteditable=plaintext-only).
  document.addEventListener("paste", (e) => {
    const node = e.target.closest && e.target.closest('[data-path][contenteditable="true"]');
    if (!node) return;
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  });

  /* ---------------- helpers for the open project ---------------- */
  function activeProject() {
    const i = App.projectIndex(App.state.activeId);
    return i < 0 ? null : App.data.projects[i];
  }
  function changed(renderFn) {
    App.saveDraft();
    (renderFn || App.renderProject)();
    updateStatus();
  }
  function focusPath(path) {
    const node = document.querySelector('[data-path="' + path + '"]');
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function addFeature(at) {
    const p = activeProject();
    if (!p) return;
    p.features = p.features || [];
    if (at == null) at = p.features.length;
    p.features.splice(at, 0, "");
    changed();
    focusPath("projects." + App.projectIndex(p.id) + ".features." + at);
  }

  /* ---------------- picking files from assets/ ---------------- */
  // We only store the file NAME (tiny), never the image data. A session
  // preview is shown in case the file hasn't been copied into assets/ yet.
  const picker = document.createElement("input");
  picker.type = "file";
  picker.hidden = true;
  document.body.appendChild(picker);
  let onPicked = null;

  function pickFiles(accept, multiple, cb) {
    picker.accept = accept;
    picker.multiple = multiple;
    picker.value = "";
    onPicked = cb;
    picker.click();
  }
  picker.addEventListener("change", () => {
    const files = Array.from(picker.files || []);
    if (files.length && onPicked) onPicked(files);
  });

  function registerImages(files) {
    return files.map((f) => {
      if (!App.previews.has(f.name)) App.previews.set(f.name, URL.createObjectURL(f));
      return f.name;
    });
  }
  function assetReminder(names, folder) {
    toast(
      "Added " + names.join(", ") + ". Make sure " + (names.length > 1 ? "they're" : "it's") +
        " in " + folder + " before you publish."
    );
  }

  /* ---------------- buttons inside the page ---------------- */
  const actions = {
    "add-project"() {
      const id = "project-" + Date.now().toString(36);
      App.data.projects.push({
        id,
        name: "New Project",
        featured: false,
        tagline: "",
        link: "",
        images: [],
        purpose: "",
        audience: "",
        features: [],
        personal: "",
      });
      App.saveDraft();
      App.state.activeId = null;
      App.select(id);
      updateStatus();
      focusPath("projects." + App.projectIndex(id) + ".name");
    },
    "delete-project"(btn) {
      const i = App.projectIndex(btn.dataset.id);
      const p = App.data.projects[i];
      if (!p || !confirm('Delete "' + (p.name || "this project") + '"?')) return;
      App.data.projects.splice(i, 1);
      if (App.state.activeId === p.id) App.state.activeId = null;
      changed(() => {
        App.renderSidebar();
        App.renderProject();
      });
    },
    "toggle-featured"(btn) {
      const p = App.data.projects[App.projectIndex(btn.dataset.id)];
      if (!p.featured && App.data.projects.filter((x) => x.featured).length >= MAX_FEATURED) {
        toast("Only " + MAX_FEATURED + " featured projects — unfeature one first.");
        return;
      }
      p.featured = !p.featured;
      changed(App.renderSidebar);
    },
    "move-project"(btn) {
      // Swap with the next project in the same group (featured / not).
      const arr = App.data.projects;
      const dir = Number(btn.dataset.dir);
      const i = App.projectIndex(btn.dataset.id);
      let j = i + dir;
      while (j >= 0 && j < arr.length && !!arr[j].featured !== !!arr[i].featured) j += dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      changed(() => {
        App.renderSidebar();
        App.renderProject(); // field paths include the index
      });
    },
    "add-feature"() {
      addFeature();
    },
    "remove-feature"(btn) {
      activeProject().features.splice(Number(btn.dataset.index), 1);
      changed();
    },
    "add-image"() {
      const p = activeProject();
      pickFiles("image/*", true, (files) => {
        const names = registerImages(files);
        p.images = (p.images || []).concat(names);
        App.state.slide = p.images.length - names.length;
        changed();
        assetReminder(names, "assets/images/");
      });
    },
    "remove-image"(btn) {
      activeProject().images.splice(Number(btn.dataset.index), 1);
      changed();
    },
    "move-image"(btn) {
      const imgs = activeProject().images;
      const i = Number(btn.dataset.index);
      const j = i + Number(btn.dataset.dir);
      if (j < 0 || j >= imgs.length) return;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      App.state.slide = j;
      changed();
    },
    "add-photo"() {
      pickFiles("image/*", false, (files) => {
        const [name] = registerImages(files);
        App.data.welcome.photo = name;
        changed(App.renderWelcome);
        assetReminder([name], "assets/images/");
      });
    },
    "remove-photo"() {
      App.data.welcome.photo = "";
      changed(App.renderWelcome);
    },
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || !App.state.editing || !actions[btn.dataset.action]) return;
    e.stopPropagation();
    actions[btn.dataset.action](btn);
  });

  /* ---------------- dock buttons ---------------- */
  function exportText() {
    return (
      "/* ==========================================================================\n" +
      "   ALL OF THE SITE'S CONTENT LIVES IN THIS ONE FILE.\n" +
      "   Saved from Edit mode on " + new Date().toISOString().slice(0, 10) + ".\n\n" +
      "   Images: drop them into assets/images/ and list them by file name.\n" +
      "   Resume: drop it into assets/resume/ and set site.resume to its name.\n" +
      "   See README.md for what each field does.\n" +
      "   ========================================================================== */\n\n" +
      "const CONTENT = " + JSON.stringify(App.data, null, 2) + ";\n"
    );
  }

  let fileHandle = null; // remembered so later saves overwrite the same file
  async function save() {
    App.saveDraftNow();
    const text = exportText();
    if (window.showSaveFilePicker) {
      try {
        if (!fileHandle) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: "content.js",
            types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }],
          });
        }
        const w = await fileHandle.createWritable();
        await w.write(text);
        await w.close();
        App.markSaved();
        updateStatus();
        toast("Saved. Commit & push js/content.js (and any new assets) to publish.");
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
        fileHandle = null; // fall back to a normal download
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.js";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    App.markSaved();
    updateStatus();
    toast("Downloaded content.js — replace js/content.js with it, then commit & push.");
  }

  dock.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dock]");
    if (!btn) return;
    const what = btn.dataset.dock;
    if (what === "save") save();
    if (what === "settings") openSettings();
    if (what === "discard" && confirm("Throw away all edits in this browser and go back to the published content.js?")) {
      App.resetDraft();
      updateStatus();
    }
  });

  /* ---------------- site & theme panel ---------------- */
  const panel = document.createElement("div");
  panel.className = "settings-panel hidden";
  document.body.appendChild(panel);

  function closeSettings() {
    panel.classList.add("hidden");
  }

  function row(label, control, hint) {
    const wrap = document.createElement("label");
    wrap.className = "field";
    const span = document.createElement("span");
    span.className = "field-label";
    span.textContent = label;
    wrap.append(span, control);
    if (hint) {
      const h = document.createElement("span");
      h.className = "field-hint";
      h.textContent = hint;
      wrap.appendChild(h);
    }
    return wrap;
  }
  function textInput(value, onInput) {
    const i = document.createElement("input");
    i.type = "text";
    i.value = value || "";
    i.addEventListener("input", () => onInput(i.value.trim()));
    return i;
  }
  function select(options, value, onChange) {
    const s = document.createElement("select");
    Object.keys(options).forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = typeof options[k] === "string" ? options[k] : options[k].label;
      s.appendChild(o);
    });
    s.value = value;
    s.addEventListener("change", () => onChange(s.value));
    return s;
  }

  const COLOR_LABELS = {
    accent: "Accent (buttons)",
    door: "Garage door",
    wall: "Wall",
    floor: "Floor",
    box: "Project boxes",
    featuredBox: "Featured boxes",
    panel: "Project panel",
  };

  function openSettings() {
    const site = App.data.site;
    const theme = site.theme;
    panel.replaceChildren();

    const head = document.createElement("div");
    head.className = "settings-head";
    head.innerHTML = "<h2>Site &amp; theme</h2>";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "action-btn";
    close.textContent = "×";
    close.onclick = closeSettings;
    head.appendChild(close);
    panel.appendChild(head);

    const body = document.createElement("div");
    body.className = "settings-body";

    const siteChanged = () => {
      App.saveDraft();
      App.renderChrome();
      updateStatus();
    };
    const themeChanged = () => {
      App.saveDraft();
      App.applyTheme();
      updateStatus();
    };

    body.append(
      row("Garage door title", textInput(site.title, (v) => ((site.title = v), siteChanged()))),
      row("Email", textInput(site.email, (v) => ((site.email = v), siteChanged())))
    );

    const resumeInput = textInput(site.resume, (v) => ((site.resume = v), siteChanged()));
    const resumeWrap = document.createElement("div");
    resumeWrap.className = "input-with-btn";
    const resumePick = document.createElement("button");
    resumePick.type = "button";
    resumePick.textContent = "Choose…";
    resumePick.onclick = () =>
      pickFiles(".pdf,application/pdf", false, ([f]) => {
        resumeInput.value = site.resume = f.name;
        siteChanged();
        assetReminder([f.name], "assets/resume/");
      });
    resumeWrap.append(resumeInput, resumePick);
    body.appendChild(row("Resume file", resumeWrap, "A file name in assets/resume/"));

    body.append(
      row("Door title font", select(App.DOOR_FONTS, theme.doorFont || "bebas", (v) => ((theme.doorFont = v), themeChanged()))),
      row("Project box style", select(App.BOX_STYLES, theme.boxStyle || "banker", (v) => ((theme.boxStyle = v), themeChanged())))
    );

    const colors = document.createElement("div");
    colors.className = "color-grid";
    Object.keys(COLOR_LABELS).forEach((k) => {
      const c = document.createElement("input");
      c.type = "color";
      c.value = theme.colors[k] || CONTENT.site.theme.colors[k];
      c.addEventListener("input", () => {
        theme.colors[k] = c.value;
        themeChanged();
      });
      colors.appendChild(row(COLOR_LABELS[k], c));
    });
    const colorsTitle = document.createElement("h3");
    colorsTitle.textContent = "Colors";
    body.append(colorsTitle, colors);

    panel.appendChild(body);
    panel.classList.remove("hidden");
  }

  return { setOpen, updateStatus, toast };
})();
