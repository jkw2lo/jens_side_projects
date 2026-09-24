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
  const welcomeLayer = document.getElementById("welcomeLayer");
  const welcomeCanvas = document.getElementById("welcomeCanvas");
  const projectOverlay = document.getElementById("projectOverlay");

  let activeProjectId = null;
  let currentSlide = 0;
  let editMode = false;
  try {
    editMode = localStorage.getItem("jsp_edit_mode") === "1";
  } catch (err) {
    /* ignore */
  }

  // Interactive controls (typing, dragging a slider/color, clicking a
  // toolbar button) commit straight to the store and update their own
  // element directly, then suppress the follow-on re-render — otherwise
  // every keystroke or drag tick would rebuild the DOM out from under
  // whatever the user is mid-interaction with (cursor, open popover...).
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

  /* ==========================================================================
     RICH TEXT: any content block (heading, intro, project fields, ...) can
     be clicked directly and typed into, with a floating toolbar for font,
     size, weight, italic, alignment, and color+opacity. A block with no
     override just inherits the site default — "Reset" clears back to that.
     ========================================================================== */
  function applyRichStyle(el, style) {
    style = style || {};
    const font = style.fontKey ? TEXT_FONT_OPTIONS.find((f) => f.key === style.fontKey) : null;
    el.style.fontFamily = font ? font.stack : "";
    el.style.fontSize = style.size ? style.size + "rem" : "";
    el.style.fontWeight = style.weight || "";
    el.style.fontStyle = style.italic ? "italic" : "";
    el.style.textAlign = style.align || "";
    el.style.color = style.color || "";
  }

  function setPlaintextEditable(el) {
    try {
      el.contentEditable = "plaintext-only";
    } catch (err) {
      /* ignore — fall through to the plain-true fallback below */
    }
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
  }

  function createRichText(opts) {
    const el = document.createElement(opts.tag || "p");
    if (opts.className) el.className = opts.className;
    el.textContent = opts.value || "";
    const style = opts.style || {};
    applyRichStyle(el, style);

    if (editMode) {
      el.classList.add("editable-text");
      if (!opts.value) el.classList.add("is-empty");
      if (opts.placeholder) el.dataset.placeholder = opts.placeholder;
      setPlaintextEditable(el);
      el.addEventListener("input", () => {
        el.classList.toggle("is-empty", !el.textContent);
        liveUpdate(() => opts.onInput(el.textContent));
      });
      el.addEventListener("focus", () => showFormatToolbar(el, style, opts.onStyle));
    }
    return el;
  }

  /* ---- floating format toolbar (one shared instance, repositioned) ---- */
  const formatToolbar = document.createElement("div");
  formatToolbar.className = "format-toolbar hidden";
  document.body.appendChild(formatToolbar);
  let activeRichEl = null;

  function hideFormatToolbar() {
    formatToolbar.classList.add("hidden");
    if (activeRichEl) activeRichEl.classList.remove("rich-active");
    activeRichEl = null;
  }

  function positionFormatToolbar(el) {
    const rect = el.getBoundingClientRect();
    const barRect = formatToolbar.getBoundingClientRect();
    let top = rect.top - barRect.height - 10;
    if (top < 8) top = Math.min(rect.bottom + 10, window.innerHeight - barRect.height - 8);
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - barRect.width - 8));
    formatToolbar.style.top = top + "px";
    formatToolbar.style.left = left + "px";
  }

  function getBaselineRem(el) {
    const px = parseFloat(getComputedStyle(el).fontSize) || 16;
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return Math.round((px / rootPx) * 20) / 20;
  }

  function showFormatToolbar(el, style, onStyle) {
    if (activeRichEl && activeRichEl !== el) activeRichEl.classList.remove("rich-active");
    activeRichEl = el;
    el.classList.add("rich-active");
    formatToolbar.innerHTML = "";
    formatToolbar.classList.remove("hidden");

    formatToolbar.appendChild(
      createFontPicker({
        options: TEXT_FONT_OPTIONS,
        value: style.fontKey || "",
        includeDefault: true,
        defaultLabel: "Default font",
        onChange: (key) => {
          liveUpdate(() => {
            style.fontKey = key || null;
            onStyle({ fontKey: style.fontKey });
          });
          applyRichStyle(el, style);
          positionFormatToolbar(el);
        },
      })
    );

    const sizeWrap = document.createElement("div");
    sizeWrap.className = "toolbar-size";
    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "toolbar-btn";
    minusBtn.textContent = "A−";
    minusBtn.title = "Smaller";
    const sizeLabel = document.createElement("span");
    sizeLabel.className = "toolbar-size-label";
    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "toolbar-btn";
    plusBtn.textContent = "A+";
    plusBtn.title = "Larger";
    let currentSize = style.size || getBaselineRem(el);
    function refreshSizeLabel() {
      sizeLabel.textContent = currentSize.toFixed(2) + "rem";
    }
    function setSize(next) {
      currentSize = Math.max(0.6, Math.min(8, Math.round(next * 20) / 20));
      liveUpdate(() => {
        style.size = currentSize;
        onStyle({ size: currentSize });
      });
      applyRichStyle(el, style);
      refreshSizeLabel();
      positionFormatToolbar(el);
    }
    minusBtn.addEventListener("click", () => setSize(currentSize - 0.1));
    plusBtn.addEventListener("click", () => setSize(currentSize + 0.1));
    refreshSizeLabel();
    sizeWrap.appendChild(minusBtn);
    sizeWrap.appendChild(sizeLabel);
    sizeWrap.appendChild(plusBtn);
    formatToolbar.appendChild(sizeWrap);

    const boldBtn = document.createElement("button");
    boldBtn.type = "button";
    boldBtn.className = "toolbar-btn toolbar-btn-bold" + (style.weight === "700" ? " active" : "");
    boldBtn.textContent = "B";
    boldBtn.title = "Bold";
    boldBtn.addEventListener("click", () => {
      liveUpdate(() => {
        style.weight = style.weight === "700" ? null : "700";
        onStyle({ weight: style.weight });
      });
      applyRichStyle(el, style);
      boldBtn.classList.toggle("active", style.weight === "700");
    });
    formatToolbar.appendChild(boldBtn);

    const italicBtn = document.createElement("button");
    italicBtn.type = "button";
    italicBtn.className = "toolbar-btn toolbar-btn-italic" + (style.italic ? " active" : "");
    italicBtn.textContent = "I";
    italicBtn.title = "Italic";
    italicBtn.addEventListener("click", () => {
      liveUpdate(() => {
        style.italic = !style.italic;
        onStyle({ italic: style.italic });
      });
      applyRichStyle(el, style);
      italicBtn.classList.toggle("active", style.italic);
    });
    formatToolbar.appendChild(italicBtn);

    const alignWrap = document.createElement("div");
    alignWrap.className = "toolbar-align";
    ["left", "center", "right"].forEach((a) => {
      const abtn = document.createElement("button");
      abtn.type = "button";
      abtn.className = "toolbar-btn" + (style.align === a ? " active" : "");
      abtn.textContent = a.charAt(0).toUpperCase();
      abtn.title = "Align " + a;
      abtn.addEventListener("click", () => {
        liveUpdate(() => {
          style.align = style.align === a ? null : a;
          onStyle({ align: style.align });
        });
        applyRichStyle(el, style);
        alignWrap.querySelectorAll(".toolbar-btn").forEach((b) => b.classList.remove("active"));
        if (style.align) abtn.classList.add("active");
      });
      alignWrap.appendChild(abtn);
    });
    formatToolbar.appendChild(alignWrap);

    formatToolbar.appendChild(
      createColorPicker({
        value: style.color || getComputedStyle(el).color,
        onChange: (rgba) => {
          liveUpdate(() => {
            style.color = rgba;
            onStyle({ color: rgba });
          });
          applyRichStyle(el, style);
        },
      })
    );

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "toolbar-reset";
    resetBtn.textContent = "Reset";
    resetBtn.title = "Reset formatting to default";
    resetBtn.addEventListener("click", () => {
      liveUpdate(() => {
        style.fontKey = null;
        style.size = null;
        style.weight = null;
        style.italic = false;
        style.align = null;
        style.color = null;
        onStyle({ fontKey: null, size: null, weight: null, italic: false, align: null, color: null });
      });
      applyRichStyle(el, style);
      showFormatToolbar(el, style, onStyle);
    });
    formatToolbar.appendChild(resetBtn);

    requestAnimationFrame(() => positionFormatToolbar(el));
  }

  document.addEventListener("mousedown", (e) => {
    if (!activeRichEl) return;
    if (formatToolbar.contains(e.target)) return;
    if (activeRichEl === e.target || activeRichEl.contains(e.target)) return;
    hideFormatToolbar();
  });

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
      overlay +
      '<div class="box-inner">' +
      '<div class="box-lid"></div>' +
      '<div class="box-label">' +
      '<span class="box-title"></span>' +
      '<span class="box-tagline"></span>' +
      "</div>" +
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
        const nameEl = projectOverlay.querySelector(".project-header h1");
        if (nameEl) {
          nameEl.focus();
          const range = document.createRange();
          range.selectNodeContents(nameEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
      projectListEl.appendChild(addBox);
    }
  }

  function selectProject(id) {
    if (id === activeProjectId) {
      // clicking the open project again closes it, back to the background
      activeProjectId = null;
    } else {
      activeProjectId = id;
      currentSlide = 0;
    }
    renderSidebar();
    renderDetail();
    projectOverlay.scrollTop = 0;
  }

  /* ==========================================================================
     WELCOME CANVAS: the "no project selected" area is a free-form slide —
     every block (text/image/container) has its own x/y/width/height (as a
     % of the canvas) and can be dragged, resized, and restyled independently.
     ========================================================================== */
  let selectedCanvasBlockId = null;

  function clampPct(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* ---- alignment guides: a fixed center + draggable custom lines, with
     blocks snapping to any of them while dragging/resizing ---- */
  const GUIDE_SNAP_THRESHOLD = 1.4; // percentage points

  function getSnapTargets(axis) {
    const guides = Store.getGuides();
    return [50].concat(axis === "v" ? guides.v : guides.h);
  }

  function snapValue(value, targets, threshold) {
    let result = value;
    let snappedTo = null;
    let bestDist = threshold;
    targets.forEach((t) => {
      const d = Math.abs(value - t);
      if (d < bestDist) {
        bestDist = d;
        result = t;
        snappedTo = t;
      }
    });
    return { value: result, snappedTo };
  }

  function highlightGuides(vValue, hValue) {
    welcomeCanvas.querySelectorAll(".canvas-guide.vertical").forEach((g) => {
      g.classList.toggle("snapped", vValue !== null && Math.abs(Number(g.dataset.value) - vValue) < 0.01);
    });
    welcomeCanvas.querySelectorAll(".canvas-guide.horizontal").forEach((g) => {
      g.classList.toggle("snapped", hValue !== null && Math.abs(Number(g.dataset.value) - hValue) < 0.01);
    });
  }

  function makeGuideDraggable(lineEl, axis, index) {
    lineEl.addEventListener("mousedown", (e) => {
      if (e.target.closest(".guide-remove-btn")) return;
      e.preventDefault();
      e.stopPropagation();
      const canvasRect = welcomeCanvas.getBoundingClientRect();
      let finalValue = Number(lineEl.dataset.value);
      function onMove(ev) {
        const pct =
          axis === "v"
            ? ((ev.clientX - canvasRect.left) / canvasRect.width) * 100
            : ((ev.clientY - canvasRect.top) / canvasRect.height) * 100;
        finalValue = clampPct(Math.round(pct * 10) / 10, 0, 100);
        lineEl.dataset.value = finalValue;
        if (axis === "v") lineEl.style.left = finalValue + "%";
        else lineEl.style.top = finalValue + "%";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        Store.updateGuide(axis, index, finalValue);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function makeGuideLine(axis, value, index) {
    const g = document.createElement("div");
    g.className = "canvas-guide " + (axis === "v" ? "vertical" : "horizontal") + " custom";
    g.dataset.value = value;
    if (axis === "v") g.style.left = value + "%";
    else g.style.top = value + "%";
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "guide-remove-btn";
    rm.textContent = "×";
    rm.title = "Remove guide";
    rm.addEventListener("click", (e) => {
      e.stopPropagation();
      Store.removeGuide(axis, index);
      renderDetail();
    });
    g.appendChild(rm);
    makeGuideDraggable(g, axis, index);
    return g;
  }

  function renderCanvasGuides() {
    const vCenter = document.createElement("div");
    vCenter.className = "canvas-guide vertical fixed";
    vCenter.dataset.value = "50";
    vCenter.style.left = "50%";
    welcomeCanvas.appendChild(vCenter);

    const hCenter = document.createElement("div");
    hCenter.className = "canvas-guide horizontal fixed";
    hCenter.dataset.value = "50";
    hCenter.style.top = "50%";
    welcomeCanvas.appendChild(hCenter);

    const guides = Store.getGuides();
    guides.v.forEach((value, index) => welcomeCanvas.appendChild(makeGuideLine("v", value, index)));
    guides.h.forEach((value, index) => welcomeCanvas.appendChild(makeGuideLine("h", value, index)));
  }

  function deselectCanvasBlock() {
    if (!selectedCanvasBlockId) return;
    const el = welcomeCanvas.querySelector('[data-block-id="' + selectedCanvasBlockId + '"]');
    if (el) el.classList.remove("selected");
    selectedCanvasBlockId = null;
  }

  function selectCanvasBlock(block, el) {
    if (selectedCanvasBlockId && selectedCanvasBlockId !== block.id) {
      const prev = welcomeCanvas.querySelector('[data-block-id="' + selectedCanvasBlockId + '"]');
      if (prev) prev.classList.remove("selected");
    }
    selectedCanvasBlockId = block.id;
    if (el) el.classList.add("selected");
    openBlockPanel(block.id);
  }

  function makeBlockDraggable(handleEl, blockEl, block) {
    handleEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvasRect = welcomeCanvas.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startX = block.x;
      const startY = block.y;
      let finalX = startX;
      let finalY = startY;
      function onMove(ev) {
        const dxPct = ((ev.clientX - startClientX) / canvasRect.width) * 100;
        const dyPct = ((ev.clientY - startClientY) / canvasRect.height) * 100;
        let x = clampPct(startX + dxPct, 0, 100 - block.width);
        let y = clampPct(startY + dyPct, 0, 95);

        const vTargets = getSnapTargets("v");
        const hTargets = getSnapTargets("h");
        const leftSnap = snapValue(x, vTargets, GUIDE_SNAP_THRESHOLD);
        let snappedV = leftSnap.snappedTo;
        if (snappedV !== null) {
          x = leftSnap.value;
        } else {
          const centerSnap = snapValue(x + block.width / 2, vTargets, GUIDE_SNAP_THRESHOLD);
          if (centerSnap.snappedTo !== null) {
            x = centerSnap.value - block.width / 2;
            snappedV = centerSnap.snappedTo;
          }
        }
        const topSnap = snapValue(y, hTargets, GUIDE_SNAP_THRESHOLD);
        const snappedH = topSnap.snappedTo;
        if (snappedH !== null) y = topSnap.value;

        finalX = x;
        finalY = y;
        blockEl.style.left = x + "%";
        blockEl.style.top = y + "%";
        highlightGuides(snappedV, snappedH);
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        highlightGuides(null, null);
        block.x = finalX;
        block.y = finalY;
        Store.updateAboutMeBlock(block.id, { x: finalX, y: finalY });
        if (selectedCanvasBlockId === block.id) openBlockPanel(block.id);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function makeBlockResizable(handleEl, blockEl, block, resizeHeight) {
    handleEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const canvasRect = welcomeCanvas.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startWidth = block.width;
      const startHeight = block.height || 15;
      let finalWidth = startWidth;
      let finalHeight = startHeight;
      function onMove(ev) {
        const dxPct = ((ev.clientX - startClientX) / canvasRect.width) * 100;
        let width = clampPct(startWidth + dxPct, 6, 100 - block.x);
        const rightSnap = snapValue(block.x + width, getSnapTargets("v"), GUIDE_SNAP_THRESHOLD);
        const snappedV = rightSnap.snappedTo;
        if (snappedV !== null) width = rightSnap.value - block.x;
        blockEl.style.width = width + "%";
        finalWidth = width;

        let snappedH = null;
        if (resizeHeight) {
          const dyPct = ((ev.clientY - startClientY) / canvasRect.height) * 100;
          let height = clampPct(startHeight + dyPct, 4, 100 - block.y);
          const bottomSnap = snapValue(block.y + height, getSnapTargets("h"), GUIDE_SNAP_THRESHOLD);
          snappedH = bottomSnap.snappedTo;
          if (snappedH !== null) height = bottomSnap.value - block.y;
          blockEl.style.height = height + "%";
          finalHeight = height;
        }
        highlightGuides(snappedV, snappedH);
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        highlightGuides(null, null);
        block.width = finalWidth;
        const patch = { width: finalWidth };
        if (resizeHeight) {
          block.height = finalHeight;
          patch.height = finalHeight;
        }
        Store.updateAboutMeBlock(block.id, patch);
        if (selectedCanvasBlockId === block.id) openBlockPanel(block.id);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function renderCanvasBlock(block) {
    const el = document.createElement("div");
    el.className = "canvas-block type-" + block.type + (editMode ? " editable-block" : "");
    if (block.id === selectedCanvasBlockId) el.classList.add("selected");
    el.dataset.blockId = block.id;
    el.style.left = block.x + "%";
    el.style.top = block.y + "%";
    el.style.width = block.width + "%";
    if (block.type !== "text") el.style.height = (block.height || 15) + "%";
    if (block.background) el.style.background = block.background;

    if (block.type === "text") {
      const textEl = document.createElement("div");
      textEl.className = "block-text";
      textEl.textContent = block.value || "";
      applyRichStyle(textEl, block.style || {});
      if (editMode) {
        textEl.classList.add("editable-text");
        if (!block.value) textEl.classList.add("is-empty");
        textEl.dataset.placeholder = "Type something...";
        setPlaintextEditable(textEl);
        textEl.addEventListener("input", () => {
          textEl.classList.toggle("is-empty", !textEl.textContent);
          liveUpdate(() => {
            block.value = textEl.textContent;
            Store.updateAboutMeBlock(block.id, { value: textEl.textContent });
          });
        });
        textEl.addEventListener("focus", () => selectCanvasBlock(block, el));
      }
      el.appendChild(textEl);
    } else if (block.type === "image") {
      if (block.src) {
        const img = document.createElement("img");
        img.className = "block-image";
        img.src = block.src;
        img.alt = "";
        el.appendChild(img);
      } else {
        const placeholder = document.createElement("label");
        placeholder.className = "block-image-placeholder";
        placeholder.textContent = editMode ? "Click to upload" : "";
        if (editMode) {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.addEventListener("change", () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              Store.updateAboutMeBlock(block.id, { src: reader.result });
              renderDetail();
            };
            reader.readAsDataURL(file);
          });
          placeholder.appendChild(input);
        }
        el.appendChild(placeholder);
      }
    }

    if (editMode) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectCanvasBlock(block, el);
      });

      const dragHandle = document.createElement("div");
      dragHandle.className = "block-drag-handle";
      dragHandle.title = "Drag to move";
      dragHandle.textContent = "✥";
      makeBlockDraggable(dragHandle, el, block);
      el.appendChild(dragHandle);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "block-resize-handle";
      resizeHandle.title = block.type === "text" ? "Drag to resize width" : "Drag to resize";
      makeBlockResizable(resizeHandle, el, block, block.type !== "text");
      el.appendChild(resizeHandle);
    }

    return el;
  }

  function renderWelcomeView() {
    welcomeCanvas.innerHTML = "";
    Store.getAboutMeBlocks().forEach((block) => {
      welcomeCanvas.appendChild(renderCanvasBlock(block));
    });
    if (editMode) renderCanvasGuides();
  }

  // Click empty canvas space to deselect — attached once, not per-render,
  // since welcomeCanvas itself is never replaced (only its children are).
  welcomeCanvas.addEventListener("click", (e) => {
    if (e.target !== welcomeCanvas) return;
    deselectCanvasBlock();
    if (panelMode === "block") closeDesignPanel();
  });

  // "+ Text / + Image / + Box / + V Guide / + H Guide" live in the fixed
  // bottom-right dock (index.html), not inside the canvas itself, so they
  // stay put regardless of scroll — wired once here, not per-render.
  const canvasAddBarEl = document.getElementById("canvasAddBar");
  canvasAddBarEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-add]");
    if (!btn) return;
    const type = btn.dataset.add;
    if (type === "v-guide") {
      Store.addGuide("v");
      renderDetail();
      return;
    }
    if (type === "h-guide") {
      Store.addGuide("h");
      renderDetail();
      return;
    }
    const id = Store.addAboutMeBlock(type);
    renderDetail();
    const newEl = welcomeCanvas.querySelector('[data-block-id="' + id + '"]');
    const newBlock = Store.getAboutMeBlocks().find((b) => b.id === id);
    if (newEl && newBlock) {
      selectCanvasBlock(newBlock, newEl);
      if (type === "text") {
        const textEl = newEl.querySelector(".block-text");
        if (textEl) {
          textEl.focus();
          const range = document.createRange();
          range.selectNodeContents(textEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  });

  /* ---------------- project overlay ---------------- */
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

  function wireSlideshowControls(project) {
    const prevBtn = projectOverlay.querySelector(".slide-nav.prev");
    const nextBtn = projectOverlay.querySelector(".slide-nav.next");
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
    projectOverlay.querySelectorAll(".slide-dots .dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        currentSlide = Number(dot.dataset.index);
        renderDetail();
      });
    });
  }

  function renderImageManager(project) {
    const wrap = document.createElement("div");
    wrap.className = "image-manager";

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

    const addCell = document.createElement("label");
    addCell.className = "thumb-add-cell";
    addCell.textContent = "+ Add";
    addCell.title = "Uploaded images embed as data in the page — for the final push, prefer committing real files to assets/images/ and using a path below.";
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
    addCell.appendChild(uploadInput);
    thumbGrid.appendChild(addCell);
    wrap.appendChild(thumbGrid);

    const addByPath = document.createElement("div");
    addByPath.className = "add-image-row";
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.placeholder = "or paste an image path/URL and press Enter";
    pathInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && pathInput.value.trim()) {
        Store.addImage(project.id, pathInput.value.trim());
        renderDetail();
      }
    });
    addByPath.appendChild(pathInput);
    wrap.appendChild(addByPath);

    return wrap;
  }

  function toggleLinkPopover(anchorEl, project) {
    const existing = document.querySelector(".link-popover");
    if (existing) {
      const wasForSame = existing.dataset.forId === project.id;
      existing.remove();
      if (wasForSame) return;
    }

    const pop = document.createElement("div");
    pop.className = "link-popover";
    pop.dataset.forId = project.id;
    const label = document.createElement("div");
    label.className = "field-hint";
    label.textContent = "Project link";
    const input = document.createElement("input");
    input.type = "text";
    input.value = project.link || "";
    input.placeholder = "https://...";
    function commit() {
      Store.updateProject(project.id, { link: input.value.trim() });
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        commit();
        pop.remove();
      }
      if (e.key === "Escape") pop.remove();
    });
    input.addEventListener("blur", () => {
      commit();
      window.setTimeout(() => pop.remove(), 150);
    });
    pop.appendChild(label);
    pop.appendChild(input);

    const rect = anchorEl.getBoundingClientRect();
    pop.style.position = "fixed";
    pop.style.top = rect.bottom + 8 + "px";
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 260)) + "px";
    document.body.appendChild(pop);
    input.focus();
    input.select();
  }

  function renderProjectView(project) {
    projectOverlay.innerHTML = "";
    const styles = project.styles || {};
    const wrap = document.createElement("div");
    wrap.className = "project-detail";

    const header = document.createElement("div");
    header.className = "project-header";
    header.appendChild(
      createRichText({
        tag: "h1",
        value: project.name,
        style: styles.name || {},
        placeholder: "Project name",
        onInput: (v) => Store.updateProject(project.id, { name: v }),
        onStyle: (patch) => Store.updateProjectStyle(project.id, "name", patch),
      })
    );

    const headerActions = document.createElement("div");
    headerActions.className = "project-header-actions";
    if (editMode) {
      const editLinkBtn = document.createElement("button");
      editLinkBtn.type = "button";
      editLinkBtn.className = "visit-btn";
      editLinkBtn.innerHTML = "Visit project &rarr;";
      editLinkBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLinkPopover(editLinkBtn, project);
      });
      headerActions.appendChild(editLinkBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-btn danger-icon-btn";
      delBtn.title = "Delete project";
      delBtn.setAttribute("aria-label", "Delete project");
      delBtn.innerHTML =
        '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0v9.5A1.5 1.5 0 0 1 12.5 17h-5A1.5 1.5 0 0 1 6 15.5V6h8Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>";
      delBtn.addEventListener("click", () => {
        confirmAction('Delete "' + project.name + '"? This can\'t be undone.').then((ok) => {
          if (!ok) return;
          activeProjectId = null;
          Store.deleteProject(project.id);
          renderSidebar();
          renderDetail();
        });
      });
      headerActions.appendChild(delBtn);
    } else {
      const visitBtn = document.createElement("a");
      visitBtn.className = "visit-btn";
      visitBtn.href = project.link || "#";
      visitBtn.target = "_blank";
      visitBtn.rel = "noopener";
      visitBtn.innerHTML = "Visit project &rarr;";
      headerActions.appendChild(visitBtn);
    }
    header.appendChild(headerActions);
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "project-body";

    const info = document.createElement("div");
    info.className = "info-column";

    const purposeH3 = document.createElement("h3");
    purposeH3.textContent = "Purpose";
    info.appendChild(purposeH3);
    info.appendChild(
      createRichText({
        tag: "p",
        value: project.purpose,
        style: styles.purpose || {},
        placeholder: "Why you built this, what problem it solves...",
        onInput: (v) => Store.updateProject(project.id, { purpose: v }),
        onStyle: (patch) => Store.updateProjectStyle(project.id, "purpose", patch),
      })
    );

    const audienceH3 = document.createElement("h3");
    audienceH3.textContent = "Who it's for";
    info.appendChild(audienceH3);
    info.appendChild(
      createRichText({
        tag: "p",
        value: project.audience,
        style: styles.audience || {},
        placeholder: "Who this is for...",
        onInput: (v) => Store.updateProject(project.id, { audience: v }),
        onStyle: (patch) => Store.updateProjectStyle(project.id, "audience", patch),
      })
    );

    const featuresH3 = document.createElement("h3");
    featuresH3.textContent = "Key features";
    info.appendChild(featuresH3);
    const featuresList = document.createElement("ul");
    featuresList.className = "features-list";
    (project.features || []).forEach((feat, idx) => {
      const li = document.createElement("li");
      const textEl = document.createElement("span");
      textEl.textContent = feat;
      li.appendChild(textEl);
      if (editMode) {
        setPlaintextEditable(textEl);
        textEl.classList.add("editable-text", "editable-inline");
        textEl.addEventListener("input", () => liveUpdate(() => Store.updateFeature(project.id, idx, textEl.textContent)));
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "feature-remove-btn";
        rm.textContent = "×";
        rm.title = "Remove feature";
        rm.addEventListener("click", () => {
          Store.removeFeature(project.id, idx);
          renderDetail();
        });
        li.appendChild(rm);
      }
      featuresList.appendChild(li);
    });
    info.appendChild(featuresList);
    if (editMode) {
      const addFeatureBtn = document.createElement("button");
      addFeatureBtn.type = "button";
      addFeatureBtn.className = "add-row-btn";
      addFeatureBtn.textContent = "+ Add feature";
      addFeatureBtn.addEventListener("click", () => {
        Store.addFeature(project.id);
        renderDetail();
      });
      info.appendChild(addFeatureBtn);
    }
    body.appendChild(info);

    const mediaColumn = document.createElement("div");
    mediaColumn.className = "media-column";
    mediaColumn.innerHTML = renderSlideshowView(project);
    if (editMode) mediaColumn.appendChild(renderImageManager(project));
    body.appendChild(mediaColumn);

    wrap.appendChild(body);

    const personalWrap = document.createElement("div");
    personalWrap.className = "personal-note";
    const personalTitle = document.createElement("h3");
    personalTitle.textContent = "From me";
    personalWrap.appendChild(personalTitle);
    personalWrap.appendChild(
      createRichText({
        tag: "p",
        value: project.personal,
        style: styles.personal || {},
        placeholder: "How you've actually used this, what you learned building it...",
        onInput: (v) => Store.updateProject(project.id, { personal: v }),
        onStyle: (patch) => Store.updateProjectStyle(project.id, "personal", patch),
      })
    );
    wrap.appendChild(personalWrap);

    projectOverlay.appendChild(wrap);
    wireSlideshowControls(project);
  }

  /* ---------------- detail dispatch ---------------- */
  function renderDetail() {
    renderWelcomeView();
    const project = activeProjectId ? Store.getProject(activeProjectId) : null;
    if (project) {
      renderProjectView(project);
      projectOverlay.classList.add("open");
    } else {
      projectOverlay.classList.remove("open");
    }
    hideFormatToolbar();
    // the canvas add-bar only makes sense while looking at the welcome
    // canvas itself, not while a project overlay is open on top of it
    canvasAddBarEl.classList.toggle("hidden", !editMode || !!project);
  }

  /* ---------------- top bar / branding / theme ---------------- */
  const resumeBtn = document.getElementById("resumeBtn");
  const emailBtn = document.getElementById("emailBtn");
  const emailPopover = document.getElementById("emailPopover");
  const emailAddress = document.getElementById("emailAddress");
  const copyEmailBtn = document.getElementById("copyEmailBtn");
  const mailtoLink = document.getElementById("mailtoLink");
  const doorTitleEl = document.getElementById("doorTitleText");

  const copyIcon = copyEmailBtn.innerHTML;
  const checkIcon =
    '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  function refreshChrome() {
    const config = Store.getSiteConfig();
    resumeBtn.href = config.resumeUrl;
    emailAddress.textContent = config.contactEmail;
    mailtoLink.href = "mailto:" + config.contactEmail;
    if (doorTitleEl) doorTitleEl.textContent = config.brandText || "Jen's Side Projects";
    applyTheme(config.theme);
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
      copyEmailBtn.innerHTML = checkIcon;
      copyEmailBtn.classList.add("copied");
      window.setTimeout(() => {
        copyEmailBtn.innerHTML = copyIcon;
        copyEmailBtn.classList.remove("copied");
      }, 1500);
    } catch (err) {
      showToast("Couldn't copy — select the address manually.");
    }
  });

  /* ==========================================================================
     DESIGN PANEL: global settings (header, resume, contact, site font,
     colors, door title style, content position, background image) live
     here in a slide-out inspector, separate from on-canvas content editing.
     ========================================================================== */
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

  function rangeField(label, value, min, max, step, suffix, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const span = document.createElement("span");
    span.className = "field-label";
    span.textContent = label;
    wrap.appendChild(span);

    const row = document.createElement("div");
    row.className = "range-row";
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    const valueLabel = document.createElement("span");
    valueLabel.className = "range-value";
    valueLabel.textContent = value + suffix;
    input.addEventListener("input", () => {
      valueLabel.textContent = input.value + suffix;
      liveUpdate(() => onChange(Number(input.value)));
    });
    row.appendChild(input);
    row.appendChild(valueLabel);
    wrap.appendChild(row);
    return wrap;
  }

  function labeledField(label, controlEl) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const span = document.createElement("span");
    span.className = "field-label";
    span.textContent = label;
    wrap.appendChild(span);
    wrap.appendChild(controlEl);
    return wrap;
  }

  function fileRow(label, dataUrl, accept, onUpload, onRemove) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const span = document.createElement("span");
    span.className = "field-label";
    span.textContent = label;
    wrap.appendChild(span);

    if (accept.indexOf("image") === 0 && dataUrl) {
      const preview = document.createElement("div");
      preview.className = "bg-preview";
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "row-remove-btn";
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        onRemove();
        renderPanelContent();
      });
      preview.appendChild(img);
      preview.appendChild(rm);
      wrap.appendChild(preview);
    } else if (dataUrl && dataUrl.indexOf("data:") === 0) {
      const approxKb = Math.round((dataUrl.length * 3) / 4 / 1024);
      const chip = document.createElement("div");
      chip.className = "file-chip";
      const text = document.createElement("span");
      text.textContent = "Uploaded file (~" + approxKb + " KB)";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "row-remove-btn";
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        onRemove();
        renderPanelContent();
      });
      chip.appendChild(text);
      chip.appendChild(rm);
      wrap.appendChild(chip);
    }

    const isUploaded = dataUrl && dataUrl.indexOf("data:") === 0;
    const uploadLabel = document.createElement("label");
    uploadLabel.className = "upload-label";
    uploadLabel.textContent = isUploaded ? "Replace file" : "Upload a file";
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = accept;
    uploadInput.addEventListener("change", () => {
      const file = uploadInput.files && uploadInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onUpload(reader.result);
        renderPanelContent();
      };
      reader.readAsDataURL(file);
    });
    uploadLabel.appendChild(uploadInput);
    wrap.appendChild(uploadLabel);

    return wrap;
  }

  const COLOR_FIELDS = [
    ["accent", "Accent / buttons"],
    ["door", "Garage door"],
    ["wall", "Wall"],
    ["floor", "Floor"],
    ["box", "Project boxes"],
    ["featuredBox", "Featured boxes"],
    ["panel", "Detail panel"],
  ];

  const designPanel = document.getElementById("designPanel");
  const designPanelTitle = document.getElementById("designPanelTitle");
  const designPanelContent = document.getElementById("designPanelContent");
  const designPanelScrim = document.getElementById("designPanelScrim");
  const designBtn = document.getElementById("designBtn");
  const closeDesignPanelBtn = document.getElementById("closeDesignPanel");
  let panelMode = "design"; // "design" | "block"

  function sectionTitle(text) {
    const h = document.createElement("h3");
    h.className = "form-section-title";
    h.textContent = text;
    return h;
  }
  function hint(text) {
    const p = document.createElement("p");
    p.className = "field-hint";
    p.style.marginBottom = "10px";
    p.textContent = text;
    return p;
  }

  function renderDesignPanel() {
    const config = Store.getSiteConfig();
    const theme = config.theme;
    const headline = theme.headline || {};
    designPanelContent.innerHTML = "";

    designPanelContent.appendChild(sectionTitle("Header"));
    designPanelContent.appendChild(textField("Header / door title", config.brandText, (v) => Store.updateSiteConfig({ brandText: v })));
    designPanelContent.appendChild(hint("Shown top-left on every page, and on the garage door in the intro."));

    designPanelContent.appendChild(sectionTitle("Resume & contact"));
    designPanelContent.appendChild(
      fileRow("Resume", config.resumeUrl, ".pdf,.doc,.docx", (v) => Store.updateSiteConfig({ resumeUrl: v }), () => Store.updateSiteConfig({ resumeUrl: "" }))
    );
    if (!config.resumeUrl || config.resumeUrl.indexOf("data:") !== 0) {
      designPanelContent.appendChild(textField("...or a path/URL", config.resumeUrl, (v) => Store.updateSiteConfig({ resumeUrl: v }), { placeholder: "assets/resume/resume.pdf" }));
    }
    designPanelContent.appendChild(textField("Contact email", config.contactEmail, (v) => Store.updateSiteConfig({ contactEmail: v })));

    designPanelContent.appendChild(sectionTitle("Site font"));
    designPanelContent.appendChild(hint("The default for content blocks — any block can still override this individually from its own toolbar."));
    designPanelContent.appendChild(
      labeledField(
        "Font",
        createFontPicker({
          options: FONT_OPTIONS,
          value: theme.fontKey,
          onChange: (v) => liveUpdate(() => Store.updateTheme({ fontKey: v })),
        })
      )
    );

    designPanelContent.appendChild(sectionTitle("Colors"));
    const colorGrid = document.createElement("div");
    colorGrid.className = "color-grid";
    COLOR_FIELDS.forEach(([key, label]) => {
      colorGrid.appendChild(
        labeledField(
          label,
          createColorPicker({ value: theme.colors[key], onChange: (v) => liveUpdate(() => Store.updateThemeColor(key, v)) })
        )
      );
    });
    designPanelContent.appendChild(colorGrid);

    designPanelContent.appendChild(sectionTitle("Project box style"));
    const boxStyleRow = document.createElement("div");
    boxStyleRow.className = "box-style-row";
    BOX_STYLES.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "box-style-btn" + ((theme.boxStyle || "banker") === s.key ? " active" : "");
      btn.innerHTML = '<span class="box-style-icon">' + s.icon + "</span>" + s.label;
      btn.addEventListener("click", () => {
        liveUpdate(() => Store.updateTheme({ boxStyle: s.key }));
        boxStyleRow.querySelectorAll(".box-style-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
      boxStyleRow.appendChild(btn);
    });
    designPanelContent.appendChild(boxStyleRow);

    designPanelContent.appendChild(sectionTitle("Door title style"));
    designPanelContent.appendChild(hint("The big text on the garage door — handwriting, spray-paint, poster, and more."));
    designPanelContent.appendChild(
      labeledField(
        "Font",
        createFontPicker({
          options: HEADLINE_FONT_OPTIONS,
          value: headline.fontKey,
          onChange: (v) => liveUpdate(() => Store.updateHeadline({ fontKey: v })),
        })
      )
    );
    designPanelContent.appendChild(rangeField("Size", headline.size || 4, 1.5, 9, 0.25, "rem", (v) => Store.updateHeadline({ size: v })));
    designPanelContent.appendChild(rangeField("Angle", headline.rotate || 0, -20, 20, 1, "°", (v) => Store.updateHeadline({ rotate: v })));
    designPanelContent.appendChild(
      labeledField(
        "Color",
        createColorPicker({ value: headline.color || "#24262a", onChange: (v) => liveUpdate(() => Store.updateHeadline({ color: v })) })
      )
    );

    designPanelContent.appendChild(sectionTitle("Background"));
    designPanelContent.appendChild(
      fileRow("Custom background image", theme.backgroundImage, "image/*", (v) => Store.updateTheme({ backgroundImage: v }), () => Store.updateTheme({ backgroundImage: "" }))
    );

    const resetAppearanceBtn = document.createElement("button");
    resetAppearanceBtn.type = "button";
    resetAppearanceBtn.className = "add-row-btn";
    resetAppearanceBtn.textContent = "Reset appearance to default";
    resetAppearanceBtn.addEventListener("click", () => {
      Store.resetTheme();
      renderDesignPanel();
    });
    designPanelContent.appendChild(resetAppearanceBtn);
  }

  /* ---- block inspector: same slide-out panel, contextual content ---- */
  const BLOCK_TYPE_LABELS = { text: "Text block", image: "Image block", container: "Box" };

  function renderBlockPanel(block) {
    designPanelContent.innerHTML = "";

    const typeBadge = document.createElement("p");
    typeBadge.className = "field-hint";
    typeBadge.style.marginBottom = "12px";
    typeBadge.textContent = BLOCK_TYPE_LABELS[block.type] || block.type;
    designPanelContent.appendChild(typeBadge);

    designPanelContent.appendChild(sectionTitle("Position & size"));
    designPanelContent.appendChild(hint("Drag a block by its ✥ handle, or set exact percentages here."));
    const posGrid = document.createElement("div");
    posGrid.className = "color-grid";
    const numField = (label, value, key) => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.max = 100;
      input.step = 1;
      input.value = Math.round(value);
      input.addEventListener("change", () => {
        Store.updateAboutMeBlock(block.id, { [key]: clampPct(Number(input.value) || 0, 0, 100) });
        renderDetail();
        renderBlockPanel(Store.getAboutMeBlocks().find((b) => b.id === block.id));
      });
      return labeledField(label, input);
    };
    posGrid.appendChild(numField("X %", block.x, "x"));
    posGrid.appendChild(numField("Y %", block.y, "y"));
    posGrid.appendChild(numField("Width %", block.width, "width"));
    if (block.type !== "text") {
      posGrid.appendChild(numField("Height %", block.height || 15, "height"));
    }
    designPanelContent.appendChild(posGrid);

    if (block.type === "text") {
      designPanelContent.appendChild(sectionTitle("Text style"));
      const style = block.style || {};
      // style changes apply straight to the live block element (like the
      // project-field toolbar does) instead of rebuilding the whole canvas,
      // so there's no flicker and no risk of losing mid-edit focus.
      function liveApply(patch) {
        liveUpdate(() => {
          Object.assign(style, patch);
          Store.updateAboutMeBlockStyle(block.id, patch);
        });
        const textEl = welcomeCanvas.querySelector('[data-block-id="' + block.id + '"] .block-text');
        if (textEl) applyRichStyle(textEl, style);
      }
      designPanelContent.appendChild(
        labeledField(
          "Font",
          createFontPicker({
            options: TEXT_FONT_OPTIONS,
            value: style.fontKey || "",
            includeDefault: true,
            defaultLabel: "Default font",
            onChange: (v) => liveApply({ fontKey: v || null }),
          })
        )
      );
      const styleRow = document.createElement("div");
      styleRow.className = "toolbar-align";
      styleRow.style.marginBottom = "14px";
      const boldBtn = document.createElement("button");
      boldBtn.type = "button";
      boldBtn.className = "toolbar-btn" + (style.weight === "700" ? " active" : "");
      boldBtn.textContent = "B";
      boldBtn.addEventListener("click", () => {
        liveApply({ weight: style.weight === "700" ? null : "700" });
        boldBtn.classList.toggle("active", style.weight === "700");
      });
      const italicBtn = document.createElement("button");
      italicBtn.type = "button";
      italicBtn.className = "toolbar-btn" + (style.italic ? " active" : "");
      italicBtn.textContent = "I";
      italicBtn.addEventListener("click", () => {
        liveApply({ italic: !style.italic });
        italicBtn.classList.toggle("active", style.italic);
      });
      styleRow.appendChild(boldBtn);
      styleRow.appendChild(italicBtn);
      ["left", "center", "right"].forEach((a) => {
        const abtn = document.createElement("button");
        abtn.type = "button";
        abtn.className = "toolbar-btn" + (style.align === a ? " active" : "");
        abtn.textContent = a.charAt(0).toUpperCase();
        abtn.addEventListener("click", () => {
          liveApply({ align: style.align === a ? null : a });
          styleRow.querySelectorAll(".toolbar-btn").forEach((b) => b.classList.remove("active"));
          if (style.align) abtn.classList.add("active");
        });
        styleRow.appendChild(abtn);
      });
      designPanelContent.appendChild(styleRow);
      designPanelContent.appendChild(
        labeledField("Size", rangeFieldInner(style.size || 1, 0.6, 6, 0.1, "rem", (v) => liveApply({ size: v })))
      );
      designPanelContent.appendChild(
        labeledField(
          "Color",
          createColorPicker({
            value: style.color || "#2c2c2e",
            onChange: (v) => liveApply({ color: v }),
          })
        )
      );
    }

    if (block.type === "image") {
      designPanelContent.appendChild(sectionTitle("Image"));
      designPanelContent.appendChild(
        fileRow(
          "Image",
          block.src,
          "image/*",
          (v) => Store.updateAboutMeBlock(block.id, { src: v }),
          () => Store.updateAboutMeBlock(block.id, { src: "" })
        )
      );
    }

    designPanelContent.appendChild(sectionTitle("Background"));
    const bgRow = document.createElement("div");
    bgRow.className = "color-grid";
    bgRow.appendChild(
      labeledField(
        "Fill",
        createColorPicker({
          value: block.background || "rgba(255,255,255,0)",
          onChange: (v) => {
            liveUpdate(() => {
              block.background = v;
              Store.updateAboutMeBlock(block.id, { background: v });
            });
            const blockEl = welcomeCanvas.querySelector('[data-block-id="' + block.id + '"]');
            if (blockEl) blockEl.style.background = v;
          },
        })
      )
    );
    const noBgBtn = document.createElement("button");
    noBgBtn.type = "button";
    noBgBtn.className = "add-row-btn";
    noBgBtn.textContent = "No background";
    noBgBtn.addEventListener("click", () => {
      Store.updateAboutMeBlock(block.id, { background: null });
      renderDetail();
      renderBlockPanel(Store.getAboutMeBlocks().find((b) => b.id === block.id));
    });
    designPanelContent.appendChild(bgRow);
    designPanelContent.appendChild(noBgBtn);

    designPanelContent.appendChild(sectionTitle("Layer"));
    const layerRow = document.createElement("div");
    layerRow.className = "edit-toolbar-actions";
    const frontBtn = document.createElement("button");
    frontBtn.type = "button";
    frontBtn.textContent = "Bring to front";
    frontBtn.addEventListener("click", () => { Store.moveAboutMeBlockToFront(block.id); renderDetail(); });
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.textContent = "Send to back";
    backBtn.addEventListener("click", () => { Store.moveAboutMeBlockToBack(block.id); renderDetail(); });
    layerRow.appendChild(frontBtn);
    layerRow.appendChild(backBtn);
    designPanelContent.appendChild(layerRow);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.style.marginTop = "18px";
    deleteBtn.textContent = "Delete block";
    deleteBtn.addEventListener("click", () => {
      confirmAction("Delete this block? This can't be undone.").then((ok) => {
        if (!ok) return;
        Store.deleteAboutMeBlock(block.id);
        closeDesignPanel();
        renderDetail();
      });
    });
    designPanelContent.appendChild(deleteBtn);
  }

  function rangeFieldInner(value, min, max, step, suffix, onChange) {
    const row = document.createElement("div");
    row.className = "range-row";
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    const valueLabel = document.createElement("span");
    valueLabel.className = "range-value";
    valueLabel.textContent = value.toFixed(2) + suffix;
    input.addEventListener("input", () => {
      valueLabel.textContent = Number(input.value).toFixed(2) + suffix;
      onChange(Number(input.value));
    });
    row.appendChild(input);
    row.appendChild(valueLabel);
    return row;
  }

  function renderPanelContent() {
    if (designPanel.classList.contains("hidden")) return;
    if (panelMode === "block") {
      const block = Store.getAboutMeBlocks().find((b) => b.id === selectedCanvasBlockId);
      if (block) {
        renderBlockPanel(block);
        return;
      }
      // the selected block was deleted elsewhere — fall back to Design
      panelMode = "design";
      designPanelTitle.textContent = "Design";
      selectedCanvasBlockId = null;
    }
    renderDesignPanel();
  }

  function openDesignPanel() {
    panelMode = "design";
    deselectCanvasBlock();
    designPanelTitle.textContent = "Design";
    designPanel.classList.remove("hidden");
    designPanel.setAttribute("aria-hidden", "false");
    designPanelScrim.classList.remove("hidden");
    renderPanelContent();
  }
  function openBlockPanel(id) {
    panelMode = "block";
    designPanelTitle.textContent = "Block";
    designPanel.classList.remove("hidden");
    designPanel.setAttribute("aria-hidden", "false");
    designPanelScrim.classList.remove("hidden");
    renderPanelContent();
  }
  function closeDesignPanel() {
    designPanel.classList.add("hidden");
    designPanel.setAttribute("aria-hidden", "true");
    designPanelScrim.classList.add("hidden");
    if (panelMode === "block") {
      deselectCanvasBlock();
      panelMode = "design";
    }
  }
  designBtn.addEventListener("click", openDesignPanel);
  closeDesignPanelBtn.addEventListener("click", closeDesignPanel);
  designPanelScrim.addEventListener("click", closeDesignPanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !designPanel.classList.contains("hidden")) closeDesignPanel();
  });

  /* ---------------- edit mode toggle + toolbar ---------------- */
  const editModeBtn = document.getElementById("editModeBtn");
  const editModeLabel = document.getElementById("editModeLabel");
  const editDock = document.getElementById("editDock");
  const localEditsBadge = document.getElementById("localEditsBadge");
  const exportBtn = document.getElementById("exportBtn");
  const resetBtn = document.getElementById("resetBtn");

  function updateEditUI() {
    editModeBtn.classList.toggle("active", editMode);
    editModeLabel.textContent = editMode ? "Editing" : "Edit";
    editDock.classList.toggle("hidden", !editMode);
    localEditsBadge.classList.toggle("hidden", !Store.hasLocalEdits());
  }

  editModeBtn.addEventListener("click", () => {
    editMode = !editMode;
    try {
      localStorage.setItem("jsp_edit_mode", editMode ? "1" : "0");
    } catch (err) {
      /* ignore */
    }
    if (!editMode) closeDesignPanel();
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
      closeDesignPanel();
      renderSidebar();
      renderDetail();
      refreshChrome();
      updateEditUI();
    });
  });

  /* ---------------- store subscription + initial render ---------------- */
  Store.subscribe(() => {
    renderSidebar();
    refreshChrome();
    updateEditUI();
    if (!suppressDetailRerender) {
      renderDetail();
      renderPanelContent();
    }
  });

  renderSidebar();
  renderDetail();
  refreshChrome();
  updateEditUI();
})();
