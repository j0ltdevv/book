/* ─────────────────────────────────────────────
   Interactions : progression, révélations,
   curseur, inclinaison des panneaux.
   ───────────────────────────────────────────── */

(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ── parallaxe du hero ────────────────────── */
  const heroTitle = document.querySelector(".hero__title");
  const heroSub = document.querySelector(".hero__sub");
  const heroSpec = document.querySelector(".hero__spec");
  const heroEyebrow = document.querySelector(".hero .eyebrow");

  function parallaxHero(y) {
    if (reduce || !heroTitle) return;
    const h = window.innerHeight;
    if (y <= 0) {
      heroTitle.style.transform = "";
      heroTitle.style.opacity = "";
      [heroSub, heroSpec, heroEyebrow].forEach((el) => {
        if (!el) return;
        el.style.transform = "";
        el.style.opacity = "";
      });
      return;
    }
    if (y > h * 1.1) return;
    const k = Math.min(y / h, 1);

    heroTitle.style.transform = `translate3d(0, ${(k * 92).toFixed(1)}px, 0)`;
    heroTitle.style.opacity = String(Math.max(0, 1 - k * 1.35));

    if (heroSub) {
      heroSub.style.transform = `translate3d(0, ${(k * 46).toFixed(1)}px, 0)`;
      heroSub.style.opacity = String(Math.max(0, 1 - k * 1.5));
    }
    if (heroSpec) {
      heroSpec.style.transform = `translate3d(0, ${(k * 26).toFixed(1)}px, 0)`;
      heroSpec.style.opacity = String(Math.max(0, 1 - k * 2.4));
    }
    if (heroEyebrow) {
      heroEyebrow.style.opacity = String(Math.max(0, 1 - k * 2.2));
    }
  }

  /* ── barre de progression ─────────────────── */
  const bar = document.querySelector(".progress span");
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? y / max : 0;

    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;

    const nav = document.querySelector(".nav");
    if (nav) nav.classList.toggle("is-scrolled", y > 40);

    parallaxHero(y);
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFrame);
    }
  }, { passive: true });

  onScrollFrame();

  /* ── révélations au scroll ────────────────── */
  const items = [...document.querySelectorAll("[data-reveal]")];

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    /* décalage en cascade à l'intérieur d'un même projet */
    document.querySelectorAll(".project, .approach__grid, .hero").forEach((group) => {
      const kids = [...group.querySelectorAll("[data-reveal]")];
      kids.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i * 70, 420)}ms`));
    });

    items.forEach((el) => io.observe(el));
  }

  /* ── curseur ──────────────────────────────── */
  const cursor = document.querySelector(".cursor");

  if (cursor && fine && !reduce) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;
    let raf = 0;
    let shown = false;

    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        cx = tx;
        cy = ty;
        cursor.classList.add("is-active");
        raf = requestAnimationFrame(loop);
      }
    }, { passive: true });

    const hot = "a, button, .panel, .tags li";
    document.addEventListener("pointerover", (e) => {
      if (e.target.closest(hot)) cursor.classList.add("is-hot");
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest(hot)) cursor.classList.remove("is-hot");
    });

    document.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-active");
      shown = false;
      cancelAnimationFrame(raf);
    });
  }

  /* ── inclinaison des panneaux de code ─────── */
  if (fine && !reduce) {
    document.querySelectorAll("[data-tilt]").forEach((panel) => {
      let raf = 0;
      let rx = 0, ry = 0, trx = 0, tryy = 0;

      const apply = () => {
        rx += (trx - rx) * 0.12;
        ry += (tryy - ry) * 0.12;
        panel.style.transform =
          `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        if (Math.abs(trx - rx) > 0.01 || Math.abs(tryy - ry) > 0.01) {
          raf = requestAnimationFrame(apply);
        } else {
          raf = 0;
        }
      };

      panel.addEventListener("pointermove", (e) => {
        const r = panel.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        trx = -py * 5.2;
        tryy = px * 6.4;
        if (!raf) raf = requestAnimationFrame(apply);
      }, { passive: true });

      panel.addEventListener("pointerleave", () => {
        trx = 0;
        tryy = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  }

  /* ── rail d'index ─────────────────────────── */
  const projects = [...document.querySelectorAll("[data-project]")];

  if (projects.length && window.matchMedia("(min-width: 1180px)").matches) {
    const rail = document.createElement("aside");
    rail.className = "rail";
    rail.setAttribute("aria-label", "Index des projets");

    const list = document.createElement("ul");
    projects.forEach((proj, i) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${proj.id}`;
      a.textContent = proj.dataset.index || String(i + 1).padStart(2, "0");
      a.addEventListener("click", (e) => {
        e.preventDefault();
        proj.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
      li.appendChild(a);
      list.appendChild(li);
    });

    rail.appendChild(list);
    document.body.appendChild(rail);

    const links = [...list.querySelectorAll("a")];
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = projects.indexOf(entry.target);
        links.forEach((a, i) => a.classList.toggle("is-active", i === idx));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    projects.forEach((p) => io2.observe(p));

    /* le rail n'apparaît que dans la zone projets */
    const railZone = document.querySelector("#projets");
    if (railZone) {
      const ioRail = new IntersectionObserver((entries) => {
        entries.forEach((e) => rail.classList.toggle("is-on", e.isIntersecting));
      }, { rootMargin: "-15% 0px -25% 0px", threshold: 0 });
      ioRail.observe(railZone);
    }
  }

  /* ── nav : section courante ───────────────── */
  const navLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  const activeSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (navLinks.length && activeSections.length && "IntersectionObserver" in window) {
    const ioNav = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const href = `#${entry.target.id}`;
        navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === href));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    activeSections.forEach((sec) => ioNav.observe(sec));
  }

  /* ── année du footer ─────────────────────── */
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(year);
  });
})();
