/* ==========================================================================
   EDIT THIS FILE to add/change your projects, about-me blurb, resume, email.
   Nothing else in the site needs to change when you update your content.
   ========================================================================== */

// Shown in the header/door, top-right corner, and used to theme the page.
const SITE_CONFIG = {
  brandText: "Jen's Side Projects", // shown top-left and on the garage door
  resumeUrl: "assets/resume/resume.pdf", // drop your resume PDF at this path
  contactEmail: "jennifer.kw.lo.ny@gmail.com",
  theme: {
    fontKey: "system", // one of FONT_OPTIONS in js/theme.js
    backgroundImage: "", // data URL or path; empty = default CSS garage
    colors: {
      accent: "#f4b942",
      door: "#a7aab0",
      wall: "#55585e",
      floor: "#34363a",
      box: "#90949c",
      featuredBox: "#9a9e6d",
      panel: "#e6e4dc",
    },
    // Styling for the big door title specifically (not the small top-bar
    // brand text) — one of HEADLINE_FONT_OPTIONS in js/theme.js.
    headline: {
      fontKey: "bebas",
      size: 4, // rem
      rotate: 0, // degrees
      color: "#24262a",
    },
    // "banker" | "card" | "minimal" — see BOX_STYLES in js/theme.js
    boxStyle: "banker",
  },
};

/*
  The welcome area (shown when no project is selected) is a free-form
  canvas, like a single slide — every block is independently positioned,
  sized, and styled. Edit it in the browser (Edit Mode draws drag/resize
  handles and a block inspector panel), or hand-edit the list below.

  Each block:
    id         - unique short string
    type       - "text" | "image" | "container"
    x, y       - top-left position, as a percentage (0-100) of the canvas
    width      - as a percentage (0-100) of the canvas width
    height     - percentage of canvas height (text blocks ignore this —
                 their height follows their content)
    value      - text content (type "text" only)
    src        - image path/URL or data URL (type "image" only)
    style      - font/size/weight/italic/align/color override (type "text"
                 only) — leave {} to use the site default font
    background - an rgba(...) color string for a rectangle behind the
                 block's content, or null for no background (any type)
*/
const ABOUT_ME = {
  blocks: [
    {
      id: "heading",
      type: "text",
      x: 8, y: 6, width: 74,
      value: "Welcome to my side projects garage",
      style: { size: 2, weight: "700", color: "rgba(245, 245, 246, 1)" },
      background: null,
    },
    {
      id: "intro",
      type: "text",
      x: 8, y: 18, width: 68,
      value:
        "Hi, I'm Jen! This is where I keep the things I've built outside of work. " +
        "Pick a project from the boxes on the left to see what it does, why I made it, and what I learned.",
      style: { size: 1.1, color: "rgba(220, 221, 224, 1)" },
      background: null,
    },
    {
      id: "about-bg",
      type: "container",
      x: 8, y: 34, width: 66, height: 22,
      background: "rgba(255, 255, 255, 1)",
    },
    {
      id: "about-text",
      type: "text",
      x: 10, y: 36, width: 62,
      value:
        "About me — edit this block in js/data.js (or click it in Edit Mode) with a " +
        "short bio: who you are, what you like building, anything else you want a visitor to know.",
      style: { color: "rgba(58, 58, 60, 1)" },
      background: null,
    },
    {
      id: "nav-hint",
      type: "text",
      x: 8, y: 60, width: 62,
      value:
        "Featured projects are pinned at the top of the left column. Everything " +
        "else lives in the scrollable stack below it — click any box to open it.",
      style: { size: 0.9, color: "rgba(220, 221, 224, 1)" },
      background: null,
    },
  ],
  // Draggable alignment guides for the canvas, as percentages (0-100).
  // A permanent center guide is always shown in Edit Mode too — these are
  // just the extra ones you've added.
  guides: { v: [], h: [] },
};

/*
  One object per project. Fields:
    id        - unique short string, used internally (no spaces)
    name      - project title
    featured  - true pins it to the top section (max 3 recommended)
    tagline   - one line shown under the box's title in the list
    link      - URL the "Visit project" button opens
    images    - array of image paths for the slideshow (leave [] until you
                have screenshots — a placeholder is shown automatically)
    purpose   - why you built it / the problem it solves
    audience  - who it's for
    features  - array of short strings, key features
    personal  - how you've actually used it + what you learned building it
*/
const PROJECTS = [
  {
    id: "example-featured-1",
    name: "Example Featured Project",
    featured: true,
    tagline: "Replace me — this is a placeholder to show the template.",
    link: "https://example.com",
    images: [],
    purpose:
      "Describe why you built this project and what problem it solves.",
    audience: "Who is this for? (e.g. myself, small teams, other developers)",
    features: [
      "Key feature one",
      "Key feature two",
      "Key feature three",
    ],
    personal:
      "Write a few sentences about how you've actually used this project " +
      "day-to-day, and what you learned building it.",
  },
  {
    id: "example-featured-2",
    name: "Second Featured Project",
    featured: true,
    tagline: "Another placeholder — swap in a real project.",
    link: "https://example.com",
    images: [],
    purpose: "Why this project exists.",
    audience: "Who it's for.",
    features: ["Feature one", "Feature two"],
    personal: "How you use it and what you learned.",
  },
  {
    id: "example-regular-1",
    name: "Regular Project",
    featured: false,
    tagline: "Non-featured projects live in the scrollable box stack below.",
    link: "https://example.com",
    images: [],
    purpose: "Why this project exists.",
    audience: "Who it's for.",
    features: ["Feature one", "Feature two"],
    personal: "How you use it and what you learned.",
  },
  {
    id: "example-regular-2",
    name: "Another Project",
    featured: false,
    tagline: "Add as many of these as you like.",
    link: "https://example.com",
    images: [],
    purpose: "Why this project exists.",
    audience: "Who it's for.",
    features: ["Feature one", "Feature two"],
    personal: "How you use it and what you learned.",
  },
];
