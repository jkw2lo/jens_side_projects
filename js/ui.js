/* ==========================================================================
   Reusable editor UI components: a font picker that previews each option
   in its own real typeface, a color picker with an opacity slider, and a
   3x3 position grid. Used by both the Design panel and the per-block
   format toolbar in js/app.js.
   ========================================================================== */

/* ---------------- color helpers (hex <-> rgba, with alpha) ---------------- */
function parseColorToHexAlpha(value) {
  if (!value) return { hex: "#000000", alpha: 1 };
  value = String(value).trim();
  if (value[0] === "#") {
    if (value.length === 9) {
      return { hex: value.slice(0, 7), alpha: Math.round((parseInt(value.slice(7, 9), 16) / 255) * 100) / 100 };
    }
    if (value.length === 7) return { hex: value, alpha: 1 };
  }
  const m = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)/i);
  if (m) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");
    const hex = "#" + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
    const alpha = m[4] !== undefined ? Math.round(Number(m[4]) * 100) / 100 : 1;
    return { hex, alpha };
  }
  return { hex: "#000000", alpha: 1 };
}

function hexAlphaToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + Math.round(alpha * 100) / 100 + ")";
}

/* ---------------- font picker (real preview per option) ---------------- */
function createFontPicker(opts) {
  ensureFontPreviewsLoaded();
  const options = opts.options;
  let value = opts.value || "";
  const includeDefault = !!opts.includeDefault;
  const defaultLabel = opts.defaultLabel || "Default";
  const onChange = opts.onChange;

  const allOptions = includeDefault ? [{ key: "", label: defaultLabel, stack: null }].concat(options) : options;

  const wrap = document.createElement("div");
  wrap.className = "font-picker";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "font-picker-btn";
  const menu = document.createElement("div");
  menu.className = "font-picker-menu hidden";

  function findOption() {
    return allOptions.find((o) => o.key === value) || allOptions[0];
  }

  function renderButton() {
    const opt = findOption();
    btn.textContent = opt.label;
    btn.style.fontFamily = opt.stack || "";
  }

  function closeMenu() {
    menu.classList.add("hidden");
    document.removeEventListener("mousedown", onDocDown, true);
  }
  function onDocDown(e) {
    if (!wrap.contains(e.target)) closeMenu();
  }
  function renderMenu() {
    menu.innerHTML = "";
    allOptions.forEach((opt) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "font-picker-item" + (opt.key === value ? " active" : "");
      item.textContent = opt.label;
      item.style.fontFamily = opt.stack || "";
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        value = opt.key;
        onChange(opt.key);
        renderButton();
        closeMenu();
      });
      menu.appendChild(item);
    });
  }
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.classList.contains("hidden")) {
      renderMenu();
      menu.classList.remove("hidden");
      document.addEventListener("mousedown", onDocDown, true);
    } else {
      closeMenu();
    }
  });

  renderButton();
  wrap.appendChild(btn);
  wrap.appendChild(menu);
  return wrap;
}

/* ---------------- color + opacity picker ---------------- */
function createColorPicker(opts) {
  const onChange = opts.onChange;
  let { hex, alpha } = parseColorToHexAlpha(opts.value);

  const wrap = document.createElement("div");
  wrap.className = "color-picker";

  const swatchBtn = document.createElement("button");
  swatchBtn.type = "button";
  swatchBtn.className = "color-swatch-btn";
  swatchBtn.title = "Color";
  const swatchInner = document.createElement("span");
  swatchInner.className = "color-swatch-inner";
  swatchBtn.appendChild(swatchInner);

  const popover = document.createElement("div");
  popover.className = "color-popover hidden";

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = hex;
  colorInput.className = "color-popover-input";

  const alphaRow = document.createElement("div");
  alphaRow.className = "range-row";
  const alphaInput = document.createElement("input");
  alphaInput.type = "range";
  alphaInput.min = 0;
  alphaInput.max = 100;
  alphaInput.value = Math.round(alpha * 100);
  const alphaLabel = document.createElement("span");
  alphaLabel.className = "range-value";
  alphaLabel.textContent = Math.round(alpha * 100) + "%";

  function updateSwatch() {
    swatchInner.style.background = hexAlphaToRgba(hex, alpha);
  }
  function commit() {
    onChange(hexAlphaToRgba(hex, alpha));
  }
  colorInput.addEventListener("input", () => {
    hex = colorInput.value;
    updateSwatch();
    commit();
  });
  alphaInput.addEventListener("input", () => {
    alpha = Number(alphaInput.value) / 100;
    alphaLabel.textContent = alphaInput.value + "%";
    updateSwatch();
    commit();
  });

  function closePopover() {
    popover.classList.add("hidden");
    document.removeEventListener("mousedown", onDocDown, true);
  }
  function onDocDown(e) {
    if (!wrap.contains(e.target)) closePopover();
  }
  swatchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (popover.classList.contains("hidden")) {
      popover.classList.remove("hidden");
      document.addEventListener("mousedown", onDocDown, true);
    } else {
      closePopover();
    }
  });

  const opacityLabel = document.createElement("div");
  opacityLabel.className = "field-hint";
  opacityLabel.textContent = "Opacity";
  alphaRow.appendChild(alphaInput);
  alphaRow.appendChild(alphaLabel);
  popover.appendChild(colorInput);
  popover.appendChild(opacityLabel);
  popover.appendChild(alphaRow);

  updateSwatch();
  wrap.appendChild(swatchBtn);
  wrap.appendChild(popover);
  return wrap;
}
