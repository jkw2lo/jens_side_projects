/* ==========================================================================
   Theme: font catalogue + applying SITE_CONFIG.theme to the live page via
   CSS custom properties. Fonts load from Google Fonts on demand.
   ========================================================================== */

const DEFAULT_THEME_COLORS = {
  accent: "#f4b942",
  door: "#a7aab0",
  wall: "#55585e",
  floor: "#34363a",
  box: "#90949c",
  featuredBox: "#9a9e6d",
  panel: "#e6e4dc",
};

const FONT_OPTIONS = [
  {
    key: "system",
    label: "System Default",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    googleFont: null,
  },
  { key: "inter", label: "Inter", stack: '"Inter", sans-serif', googleFont: "Inter:wght@400;600;700;800" },
  { key: "poppins", label: "Poppins", stack: '"Poppins", sans-serif', googleFont: "Poppins:wght@400;500;600;700;800" },
  { key: "space-grotesk", label: "Space Grotesk", stack: '"Space Grotesk", sans-serif', googleFont: "Space+Grotesk:wght@400;500;600;700" },
  { key: "playfair", label: "Playfair Display", stack: '"Playfair Display", Georgia, serif', googleFont: "Playfair+Display:wght@400;600;700;800" },
  { key: "jetbrains", label: "JetBrains Mono", stack: '"JetBrains Mono", monospace', googleFont: "JetBrains+Mono:wght@400;500;600;700" },
  { key: "bebas", label: "Bebas Neue", stack: '"Bebas Neue", sans-serif', googleFont: "Bebas+Neue" },
];

function applyTheme(theme) {
  theme = theme || {};
  const colors = Object.assign({}, DEFAULT_THEME_COLORS, theme.colors || {});
  const root = document.documentElement.style;
  root.setProperty("--accent-color", colors.accent);
  root.setProperty("--door-color", colors.door);
  root.setProperty("--wall-color", colors.wall);
  root.setProperty("--floor-color", colors.floor);
  root.setProperty("--box-color", colors.box);
  root.setProperty("--featured-box-color", colors.featuredBox);
  root.setProperty("--panel-color", colors.panel);

  const font = FONT_OPTIONS.find((f) => f.key === theme.fontKey) || FONT_OPTIONS[0];
  root.setProperty("--font-family", font.stack);

  let link = document.getElementById("googleFontLink");
  if (font.googleFont) {
    const href = "https://fonts.googleapis.com/css2?family=" + font.googleFont + "&display=swap";
    if (!link) {
      link = document.createElement("link");
      link.id = "googleFontLink";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  } else if (link) {
    link.remove();
  }

  const bgEl = document.getElementById("garageBg");
  if (bgEl) {
    if (theme.backgroundImage) {
      bgEl.style.backgroundImage = 'url("' + theme.backgroundImage + '")';
      bgEl.classList.add("has-custom-image");
    } else {
      bgEl.style.backgroundImage = "";
      bgEl.classList.remove("has-custom-image");
    }
  }
}
