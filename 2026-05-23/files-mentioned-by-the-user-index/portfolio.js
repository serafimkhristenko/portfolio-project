const canvas = document.querySelector(".pixel-canvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  const pixel = 4;
  const nodes = [];
  const worms = [];
  let trails = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  const cursor = { x: -9999, y: -9999, active: false };
  const colors = [
    "200, 241, 53",
    "88, 215, 255",
    "138, 109, 255",
    "255, 255, 255"
  ];

  function snap(value) {
    return Math.round(value / pixel) * pixel;
  }

  function makeNode() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.36,
      vy: (Math.random() - 0.5) * 0.3,
      size: pixel * (Math.random() > 0.78 ? 2 : 1),
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.16 + Math.random() * 0.28
    };
  }

  function resetWorm(worm, side = Math.random() > 0.5 ? 1 : -1) {
    worm.x = side > 0 ? -40 : width + 40;
    worm.y = Math.random() * height;
    worm.angle = side > 0 ? (Math.random() - 0.5) * 0.8 : Math.PI + (Math.random() - 0.5) * 0.8;
    worm.speed = 0.42 + Math.random() * 0.7;
    worm.life = 0;
    worm.length = 9 + Math.floor(Math.random() * 9);
    worm.color = Math.random() > 0.35 ? "200, 241, 53" : "88, 215, 255";
    worm.segments = [];
    for (let i = 0; i < worm.length; i += 1) {
      worm.segments.push({ x: snap(worm.x - i * pixel * side), y: snap(worm.y), alpha: 1 - i / worm.length });
    }
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    nodes.length = 0;
    const nodeCount = Math.min(88, Math.max(42, Math.floor((width * height) / 25000)));
    for (let i = 0; i < nodeCount; i += 1) {
      nodes.push(makeNode());
    }

    worms.length = 0;
    const wormCount = Math.min(7, Math.max(4, Math.floor(width / 290)));
    for (let i = 0; i < wormCount; i += 1) {
      const worm = {};
      resetWorm(worm);
      worm.x = Math.random() * width;
      worm.y = Math.random() * height;
      worms.push(worm);
    }
  }

  function drawLine(a, b, color, alpha, lineWidth = 1) {
    ctx.strokeStyle = `rgba(${color}, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function updateNode(node) {
    node.pulse += 0.035;
    node.drift += 0.018;
    node.x += node.vx + Math.sin(node.drift) * 0.05;
    node.y += node.vy + Math.cos(node.drift * 0.8) * 0.04;
    if (node.x < -12) node.x = width + 12;
    if (node.x > width + 12) node.x = -12;
    if (node.y < -12) node.y = height + 12;
    if (node.y > height + 12) node.y = -12;
  }

  function drawNodes() {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      updateNode(a);
      const x = snap(a.x);
      const y = snap(a.y);
      const alpha = Math.max(0.08, a.alpha + Math.sin(a.pulse) * 0.09);
      ctx.fillStyle = `rgba(${a.color}, ${alpha})`;
      ctx.fillRect(x, y, a.size, a.size);

      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 118) {
          drawLine(a, b, a.color, (1 - distance / 118) * 0.12, 0.7);
        }
      }

      if (cursor.active) {
        const dx = a.x - cursor.x;
        const dy = a.y - cursor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 190) {
          drawLine(a, cursor, "200, 241, 53", (1 - distance / 190) * 0.28, 1);
        }
      }
    }
  }

  function updateWorm(worm) {
    worm.life += 1;
    worm.angle += Math.sin(worm.life * 0.045) * 0.045 + (Math.random() - 0.5) * 0.12;
    worm.x += Math.cos(worm.angle) * worm.speed;
    worm.y += Math.sin(worm.angle) * worm.speed;

    if (worm.x < -90 || worm.x > width + 90 || worm.y < -90 || worm.y > height + 90) {
      resetWorm(worm, worm.x > width / 2 ? -1 : 1);
      return;
    }

    worm.segments.unshift({ x: snap(worm.x), y: snap(worm.y), alpha: 1 });
    worm.segments = worm.segments.slice(0, worm.length);
  }

  function drawWorms() {
    worms.forEach((worm) => {
      updateWorm(worm);
      const head = { x: worm.x, y: worm.y };
      ctx.shadowColor = `rgba(${worm.color}, 0.38)`;
      ctx.shadowBlur = 10;
      worm.segments.forEach((segment, index) => {
        const alpha = Math.max(0, 0.5 - index * 0.035) * segment.alpha;
        const size = index < 2 ? pixel * 2 : pixel;
        ctx.fillStyle = `rgba(${worm.color}, ${alpha})`;
        ctx.fillRect(segment.x, segment.y, size, pixel);
      });
      ctx.shadowBlur = 0;

      nodes.forEach((node) => {
        const dx = node.x - head.x;
        const dy = node.y - head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 105) {
          drawLine(head, node, worm.color, (1 - distance / 105) * 0.18, 0.75);
        }
      });
    });
  }

  function drawCursorEcho() {
    if (!cursor.active) return;
    trails.forEach((trail) => {
      trail.alpha -= 0.015;
      ctx.fillStyle = `rgba(${trail.color}, ${trail.alpha})`;
      ctx.fillRect(snap(trail.x), snap(trail.y), trail.size, trail.size);
    });
    trails = trails.filter((trail) => trail.alpha > 0);

    ctx.shadowColor = "rgba(200, 241, 53, 0.46)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(snap(cursor.x) + 9, snap(cursor.y) + 10, pixel, pixel * 2);
    ctx.fillStyle = "rgba(200, 241, 53, 0.55)";
    ctx.fillRect(snap(cursor.x) + 14, snap(cursor.y) + 15, pixel * 2, pixel);
    ctx.shadowBlur = 0;
  }

  const FPS = 24;
  const FRAME_MS = 1000 / FPS;
  let lastFrameTime = 0;

  function draw(timestamp) {
    if (timestamp - lastFrameTime < FRAME_MS) {
      requestAnimationFrame(draw);
      return;
    }
    lastFrameTime = timestamp;
    ctx.clearRect(0, 0, width, height);
    drawNodes();
    drawWorms();
    drawCursorEcho();
    requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", (event) => {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
    for (let i = 0; i < 3; i += 1) {
      trails.push({
        x: cursor.x + (Math.random() - 0.5) * 16,
        y: cursor.y + (Math.random() - 0.5) * 16,
        alpha: 0.24 + Math.random() * 0.2,
        size: pixel * (Math.random() > 0.72 ? 2 : 1),
        color: Math.random() > 0.25 ? "200, 241, 53" : "255, 255, 255"
      });
    }
    if (trails.length > 120) trails = trails.slice(-120);
  });

  window.addEventListener("pointerleave", () => {
    cursor.active = false;
  });

  window.addEventListener("blur", () => {
    cursor.active = false;
  });

  resize();
  draw();
  window.addEventListener("resize", resize);
}

document.querySelectorAll("[data-glow-name]").forEach((name) => {
  if (name.dataset.glowReady) return;
  const chars = Array.from(name.textContent.trim());
  const html = chars.map((char, index) => {
    const value = char === " " ? "&nbsp;" : char.replace(/[&<>]/g, (match) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[match]));
    return `<span class="h1-char" style="--i:${index}">${value}</span>`;
  }).join("");
  name.innerHTML = `<span class="h1-wrap"><span class="h1-sweep"></span>${html}</span>`;
  name.dataset.glowReady = "true";
});

document.querySelectorAll("[data-photo-slider]").forEach((slider) => {
  const images = Array.from(slider.querySelectorAll("img"));
  const dots = Array.from(slider.querySelectorAll(".photo-dot"));
  if (!images.length) return;
  let index = images.findIndex((image) => image.classList.contains("active"));
  if (index < 0) index = 0;
  let timer = 0;

  function show(nextIndex) {
    images[index].classList.remove("active");
    if (dots[index]) dots[index].classList.remove("active");
    index = (nextIndex + images.length) % images.length;
    images[index].classList.add("active");
    if (dots[index]) dots[index].classList.add("active");
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      show(index + 1);
      schedule();
    }, 3000);
  }

  slider.addEventListener("click", () => {
    show(index + 1);
    schedule();
  });

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      show(dotIndex);
      schedule();
    });
  });

  show(index);
  schedule();
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxPhoto = document.querySelector("[data-lightbox-photo]");
const lightboxPlaceholder = document.querySelector("[data-lightbox-image]");
const lightboxTitle = document.querySelector("[data-lightbox-title]");
const lightboxText = document.querySelector("[data-lightbox-text]");

function openLightbox(title, text, src = "") {
  if (!lightbox) return;
  if (lightboxPhoto && lightboxPlaceholder) {
    if (src) {
      lightboxPhoto.src = src;
      lightboxPhoto.alt = title || "Portfolio image";
      lightboxPhoto.hidden = false;
      lightboxPlaceholder.hidden = true;
    } else {
      lightboxPhoto.hidden = true;
      lightboxPhoto.removeAttribute("src");
      lightboxPlaceholder.hidden = false;
    }
  }
  if (lightboxTitle) lightboxTitle.textContent = title || "";
  if (lightboxText) lightboxText.textContent = text || "";
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close-lightbox]").forEach((button) => {
  button.addEventListener("click", closeLightbox);
});

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

document.querySelectorAll("[data-gallery-item]").forEach((button) => {
  button.addEventListener("click", () => {
    openLightbox(button.dataset.title || "", button.dataset.text || "", button.dataset.src || "");
  });
});

document.querySelectorAll("[data-spoiler]").forEach((spoiler) => {
  const toggle = spoiler.querySelector("[data-spoiler-toggle]");
  if (!toggle) return;

  function setSpoiler(open) {
    spoiler.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Скрыть подробный workflow" : "Открыть подробный workflow";
  }

  setSpoiler(false);
  toggle.addEventListener("click", () => {
    setSpoiler(!spoiler.classList.contains("is-open"));
  });
});

document.querySelectorAll("[data-style-slider]").forEach((slider) => {
  const image = slider.querySelector("[data-style-slider-image]");
  const frame = slider.querySelector(".style-slider-frame");
  const controls = slider.querySelectorAll("[data-style-src]");
  if (!image || !controls.length) return;

  function setStyle(control) {
    const src = control.dataset.styleSrc;
    if (!src) return;
    controls.forEach((item) => item.classList.toggle("is-active", item === control));
    if (image.getAttribute("src") === src) return;

    frame?.classList.add("is-switching");
    image.src = src;
    image.alt = control.dataset.styleAlt || control.textContent.trim();
    window.setTimeout(() => frame?.classList.remove("is-switching"), 180);
  }

  controls.forEach((control) => {
    control.addEventListener("mouseenter", () => setStyle(control));
    control.addEventListener("focus", () => setStyle(control));
    control.addEventListener("click", () => setStyle(control));

    const preload = new Image();
    preload.src = control.dataset.styleSrc;
  });
});

document.querySelectorAll("[data-compare]").forEach((compare) => {
  const handle = compare.querySelector("[data-compare-handle]");
  if (!handle) return;
  let mouseDragging = false;

  function setSplit(value) {
    const split = Math.min(100, Math.max(0, value));
    compare.style.setProperty("--split", `${split}%`);
    compare.dataset.split = String(split);
    handle.setAttribute("aria-valuenow", String(Math.round(split)));
  }

  function setFromPointer(event) {
    const rect = compare.getBoundingClientRect();
    const value = ((event.clientX - rect.left) / rect.width) * 100;
    setSplit(value);
  }

  handle.addEventListener("pointerdown", (event) => {
    handle.setPointerCapture(event.pointerId);
    setFromPointer(event);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    setFromPointer(event);
    event.preventDefault();
  });

  handle.addEventListener("pointerup", (event) => {
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  });

  handle.addEventListener("pointercancel", (event) => {
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  });

  handle.addEventListener("mousedown", (event) => {
    mouseDragging = true;
    setFromPointer(event);
    event.preventDefault();
  });

  window.addEventListener("mousemove", (event) => {
    if (!mouseDragging) return;
    setFromPointer(event);
    event.preventDefault();
  });

  window.addEventListener("mouseup", () => {
    mouseDragging = false;
  });

  handle.addEventListener("keydown", (event) => {
    const current = Number(compare.dataset.split || 50);
    let next = current;
    if (event.key === "ArrowLeft") next = current - 5;
    if (event.key === "ArrowRight") next = current + 5;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = 100;
    if (next !== current) {
      setSplit(next);
      event.preventDefault();
    }
  });

  setSplit(Number(compare.dataset.split || 50));
});

document.querySelectorAll(".case-card").forEach((card) => {
  const main = card.querySelector("[data-main-image]");
  const mainWrap = card.querySelector("[data-compare-output]");
  const title = card.querySelector("[data-case-title]");
  const text = card.querySelector("[data-case-text]");
  const buttons = card.querySelectorAll("[data-variant]");
  const heroTitle = document.querySelector("[data-hero-title]");
  const heroText = document.querySelector("[data-hero-text]");

  function selectVariant(button) {
    if (!main) return;
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    main.dataset.title = button.dataset.title || "";
    main.dataset.text = button.dataset.text || "";
    if (title) title.textContent = button.dataset.title || title.textContent;
    if (text) text.textContent = button.dataset.text || text.textContent;
    if (card.dataset.feature === "true") {
      if (heroTitle) heroTitle.textContent = button.dataset.title || "";
      if (heroText) heroText.textContent = button.dataset.text || "";
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => selectVariant(button));
  });

  if (mainWrap && main) {
    mainWrap.addEventListener("click", () => {
      openLightbox(main.dataset.title || "", main.dataset.text || "");
    });
  }

  const first = card.querySelector("[data-variant].active") || buttons[0];
  if (first) selectVariant(first);
});
