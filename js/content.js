/* ==========================================================================
   ALL OF THE SITE'S CONTENT LIVES IN THIS ONE FILE.

   Two ways to change it:
     1. In the browser: open the site with #edit on the end of the address,
        click any text to change it, then click Publish (see README).
     2. By hand: edit the values below.

   Images and files live in the assets folder and are referred to here by
   file name only —
     images  -> assets/images/   e.g. "recipe-app-1.png"
     resume  -> assets/resume/   e.g. "resume.pdf"
   (A full path like "assets/other/x.png" or a URL works too.)
   ========================================================================== */

const CONTENT = {
  site: {
    title: "Jen's Side Projects", // big title on the garage door
    email: "jennifer.kw.lo.ny@gmail.com",
    resume: "Resume - Jennifer Lo 20260901.pdf", // file in assets/resume/
    theme: {
      doorFont: "bebas", // bebas | anton | staatliches | typewriter | marker | system
      boxStyle: "banker", // banker | card | minimal
      colors: {
        accent: "#f4b942",
        door: "#a7aab0",
        wall: "#55585e",
        floor: "#34363a",
        box: "#90949c",
        featuredBox: "#9a9e6d",
        panel: "#e6e4dc",
      },
    },
  },

  // Shown in the middle of the garage when no project is open.
  welcome: {
    heading: "Welcome to my side projects garage",
    intro:
      "Hi, I'm Jen! This is where I keep the things I've built outside of work. " +
      "Pick a project from the boxes on the left to see what it does, why I made it, and what I learned.",
    about:
      "About me — a short bio: who you are, what you like building, anything " +
      "else you want a visitor to know.",
    photo: "", // optional, file in assets/images/ shown in the about card
    hint:
      "Featured projects are pinned at the top of the left column. Everything " +
      "else lives in the scrollable stack below it — click any box to open it.",
  },

  /*
    One entry per project:
      id        unique, no spaces (used internally)
      name      project title
      featured  true pins it to the top of the left column (max 3)
      tagline   one line shown on the box
      link      URL for the "Visit project" button ("" hides it)
      images    file names in assets/images/, shown as a slideshow
      purpose   why you built it
      audience  who it's for
      features  list of key features
      personal  how you use it / what you learned
  */
  projects: [
    {
      id: "example-featured-1",
      name: "Example Featured Project",
      featured: true,
      tagline: "Replace me — this is a placeholder to show the template.",
      link: "https://example.com",
      images: [],
      purpose: "Describe why you built this project and what problem it solves.",
      audience: "Who is this for? (e.g. myself, small teams, other developers)",
      features: ["Key feature one", "Key feature two", "Key feature three"],
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
  ],
};
