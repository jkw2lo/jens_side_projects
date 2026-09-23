(function () {
  "use strict";

  /* ---------------- garage door intro ---------------- */
  const doorOverlay = document.getElementById("doorOverlay");
  const garageDoor = document.getElementById("garageDoor");
  const garageScene = document.getElementById("garageScene");
  let doorOpened = false;

  function openDoor() {
    if (doorOpened) return;
    doorOpened = true;
    garageDoor.classList.add("opening");
    garageScene.removeAttribute("aria-hidden");
    garageDoor.addEventListener(
      "transitionend",
      () => {
        doorOverlay.style.display = "none";
      },
      { once: true }
    );
  }

  doorOverlay.addEventListener("click", openDoor);
  doorOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") openDoor();
  });
  window.setTimeout(openDoor, 2200);

  /* ---------------- shared state ---------------- */
  const featuredListEl = document.getElementById("featuredList");
  const projectListEl = document.getElementById("projectList");
  const detailPanel = document.getElementById("detailPanel");

  let activeProjectId = null;
  let currentSlide = 0;
  let editMode = false;
  try {
    editMode = localStorage.getItem("jsp_edit_mode") === "1";
  } catch (err) {
    /* ignore */
  }

  // When a form field commits its own value directly to the DOM (typing),
  // we skip rebuilding the detail panel so focus/cursor position survive.
  let suppressDetailRerender = false;
  function liveUpdate(fn) {
    suppressDetailRerender = true;
    fn();
    suppressDetailRerender = false;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  /* ---------------- toast + confirm modal (replace alert/confirm) ---------------- */
  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("toast-out");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 3200);
  }

  Store.onWarning(showToast);

  function confirmAction(message, confirmLabel) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML =
        '<div class="modal-box"><p class="modal-message"></p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="modal-cancel">Cancel</button>' +
        '<button type="button" class="modal-confirm danger-btn"></button>' +
        "</div></div>";
      overlay.querySelector(".modal-message").textContent = message;
      overlay.querySelector(".modal-confirm").textContent = confirmLabel || "Delete";

      function cleanup(result) {
        overlay.remove();
        resolve(result);
      }
      overlay.querySelector(".modal-cancel").addEventListener("click", () => cleanup(false));
      overlay.querySelector(".modal-confirm").addEventListener("click", () => cleanup(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup(false);
      });
      document.body.appendChild(overlay);
    });
  }

  /* ---------------- sidebar ---------------- */
  function makeBox(project) {
    const box = document.createElement("div");
    box.className = "project-box" + (project.id === activeProjectId ? " active" : "");
    box.dataset.id = project.id;

    let overlay = "";
    if (editMode) {
      overlay =
        '<div class="box-edit-overlay">' +
        '<button type="button" class="box-icon-btn" data-action="feature" title="Toggle featured">' + (project.featured ? "★" : "☆") + "</button>" +
        '<button type="button" class="box-icon-btn" data-action="up" title="Move up">↑</button>' +
        '<button type="button" class="box-icon-btn" data-action="down" title="Move down">↓</button>' +
        '<button type="button" class="box-icon-btn danger" data-action="delete" title="Delete project">×</button>' +
        "</div>";
    }

    box.innerHTML =
      (project.featured ? '<span class="featured-badge">Featured</span>' : "") +
      overlay +
      '<div class="box-lid"></div>' +
      '<div class="box-label">' +
      '<span class="box-title"></span>' +
      '<span class="box-tagline"></span>' +
      "</div>";
    box.querySelector(".box-title").textContent = project.name;
    box.querySelector(".box-tagline").textContent = project.tagline || "";

    box.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        e.stopPropagation();
        handleBoxAction(project.id, actionBtn.dataset.action);
        return;
      }
      selectProject(project.id);
    });

    return box;
  }

  function handleBoxAction(id, action) {
    if (action === "feature") {
      Store.toggleFeatured(id);
    } else if (action === "up") {
      Store.moveProject(id, -1);
    } else if (action === "down") {
      Store.moveProject(id, 1);
    } else if (action === "delete") {
      const p = Store.getProject(id);
      if (!p) return;
      confirmAction('Delete "' + p.name + '"? This can\'t be undone.').then((ok) => {
        if (!ok) return;
        if (id === activeProjectId) activeProjectId = null;
        Store.deleteProject(id);
        renderDetail();
      });
    }
  }

  function renderSidebar() {
    featuredListEl.innerHTML = "";
    projectListEl.innerHTML = "";

    Store.getFeatured().forEach((p) => featuredListEl.appendChild(makeBox(p)));
    Store.getRest().forEach((p) => projectListEl.appendChild(makeBox(p)));

    if (editMode) {
      const addBox = document.createElement("button");
      addBox.type = "button";
      addBox.className = "add-project-box";
      addBox.textContent = "+ Add project";
      addBox.addEventListener("click", () => {
        const id = Store.addProject();
        activeProjectId = id;
        renderSidebar();
        renderDetail();
      });
      projectListEl.appendChild(addBox);
    }
  }

  function selectProject(id) {
    activeProjectId = id;
    currentSlide = 0;
    renderSidebar();
    renderDetail();
    detailPanel.scrollTop = 0;
  }

  /* ---------------- detail panel: read-only views ---------------- */
  function renderWelcomeView() {
    const about = Store.getAboutMe();
    detailPanel.innerHTML =
      '<div class="welcome">' +
      "<h1>" + escapeHtml(about.heading) + "</h1>" +
      '<p class="intro">' + escapeHtml(about.intro) + "</p>" +
      '<div class="about-box"><h3>About me</h3><p>' + escapeHtml(about.about) + "</p></div>" +
      '<p class="nav-hint">' + escapeHtml(about.navHint) + "</p>" +
      "</div>";
  }

  function renderSlideshowView(project) {
    if (!project.images || project.images.length === 0) {
      return (
        '<div class="slideshow"><div class="placeholder">' +
        '<span class="icon">🖼️</span>No images yet' +
        "</div></div>"
      );
    }
    const dots = project.images
      .map((_, i) => '<button class="dot' + (i === currentSlide ? " active" : "") + '" data-index="' + i + '"></button>')
      .join("");
    const navButtons =
      project.images.length > 1
        ? '<button class="slide-nav prev" aria-label="Previous image">&#8249;</button>' +
          '<button class="slide-nav next" aria-label="Next image">&#8250;</button>' +
          '<div class="slide-dots">' + dots + "</div>"
        : "";
    return (
      '<div class="slideshow">' +
      '<img src="' + escapeHtml(project.images[currentSlide]) + '" alt="' + escapeHtml(project.name) + ' screenshot" />' +
      navButtons +
      "</div>"
    );
  }

  function renderProjectView(project) {
    const features = (project.features || []).map((f) => "<li>" + escapeHtml(f) + "</li>").join("");

    detailPanel.innerHTML =
      '<div class="project-detail">' +
      '<div class="project-header">' +
      "<h1>" + escapeHtml(project.name) + "</h1>" +
      '<a class="visit-btn" href="' + escapeHtml(project.link || "#") + '" target="_blank" rel="noopener">Visit project &rarr;</a>' +
      "</div>" +
      '<div class="project-body">' +
      '<div class="info-column">' +
      "<h3>Purpose</h3><p>" + escapeHtml(project.purpose) + "</p>" +
      "<h3>Who it's for</h3><p>" + escapeHtml(project.audience) + "</p>" +
      "<h3>Key features</h3><ul>" + features + "</ul>" +
      "</div>" +
      renderSlideshowView(project) +
      "</div>" +
      '<div class="personal-note">' +
      "<h3>From me</h3><p>" + escapeHtml(project.personal) + "</p>" +
      "</div>" +
      "</div>";

    const prevBtn = detailPanel.querySelector(".slide-nav.prev");
    const nextBtn = detailPanel.querySelector(".slide-nav.next");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentSlide = (currentSlide - 1 + project.images.length) % project.images.length;
        renderDetail();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentSlide = (currentSlide + 1) % project.images.length;
        renderDetail();
      });
    }
    detailPanel.querySelectorAll(".slide-dots .dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        currentSlide = Number(dot.dataset.index);
        renderDetail();
      });
    });
  }

  /* ---------------- detail panel: edit forms ---------------- */
  function textField(label, value, onInput, opts) {
    opts = opts || {};
    const wrap = document.createElement("label");
    wrap.className = "field";
    const span = document.createElement("span");
    span.className = "field-label";
    span.textContent = label;
    const input = document.createElement(opts.textarea ? "textarea" : "input");
    if (!opts.textarea) input.type = opts.type || "text";
    if (opts.rows) input.rows = opts.rows;
    input.value = value || "";
    input.placeholder = opts.placeholder || "";
    input.addEventListener("input", () => liveUpdate(() => onInput(input.value)));
    wrap.appendChild(span);
    wrap.appendChild(input);
    return wrap;
  }

  function renderWelcomeForm() {
    const about = Store.getAboutMe();
    const config = Store.getSiteConfig();

    detailPanel.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "welcome edit-form";

    const h = document.createElement("h2");
    h.className = "form-section-title";
    h.textContent = "Welcome panel";
    wrap.appendChild(h);

    wrap.appendChild(textField("Heading", about.heading, (v) => Store.updateAboutMe({ heading: v })));
    wrap.appendChild(textField("Intro", about.intro, (v) => Store.updateAboutMe({ intro: v }), { textarea: true, rows: 3 }));
    wrap.appendChild(textField("About me", about.about, (v) => Store.updateAboutMe({ about: v }), { textarea: true, rows: 4 }));
    wrap.appendChild(textField("Navigation hint", about.navHint, (v) => Store.updateAboutMe({ navHint: v }), { textarea: true, rows: 3 }));

    const h2 = document.createElement("h2");
    h2.className = "form-section-title";
    h2.textContent = "Site settings";
    wrap.appendChild(h2);

    wrap.appendChild(textField("Resume URL", config.resumeUrl, (v) => Store.updateSiteConfig({ resumeUrl: v })));
    wrap.appendChild(textField("Contact email", config.contactEmail, (v) => Store.updateSiteConfig({ contactEmail: v })));

    detailPanel.appendChild(wrap);
  }

  function renderProjectForm(project) {
    detailPanel.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "project-detail edit-form";

    const header = document.createElement("div");
    header.className = "project-header";
    const h1 = document.createElement("h1");
    h1.textContent = project.name || "(untitled)";
    header.appendChild(h1);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger-btn";
    delBtn.textContent = "Delete project";
    delBtn.addEventListener("click", () => {
      confirmAction('Delete "' + project.name + '"? This can\'t be undone.').then((ok) => {
        if (!ok) return;
        activeProjectId = null;
        Store.deleteProject(project.id);
        renderSidebar();
        renderDetail();
      });
    });
    header.appendChild(delBtn);
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "project-body";

    const info = document.createElement("div");
    info.className = "info-column";
    info.appendChild(textField("Name", project.name, (v) => {
      Store.updateProject(project.id, { name: v });
      h1.textContent = v || "(untitled)";
    }));
    info.appendChild(textField("Tagline", project.tagline, (v) => Store.updateProject(project.id, { tagline: v })));
    info.appendChild(textField("Link", project.link, (v) => Store.updateProject(project.id, { link: v })));
    info.appendChild(textField("Purpose", project.purpose, (v) => Store.updateProject(project.id, { purpose: v }), { textarea: true, rows: 3 }));
    info.appendChild(textField("Who it's for", project.audience, (v) => Store.updateProject(project.id, { audience: v }), { textarea: true, rows: 2 }));

    const featuresLabel = document.createElement("div");
    featuresLabel.className = "field-label";
    featuresLabel.textContent = "Key features";
    info.appendChild(featuresLabel);
    const featuresList = document.createElement("div");
    featuresList.className = "editable-list";
    (project.features || []).forEach((feat, idx) => {
      const row = document.createElement("div");
      row.className = "editable-list-row";
      const input = document.createElement("input");
      input.type = "text";
      input.value = feat;
      input.addEventListener("input", () => liveUpdate(() => Store.updateFeature(project.id, idx, input.value)));
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.className = "row-remove-btn";
      rm.addEventListener("click", () => {
        Store.removeFeature(project.id, idx);
        renderDetail();
      });
      row.appendChild(input);
      row.appendChild(rm);
      featuresList.appendChild(row);
    });
    info.appendChild(featuresList);
    const addFeatureBtn = document.createElement("button");
    addFeatureBtn.type = "button";
    addFeatureBtn.className = "add-row-btn";
    addFeatureBtn.textContent = "+ Add feature";
    addFeatureBtn.addEventListener("click", () => {
      Store.addFeature(project.id);
      renderDetail();
    });
    info.appendChild(addFeatureBtn);

    body.appendChild(info);

    /* ---- image manager ---- */
    const imagesWrap = document.createElement("div");
    imagesWrap.className = "image-manager";
    const imgLabel = document.createElement("div");
    imgLabel.className = "field-label";
    imgLabel.textContent = "Images";
    imagesWrap.appendChild(imgLabel);

    const thumbGrid = document.createElement("div");
    thumbGrid.className = "thumb-grid";
    (project.images || []).forEach((src, idx) => {
      const cell = document.createElement("div");
      cell.className = "thumb-cell";
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      const controls = document.createElement("div");
      controls.className = "thumb-controls";
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.addEventListener("click", () => { Store.moveImage(project.id, idx, -1); renderDetail(); });
      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.addEventListener("click", () => { Store.moveImage(project.id, idx, 1); renderDetail(); });
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "row-remove-btn";
      rm.textContent = "×";
      rm.addEventListener("click", () => { Store.removeImage(project.id, idx); renderDetail(); });
      controls.appendChild(up);
      controls.appendChild(down);
      controls.appendChild(rm);
      cell.appendChild(img);
      cell.appendChild(controls);
      thumbGrid.appendChild(cell);
    });
    imagesWrap.appendChild(thumbGrid);

    const addByPath = document.createElement("div");
    addByPath.className = "add-image-row";
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.placeholder = "assets/images/your-file.png or an image URL";
    const pathBtn = document.createElement("button");
    pathBtn.type = "button";
    pathBtn.textContent = "Add";
    pathBtn.addEventListener("click", () => {
      if (pathInput.value.trim()) {
        Store.addImage(project.id, pathInput.value.trim());
        renderDetail();
      }
    });
    pathInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") pathBtn.click();
    });
    addByPath.appendChild(pathInput);
    addByPath.appendChild(pathBtn);
    imagesWrap.appendChild(addByPath);

    const uploadLabel = document.createElement("label");
    uploadLabel.className = "upload-label";
    uploadLabel.textContent = "Or upload from your computer";
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.multiple = true;
    uploadInput.addEventListener("change", () => {
      Array.from(uploadInput.files || []).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          Store.addImage(project.id, reader.result);
          renderDetail();
        };
        reader.readAsDataURL(file);
      });
    });
    uploadLabel.appendChild(uploadInput);
    imagesWrap.appendChild(uploadLabel);

    const uploadHint = document.createElement("p");
    uploadHint.className = "field-hint";
    uploadHint.textContent =
      "Uploaded images are embedded directly in the page data. That's fine " +
      "for previewing, but before you export & push, consider swapping them " +
      "for real files committed to assets/images/ to keep the page lightweight.";
    imagesWrap.appendChild(uploadHint);

    body.appendChild(imagesWrap);
    wrap.appendChild(body);

    const personalWrap = document.createElement("div");
    personalWrap.className = "personal-note";
    const personalTitle = document.createElement("h3");
    personalTitle.textContent = "From me";
    personalWrap.appendChild(personalTitle);
    personalWrap.appendChild(textField("", project.personal, (v) => Store.updateProject(project.id, { personal: v }), { textarea: true, rows: 3 }));
    wrap.appendChild(personalWrap);

    detailPanel.appendChild(wrap);
  }

  /* ---------------- detail dispatch ---------------- */
  function renderDetail() {
    const project = activeProjectId ? Store.getProject(activeProjectId) : null;
    if (!project) {
      if (editMode) renderWelcomeForm();
      else renderWelcomeView();
      return;
    }
    if (editMode) renderProjectForm(project);
    else renderProjectView(project);
  }

  /* ---------------- top bar ---------------- */
  const resumeBtn = document.getElementById("resumeBtn");
  const emailBtn = document.getElementById("emailBtn");
  const emailPopover = document.getElementById("emailPopover");
  const emailAddress = document.getElementById("emailAddress");
  const copyEmailBtn = document.getElementById("copyEmailBtn");
  const mailtoLink = document.getElementById("mailtoLink");

  function refreshTopBar() {
    const config = Store.getSiteConfig();
    resumeBtn.href = config.resumeUrl;
    emailAddress.textContent = config.contactEmail;
    mailtoLink.href = "mailto:" + config.contactEmail;
  }

  emailBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emailPopover.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!emailPopover.classList.contains("hidden") && !emailPopover.contains(e.target) && e.target !== emailBtn) {
      emailPopover.classList.add("hidden");
    }
  });
  copyEmailBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(Store.getSiteConfig().contactEmail);
      copyEmailBtn.textContent = "Copied!";
      window.setTimeout(() => (copyEmailBtn.textContent = "Copy"), 1500);
    } catch (err) {
      copyEmailBtn.textContent = "Select & copy";
    }
  });

  /* ---------------- edit mode toggle + toolbar ---------------- */
  const editModeBtn = document.getElementById("editModeBtn");
  const editModeLabel = document.getElementById("editModeLabel");
  const editToolbar = document.getElementById("editToolbar");
  const localEditsBadge = document.getElementById("localEditsBadge");
  const exportBtn = document.getElementById("exportBtn");
  const resetBtn = document.getElementById("resetBtn");

  function updateEditUI() {
    editModeBtn.classList.toggle("active", editMode);
    editModeLabel.textContent = editMode ? "Editing" : "Edit";
    editToolbar.classList.toggle("hidden", !editMode);
    localEditsBadge.classList.toggle("hidden", !Store.hasLocalEdits());
  }

  editModeBtn.addEventListener("click", () => {
    editMode = !editMode;
    try {
      localStorage.setItem("jsp_edit_mode", editMode ? "1" : "0");
    } catch (err) {
      /* ignore */
    }
    updateEditUI();
    renderSidebar();
    renderDetail();
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([Store.exportDataJs()], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  resetBtn.addEventListener("click", () => {
    confirmAction(
      "Discard all local edits in this browser and revert to the published data.js? This can't be undone.",
      "Reset"
    ).then((ok) => {
      if (!ok) return;
      Store.resetToDefaults();
      activeProjectId = null;
      renderSidebar();
      renderDetail();
      refreshTopBar();
      updateEditUI();
    });
  });

  /* ---------------- store subscription + initial render ---------------- */
  Store.subscribe(() => {
    renderSidebar();
    refreshTopBar();
    updateEditUI();
    if (!suppressDetailRerender) renderDetail();
  });

  renderSidebar();
  renderDetail();
  refreshTopBar();
  updateEditUI();
})();
