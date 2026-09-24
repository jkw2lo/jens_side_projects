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

// A wider, more playful catalogue for the door/headline text specifically.
const HEADLINE_FONT_OPTIONS = [
  { key: "bebas", label: "Bebas Neue — Bold Poster", stack: '"Bebas Neue", sans-serif', googleFont: "Bebas+Neue" },
  { key: "anton", label: "Anton — Heavy Poster", stack: '"Anton", sans-serif', googleFont: "Anton" },
  { key: "staatliches", label: "Staatliches — Industrial", stack: '"Staatliches", sans-serif', googleFont: "Staatliches" },
  { key: "special-elite", label: "Special Elite — Typewriter", stack: '"Special Elite", monospace', googleFont: "Special+Elite" },
  { key: "permanent-marker", label: "Permanent Marker — Handwriting", stack: '"Permanent Marker", cursive', googleFont: "Permanent+Marker" },
  { key: "caveat", label: "Caveat — Handwriting", stack: '"Caveat", cursive', googleFont: "Caveat:wght@600;700" },
  { key: "kalam", label: "Kalam — Handwriting", stack: '"Kalam", cursive', googleFont: "Kalam:wght@700" },
  { key: "rock-salt", label: "Rock Salt — Grunge Script", stack: '"Rock Salt", cursive', googleFont: "Rock+Salt" },
  { key: "spray", label: "Rubik Spray Paint — Spray Paint", stack: '"Rubik Spray Paint", cursive', googleFont: "Rubik+Spray+Paint" },
  { key: "bangers", label: "Bangers — Comic", stack: '"Bangers", cursive', googleFont: "Bangers" },
  {
    key: "system",
    label: "System Default",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    googleFont: null,
  },
];

function loadGoogleFont(linkId, googleFont) {
  let link = document.getElementById(linkId);
  if (googleFont) {
    const href = "https://fonts.googleapis.com/css2?family=" + googleFont + "&display=swap";
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  } else if (link) {
    link.remove();
  }
}

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

  loadGoogleFont("googleFontLink", font.googleFont);

  const headline = theme.headline || {};
  const hFont = HEADLINE_FONT_OPTIONS.find((f) => f.key === headline.fontKey) || HEADLINE_FONT_OPTIONS[0];
  root.setProperty("--headline-font-family", hFont.stack);
  root.setProperty("--headline-size", (headline.size || 4) + "rem");
  root.setProperty("--headline-rotate", (headline.rotate || 0) + "deg");
  root.setProperty("--headline-color", headline.color || "#24262a");
  loadGoogleFont("headlineFontLink", hFont.googleFont);

  const pos = theme.contentPosition || {};
  const H_ALIGN = { left: "flex-start", center: "center", right: "flex-end" };
  const V_ALIGN = { top: "flex-start", center: "center", bottom: "flex-end" };
  root.setProperty("--welcome-align", H_ALIGN[pos.horizontal] || "center");
  root.setProperty("--welcome-justify", V_ALIGN[pos.vertical] || "flex-start");

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
