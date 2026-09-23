/* ==========================================================================
   Store: holds the "live" site data (site config + about me + projects).

   On load, if the browser has local edits saved (from Edit Mode), those are
   used. Otherwise the defaults from js/data.js are used. Any change made
   through Edit Mode is autosaved to localStorage immediately, so it's only
   visible in that browser until you Export and push the result.
   ========================================================================== */

const Store = (function () {
  const STORAGE_KEY = "jsp_data_v1";
  let listeners = [];
  let warningListeners = [];

  function warn(message) {
    warningListeners.forEach((fn) => fn(message));
  }

  function cloneDefaults() {
    return {
      siteConfig: JSON.parse(JSON.stringify(SITE_CONFIG)),
      aboutMe: JSON.parse(JSON.stringify(ABOUT_ME)),
      projects: JSON.parse(JSON.stringify(PROJECTS)),
    };
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  // Fill in any fields added to SITE_CONFIG after this browser last saved,
  // so older localStorage data doesn't crash the theme/branding code.
  function migrate(s) {
    if (!s.siteConfig.brandText) s.siteConfig.brandText = SITE_CONFIG.brandText;
    if (!s.siteConfig.theme) s.siteConfig.theme = JSON.parse(JSON.stringify(SITE_CONFIG.theme));
    if (!s.siteConfig.theme.colors) s.siteConfig.theme.colors = JSON.parse(JSON.stringify(SITE_CONFIG.theme.colors));
    Object.keys(SITE_CONFIG.theme.colors).forEach((key) => {
      if (!s.siteConfig.theme.colors[key]) s.siteConfig.theme.colors[key] = SITE_CONFIG.theme.colors[key];
    });
    if (!s.siteConfig.theme.fontKey) s.siteConfig.theme.fontKey = SITE_CONFIG.theme.fontKey;
    if (!s.siteConfig.theme.headline) s.siteConfig.theme.headline = JSON.parse(JSON.stringify(SITE_CONFIG.theme.headline));
    return s;
  }

  let saved = loadSaved();
  let hasLocalEdits = !!saved;
  let state = migrate(saved || cloneDefaults());

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function persist() {
    hasLocalEdits = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      warn(
        "Couldn't save to this browser's local storage (it may be full — " +
        "large uploaded images are the usual cause). Your most recent " +
        "change was not saved."
      );
    }
    notify();
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  function onWarning(fn) {
    warningListeners.push(fn);
  }

  function slugify(name) {
    const base = (name || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project";
    let id = base;
    let n = 2;
    while (state.projects.some((p) => p.id === id)) {
      id = base + "-" + n++;
    }
    return id;
  }

  return {
    subscribe,
    onWarning,
    hasLocalEdits: () => hasLocalEdits,

    getSiteConfig: () => state.siteConfig,
    getAboutMe: () => state.aboutMe,
    getProjects: () => state.projects,
    getProject: (id) => state.projects.find((p) => p.id === id),
    getFeatured: () => state.projects.filter((p) => p.featured).slice(0, 3),
    getRest: () => {
      const featured = state.projects.filter((p) => p.featured).slice(0, 3);
      return state.projects.filter((p) => !featured.includes(p));
    },

    updateSiteConfig(patch) {
      Object.assign(state.siteConfig, patch);
      persist();
    },

    updateAboutMe(patch) {
      Object.assign(state.aboutMe, patch);
      persist();
    },

    updateTheme(patch) {
      Object.assign(state.siteConfig.theme, patch);
      persist();
    },

    updateThemeColor(key, value) {
      state.siteConfig.theme.colors[key] = value;
      persist();
    },

    updateHeadline(patch) {
      Object.assign(state.siteConfig.theme.headline, patch);
      persist();
    },

    resetTheme() {
      state.siteConfig.theme = JSON.parse(JSON.stringify(SITE_CONFIG.theme));
      persist();
    },

    updateProject(id, patch) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      Object.assign(p, patch);
      persist();
    },

    addProject() {
      const project = {
        id: slugify("new-project-" + Date.now().toString(36)),
        name: "New Project",
        featured: false,
        tagline: "",
        link: "https://",
        images: [],
        purpose: "",
        audience: "",
        features: [],
        personal: "",
      };
      state.projects.push(project);
      persist();
      return project.id;
    },

    deleteProject(id) {
      state.projects = state.projects.filter((p) => p.id !== id);
      persist();
    },

    toggleFeatured(id) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return false;
      if (!p.featured) {
        const count = state.projects.filter((x) => x.featured).length;
        if (count >= 3) {
          warn("Only 3 featured projects allowed — unfeature one first.");
          return false;
        }
      }
      p.featured = !p.featured;
      persist();
      return true;
    },

    moveProject(id, dir) {
      const arr = state.projects;
      const idx = arr.findIndex((p) => p.id === id);
      if (idx < 0) return;
      const group = arr[idx].featured;
      let swapIdx = idx + dir;
      while (swapIdx >= 0 && swapIdx < arr.length && arr[swapIdx].featured !== group) {
        swapIdx += dir;
      }
      if (swapIdx < 0 || swapIdx >= arr.length) return;
      const tmp = arr[idx];
      arr[idx] = arr[swapIdx];
      arr[swapIdx] = tmp;
      persist();
    },

    addFeature(id) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      p.features.push("");
      persist();
    },
    updateFeature(id, index, value) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      p.features[index] = value;
      persist();
    },
    removeFeature(id, index) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      p.features.splice(index, 1);
      persist();
    },

    addImage(id, src) {
      const p = state.projects.find((p) => p.id === id);
      if (!p || !src) return;
      p.images.push(src);
      persist();
    },
    removeImage(id, index) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      p.images.splice(index, 1);
      persist();
    },
    moveImage(id, index, dir) {
      const p = state.projects.find((p) => p.id === id);
      if (!p) return;
      const swapIdx = index + dir;
      if (swapIdx < 0 || swapIdx >= p.images.length) return;
      const tmp = p.images[index];
      p.images[index] = p.images[swapIdx];
      p.images[swapIdx] = tmp;
      persist();
    },

    resetToDefaults() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        /* ignore */
      }
      state = cloneDefaults();
      hasLocalEdits = false;
      notify();
    },

    exportDataJs() {
      const header =
        "/* Exported from Edit Mode on " + new Date().toISOString() + ".\n" +
        "   Replace js/data.js with this file, then commit and push to publish. */\n\n";
      return (
        header +
        "const SITE_CONFIG = " + JSON.stringify(state.siteConfig, null, 2) + ";\n\n" +
        "const ABOUT_ME = " + JSON.stringify(state.aboutMe, null, 2) + ";\n\n" +
        "const PROJECTS = " + JSON.stringify(state.projects, null, 2) + ";\n"
      );
    },
  };
})();
