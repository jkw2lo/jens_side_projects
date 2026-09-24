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
    // Where the welcome text sits over the garage background — handy for
    // balancing it against a custom background image.
    contentPosition: {
      horizontal: "center", // left | center | right
      vertical: "top", // top | center | bottom
    },
  },
};

// Shown in the center panel when no project is selected.
const ABOUT_ME = {
  heading: "Welcome to my side projects garage",
  intro:
    "Hi, I'm Jen! This is where I keep the things I've built outside of work. " +
    "Pick a project from the boxes on the left to see what it does, why I made it, and what I learned.",
  about:
    "Edit ABOUT_ME.about in js/data.js with a short bio — who you are, what " +
    "you like building, and anything else you want a visitor to know.",
  navHint:
    "Featured projects are pinned at the top of the left column. Everything " +
    "else lives in the scrollable stack below it — click any box to open it.",
  // Per-field font/size/weight/italic/align/color overrides, set from the
  // format toolbar in Edit Mode. Leave empty to use the site default font.
  styles: {},
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
