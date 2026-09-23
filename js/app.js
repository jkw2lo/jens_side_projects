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

  /* ---------------- sidebar rendering ---------------- */
  const featuredListEl = document.getElementById("featuredList");
  const projectListEl = document.getElementById("projectList");
  const detailPanel = document.getElementById("detailPanel");

  const featured = PROJECTS.filter((p) => p.featured).slice(0, 3);
  const rest = PROJECTS.filter((p) => !featured.includes(p));

  let currentSlide = 0;
  let activeProjectId = null;

  function makeBox(project) {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "project-box";
    box.dataset.id = project.id;
    box.innerHTML =
      (project.featured ? '<span class="featured-badge">Featured</span>' : "") +
      '<div class="box-lid"></div>' +
      '<div class="box-label">' +
      '<span class="box-title"></span>' +
      '<span class="box-tagline"></span>' +
      "</div>";
    box.querySelector(".box-title").textContent = project.name;
    box.querySelector(".box-tagline").textContent = project.tagline || "";
    box.addEventListener("click", () => selectProject(project.id));
    return box;
  }

  featured.forEach((p) => featuredListEl.appendChild(makeBox(p)));
  rest.forEach((p) => projectListEl.appendChild(makeBox(p)));

  function setActiveBox(id) {
    document.querySelectorAll(".project-box").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
  }

  function selectProject(id) {
    activeProjectId = id;
    currentSlide = 0;
    setActiveBox(id);
    renderDetail();
    detailPanel.scrollTop = 0;
  }

  /* ---------------- detail panel rendering ---------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function renderWelcome() {
    detailPanel.innerHTML =
      '<div class="welcome">' +
      "<h1>" + escapeHtml(ABOUT_ME.heading) + "</h1>" +
      '<p class="intro">' + escapeHtml(ABOUT_ME.intro) + "</p>" +
      '<div class="about-box"><h3>About me</h3><p>' + escapeHtml(ABOUT_ME.about) + "</p></div>" +
      '<p class="nav-hint">' + escapeHtml(ABOUT_ME.navHint) + "</p>" +
      "</div>";
  }

  function renderSlideshow(project) {
    if (!project.images || project.images.length === 0) {
      return (
        '<div class="slideshow"><div class="placeholder">' +
        '<span class="icon">🖼️</span>Add screenshots for this project in js/data.js' +
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

  function renderDetail() {
    const project = PROJECTS.find((p) => p.id === activeProjectId);
    if (!project) {
      renderWelcome();
      return;
    }

    const features = (project.features || [])
      .map((f) => "<li>" + escapeHtml(f) + "</li>")
      .join("");

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
      renderSlideshow(project) +
      "</div>" +
      '<div class="personal-note">' +
      "<h3>From me</h3><p>" + escapeHtml(project.personal) + "</p>" +
      "</div>" +
      "</div>";

    wireSlideshowControls(project);
  }

  function wireSlideshowControls(project) {
    const prevBtn = detailPanel.querySelector(".slide-nav.prev");
    const nextBtn = detailPanel.querySelector(".slide-nav.next");
    const dots = detailPanel.querySelectorAll(".slide-dots .dot");

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
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        currentSlide = Number(dot.dataset.index);
        renderDetail();
      });
    });
  }

  renderWelcome();

  /* ---------------- top bar: resume + email ---------------- */
  const resumeBtn = document.getElementById("resumeBtn");
  resumeBtn.href = SITE_CONFIG.resumeUrl;

  const emailBtn = document.getElementById("emailBtn");
  const emailPopover = document.getElementById("emailPopover");
  const emailAddress = document.getElementById("emailAddress");
  const copyEmailBtn = document.getElementById("copyEmailBtn");
  const mailtoLink = document.getElementById("mailtoLink");

  emailAddress.textContent = SITE_CONFIG.contactEmail;
  mailtoLink.href = "mailto:" + SITE_CONFIG.contactEmail;

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
      await navigator.clipboard.writeText(SITE_CONFIG.contactEmail);
      copyEmailBtn.textContent = "Copied!";
      window.setTimeout(() => (copyEmailBtn.textContent = "Copy"), 1500);
    } catch (err) {
      copyEmailBtn.textContent = "Select & copy";
    }
  });
})();
