/* ==========================================================================
   Edit mode. Loaded on demand by js/app.js when "Edit" is clicked.

   - Click any outlined text to type in place.
   - Buttons (+ Add image, ★, ↑ ↓, ✕ …) change the content directly.
   - "Publish" commits js/content.js plus any new images / resume straight
     to the GitHub repo in one commit. Nothing is kept in browser storage
     except (optionally) your GitHub token.
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
    "Add images and your resume straight from your computer.</p>" +
    '<p id="editStatus" class="edit-status"></p>' +
    '<div class="edit-dock-actions">' +
    '<button type="button" data-dock="settings">⚙ Site &amp; theme</button>' +
    '<button type="button" data-dock="publish" class="primary">🚀 Publish</button>' +
    '<button type="button" data-dock="discard" class="danger">Undo changes</button>' +
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
    if (!status) return;
    if (publishing) {
      status.textContent = "⏳ Publishing…";
      status.className = "edit-status draft";
    } else if (App.isDirty()) {
      const n = pending.size;
      status.textContent =
        "● Unpublished changes" + (n ? " (" + n + " new file" + (n > 1 ? "s" : "") + ")" : "");
      status.className = "edit-status draft";
    } else {
      status.textContent = "✓ Everything is published";
      status.className = "edit-status";
    }
  }

  function setOpen(on) {
    dock.classList.toggle("hidden", !on);
    if (!on) closeSettings();
    if (on) pullLatest();
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
    App.markChanged();
    (renderFn || App.renderProject)();
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

  /* ---------------- picking files ---------------- */
  // Picked files wait here (repo path -> File) until Publish uploads them.
  // Content only ever stores the file NAME, never the image data.
  const pending = new Map();

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

  // "My Screenshot (1).PNG" -> "my-screenshot-1.png", made unique so a new
  // file never silently replaces a different one already in use.
  function cleanName(name, folder) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
    const base =
      (dot > 0 ? name.slice(0, dot) : name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "file";
    const used = new Set(JSON.stringify(App.data).match(/"[^"]*"/g) || []);
    let candidate = base + ext;
    for (let n = 2; used.has('"' + candidate + '"') || pending.has(folder + candidate); n++) {
      candidate = base + "-" + n + ext;
    }
    return candidate;
  }

  function addFiles(files, folder) {
    return files.map((f) => {
      const name = cleanName(f.name, folder);
      pending.set(folder + name, f);
      App.previews.set(name, URL.createObjectURL(f));
      return name;
    });
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
      App.markChanged();
      App.state.activeId = null;
      App.select(id);
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
        const names = addFiles(files, "assets/images/");
        p.images = (p.images || []).concat(names);
        App.state.slide = p.images.length - names.length;
        changed();
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
        const [name] = addFiles(files, "assets/images/");
        App.data.welcome.photo = name;
        changed(App.renderWelcome);
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

  /* ---------------- GitHub ---------------- */
  // Where to publish. On https://<user>.github.io/<repo>/ this is worked
  // out from the address; anywhere else it falls back to DEFAULT_REPO.
  const DEFAULT_REPO = "jkw2lo/jens_side_projects";
  const AUTH_KEY = "jsp_github";

  function guessRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return DEFAULT_REPO;
    const first = location.pathname.split("/")[1];
    return m[1] + "/" + (first || m[1] + ".github.io");
  }

  // Only the token + repo name are stored: for this tab by default, or on
  // this device if "Remember me" is ticked.
  function loadAuth() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      /* ignore */
    }
    return { token: "", repo: guessRepo(), branch: "main" };
  }
  let auth = loadAuth();

  function saveAuth(remember) {
    const raw = JSON.stringify(auth);
    try {
      sessionStorage.setItem(AUTH_KEY, raw);
      if (remember) localStorage.setItem(AUTH_KEY, raw);
      else localStorage.removeItem(AUTH_KEY);
    } catch (err) {
      /* storage blocked — still works until the tab closes */
    }
  }
  function forgetAuth() {
    auth = { token: "", repo: auth.repo, branch: auth.branch };
    try {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  async function gh(path, opts) {
    opts = opts || {};
    const res = await fetch("https://api.github.com/repos/" + auth.repo + path, {
      method: opts.method || "GET",
      headers: {
        Authorization: "Bearer " + auth.token,
        Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      let msg = res.status + " " + res.statusText;
      try {
        msg = (await res.json()).message || msg;
      } catch (err) {
        /* ignore */
      }
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return opts.raw ? res.text() : res.json();
  }

  function explain(err) {
    if (err.status === 401) return "GitHub didn't accept the token. It may have expired — connect again.";
    if (err.status === 403) return "The token can't write to this repo. Give it Contents: Read and write.";
    if (err.status === 404) return "Couldn't find " + auth.repo + " (branch " + auth.branch + "). Check the repo name and that the token includes it.";
    return "GitHub error: " + err.message;
  }

  // The live site can lag a minute behind the repo after publishing, so
  // when editing starts, load content.js fresh from GitHub instead.
  let pulled = false;
  async function pullLatest() {
    if (pulled || !auth.token || App.isDirty()) return;
    pulled = true;
    try {
      const text = await gh("/contents/js/content.js?ref=" + encodeURIComponent(auth.branch), { raw: true });
      const latest = new Function(text + "\n;return CONTENT;")();
      if (App.isDirty()) return; // started typing meanwhile — keep that
      if (JSON.stringify(latest) !== JSON.stringify(App.data)) {
        App.reset(latest);
        toast("Loaded your latest published content from GitHub.");
      }
    } catch (err) {
      pulled = false;
    }
  }

  /* ---------------- publishing ---------------- */
  function contentFile(data) {
    return (
      "/* ==========================================================================\n" +
      "   ALL OF THE SITE'S CONTENT LIVES IN THIS ONE FILE.\n" +
      "   Published from Edit mode on " + new Date().toISOString().slice(0, 10) + ".\n\n" +
      "   The easy way to change it: open the site with #edit on the end of the\n" +
      "   address, edit in place, and click Publish. See README.md.\n" +
      "   Images live in assets/images/, the resume in assets/resume/.\n" +
      "   ========================================================================== */\n\n" +
      "const CONTENT = " + JSON.stringify(data, null, 2) + ";\n"
    );
  }

  // Big photos get shrunk before upload so the site stays quick to load.
  const MAX_SIDE = 1800;
  async function shrink(file) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = MAX_SIDE / Math.max(bmp.width, bmp.height);
      if (scale >= 1) {
        bmp.close();
        return file;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
      bmp.close();
      const blob = await new Promise((r) => canvas.toBlob(r, file.type, 0.85));
      return blob && blob.size < file.size ? blob : file;
    } catch (err) {
      return file;
    }
  }

  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  let publishing = false;
  async function publish() {
    if (publishing) return;
    if (!auth.token) {
      openConnect(publish);
      return;
    }
    if (!App.isDirty()) {
      toast("Nothing new to publish.");
      return;
    }
    publishing = true;
    updateStatus();
    const snapshot = JSON.parse(JSON.stringify(App.data));
    const uploading = new Map(pending);
    try {
      // 1. upload files one at a time (keeps memory use low)
      const entries = [];
      let n = 0;
      for (const [path, file] of uploading) {
        n++;
        toast("Uploading " + path.split("/").pop() + " (" + n + " of " + uploading.size + ")…");
        const blob = await gh("/git/blobs", {
          method: "POST",
          body: { content: await toBase64(await shrink(file)), encoding: "base64" },
        });
        entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const content = await gh("/git/blobs", {
        method: "POST",
        body: { content: contentFile(snapshot), encoding: "utf-8" },
      });
      entries.push({ path: "js/content.js", mode: "100644", type: "blob", sha: content.sha });

      // 2. one commit on top of the branch (retry if it moved meanwhile)
      const branch = encodeURIComponent(auth.branch);
      for (let attempt = 0; ; attempt++) {
        const ref = await gh("/git/ref/heads/" + branch);
        const head = await gh("/git/commits/" + ref.object.sha);
        const tree = await gh("/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree: entries } });
        const commit = await gh("/git/commits", {
          method: "POST",
          body: {
            message: "Update site content from the editor",
            tree: tree.sha,
            parents: [ref.object.sha],
          },
        });
        try {
          await gh("/git/refs/heads/" + branch, { method: "PATCH", body: { sha: commit.sha } });
          break;
        } catch (err) {
          if (err.status !== 422 || attempt >= 2) throw err;
        }
      }

      uploading.forEach((_, path) => pending.delete(path));
      // Only clear "unpublished" if nothing was edited while uploading.
      if (JSON.stringify(App.data) === JSON.stringify(snapshot) && !pending.size) {
        App.reset(App.data);
      }
      toast("Published! 🎉 The live site updates in a minute or two.");
    } catch (err) {
      if (err.status === 401) forgetAuth();
      toast(explain(err));
    } finally {
      publishing = false;
      updateStatus();
    }
  }

  /* ---------------- dock buttons ---------------- */
  dock.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dock]");
    if (!btn) return;
    const what = btn.dataset.dock;
    if (what === "publish") publish();
    if (what === "settings") openSettings();
    if (what === "discard" && App.isDirty() && confirm("Undo everything since you last published?")) {
      pending.clear();
      App.reset(CONTENT);
      pulled = false;
      pullLatest();
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
      App.markChanged();
      App.renderChrome();
    };
    const themeChanged = () => {
      App.markChanged();
      App.applyTheme();
    };

    body.append(
      row("Garage door title", textInput(site.title, (v) => ((site.title = v), siteChanged()))),
      row("Email", textInput(site.email, (v) => ((site.email = v), siteChanged())))
    );

    const resumeInput = textInput(site.resume, (v) => ((site.resume = v), siteChanged()));
    resumeInput.readOnly = true;
    resumeInput.placeholder = "No resume yet";
    const resumeWrap = document.createElement("div");
    resumeWrap.className = "input-with-btn";
    const resumePick = document.createElement("button");
    resumePick.type = "button";
    resumePick.textContent = "Upload…";
    resumePick.onclick = () =>
      pickFiles(".pdf,application/pdf", false, (files) => {
        const [name] = addFiles(files, "assets/resume/");
        App.previews.delete(name);
        resumeInput.value = site.resume = name;
        siteChanged();
      });
    resumeWrap.append(resumeInput, resumePick);
    body.appendChild(row("Resume (PDF)", resumeWrap, "Uploaded when you publish."));

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

    const ghTitle = document.createElement("h3");
    ghTitle.textContent = "Publishing";
    const ghText = document.createElement("p");
    ghText.className = "field-hint";
    ghText.textContent = auth.token
      ? "Connected to " + auth.repo + " (" + auth.branch + ")."
      : "Not connected to GitHub yet.";
    const ghBtn = document.createElement("button");
    ghBtn.type = "button";
    ghBtn.className = "panel-btn";
    ghBtn.textContent = auth.token ? "Change connection" : "Connect GitHub";
    ghBtn.onclick = () => openConnect();
    body.append(ghTitle, ghText, ghBtn);

    panel.appendChild(body);
    panel.classList.remove("hidden");
  }

  /* ---------------- connect to GitHub ---------------- */
  function panelShell(title) {
    panel.replaceChildren();
    const head = document.createElement("div");
    head.className = "settings-head";
    const h = document.createElement("h2");
    h.textContent = title;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "action-btn";
    close.textContent = "×";
    close.onclick = closeSettings;
    head.append(h, close);
    const body = document.createElement("div");
    body.className = "settings-body";
    panel.append(head, body);
    panel.classList.remove("hidden");
    return body;
  }

  function openConnect(then) {
    const body = panelShell("Connect GitHub");
    const intro = document.createElement("div");
    intro.className = "connect-steps";
    intro.innerHTML =
      "<p>Publishing saves your changes straight to your GitHub repo. You only set this up once.</p>" +
      "<ol>" +
      '<li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → new fine-grained token</a>.</li>' +
      "<li>Under <b>Repository access</b>, pick <b>Only select repositories</b> and choose this site's repo.</li>" +
      "<li>Under <b>Permissions → Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>.</li>" +
      "<li>Click <b>Generate token</b> and paste it below.</li>" +
      "</ol>";
    body.appendChild(intro);

    const token = document.createElement("input");
    token.type = "password";
    token.placeholder = "github_pat_…";
    token.autocomplete = "off";
    token.value = auth.token;
    const repo = textInput(auth.repo, () => {});
    const branch = textInput(auth.branch, () => {});
    const remember = document.createElement("input");
    remember.type = "checkbox";
    try {
      remember.checked = !!localStorage.getItem(AUTH_KEY);
    } catch (err) {
      /* ignore */
    }
    const rememberRow = document.createElement("label");
    rememberRow.className = "check-row";
    rememberRow.append(remember, document.createTextNode(" Remember me on this device"));

    body.append(
      row("Token", token),
      row("Repo", repo, "owner/name"),
      row("Branch", branch, "The branch GitHub Pages publishes from."),
      rememberRow
    );

    const msg = document.createElement("p");
    msg.className = "field-hint connect-msg";
    const go = document.createElement("button");
    go.type = "button";
    go.className = "panel-btn primary";
    go.textContent = "Connect";
    go.onclick = async () => {
      auth = { token: token.value.trim(), repo: repo.value.trim(), branch: branch.value.trim() || "main" };
      if (!auth.token) {
        msg.textContent = "Paste a token first.";
        return;
      }
      go.disabled = true;
      msg.textContent = "Checking…";
      try {
        const info = await gh("");
        if (info.permissions && !info.permissions.push) {
          throw Object.assign(new Error("read only"), { status: 403 });
        }
        await gh("/git/ref/heads/" + encodeURIComponent(auth.branch));
        saveAuth(remember.checked);
        closeSettings();
        toast("Connected to " + auth.repo + ".");
        pulled = false;
        if (then) then();
        else pullLatest();
      } catch (err) {
        msg.textContent = explain(err);
      } finally {
        go.disabled = false;
      }
    };
    body.append(go, msg);

    if (auth.token) {
      const out = document.createElement("button");
      out.type = "button";
      out.className = "panel-btn";
      out.textContent = "Disconnect";
      out.onclick = () => {
        forgetAuth();
        closeSettings();
        toast("Disconnected. Your token was removed from this browser.");
      };
      body.appendChild(out);
    }
    token.focus();
  }

  return { setOpen, updateStatus, toast };
})();
