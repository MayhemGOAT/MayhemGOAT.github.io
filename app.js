(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = getComputedStyle(root);
  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  /* ---------- color: bilinear blend of the four pad corners in OKLab ---------- */

  const hexToRgb = (hex) => {
    const h = hex.trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const rgbToOklab = ([r, g, b]) => {
    [r, g, b] = [r, g, b].map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const oklabToLinear = ([L, a, b]) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  };
  const inGamut = (lab) => oklabToLinear(lab).every((c) => c >= -0.001 && c <= 1.001);
  const oklabToRgb = (lab) => oklabToLinear(lab).map((c) => clamp01(toGam(c)));

  const corner = (name) => rgbToOklab(hexToRgb(css.getPropertyValue(name)));
  const C00 = corner("--hudson"), C10 = corner("--moss"), C01 = corner("--ember"), C11 = corner("--gold");

  const moodRgb = (v, e) => {
    const lab = [0, 1, 2].map((i) =>
      C00[i] * (1 - v) * (1 - e) + C10[i] * v * (1 - e) + C01[i] * (1 - v) * e + C11[i] * v * e
    );
    return oklabToRgb(lab);
  };
  const rgbCss = (c) => `rgb(${c.map((x) => Math.round(x * 255)).join(" ")})`;
  const relLum = (c) => { const [r, g, b] = c.map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const GRAPHITE = hexToRgb(css.getPropertyValue("--graphite"));
  const onColor = (c) => {
    const L = relLum(c);
    const vsWhite = 1.05 / (L + 0.05), vsInk = (L + 0.05) / (relLum(GRAPHITE) + 0.05);
    return vsInk >= vsWhite ? "var(--graphite)" : "var(--white)";
  };
  const contrast = (a, b) => {
    const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  /* link color: the mood's hue turned 180°, at the lightness closest to `targetL` that still reads on `bg` */
  const FOG = rgbToOklab(hexToRgb(css.getPropertyValue("--fog")));
  function complementOn(moodLab, bgRgb, targetL, minRatio = 4.7) {
    const hue = Math.atan2(moodLab[2], moodLab[1]) + Math.PI;
    let best = null, bestScore = -Infinity;
    for (let L = 0.22; L <= 0.96; L += 0.02) {
      for (const C of [0.17, 0.14, 0.11, 0.08, 0.05]) {
        const lab = [L, C * Math.cos(hue), C * Math.sin(hue)];
        if (!inGamut(lab)) continue;
        const rgb = oklabToRgb(lab);
        const ratio = contrast(rgb, bgRgb);
        const score = (ratio >= minRatio ? 10 : ratio - minRatio) - Math.abs(L - targetL) * 4 + C * 4;
        if (score > bestScore) { bestScore = score; best = rgb; }
      }
    }
    return best || GRAPHITE;
  }

  /* ---------- mood naming ---------- */

  const NAMES = [
    ["Gloomy", "Mellow", "Chill"],
    ["Brooding", "Focused", "Upbeat"],
    ["Tense", "Wired", "Hype"],
  ];
  const band = (n) => (n < 1 / 3 ? 0 : n < 2 / 3 ? 1 : 2);
  const moodName = (v, e) => NAMES[band(e)][band(v)];

  /* ---------- elements ---------- */

  const pad = document.getElementById("pad");
  const canvas = document.getElementById("pad-canvas");
  const dot = document.getElementById("dot");
  const padDots = document.getElementById("pad-dots");
  const grid = document.getElementById("grid");
  const tiles = [...grid.querySelectorAll(".tile")];
  const nameEls = document.querySelectorAll("[data-mood-name]");
  const rv = document.getElementById("r-v");
  const re = document.getElementById("r-e");
  const rTop = document.getElementById("r-top");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const presets = [...document.querySelectorAll(".presets button")];

  /* paint the pad */
  const ctx = canvas.getContext("2d");
  const S = canvas.width;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = moodRgb(x / (S - 1), 1 - y / (S - 1));
      const k = (y * S + x) * 4;
      img.data[k] = c[0] * 255; img.data[k + 1] = c[1] * 255; img.data[k + 2] = c[2] * 255; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const padUrl = canvas.toDataURL();

  /* per-item setup */
  const items = tiles.map((t, i) => {
    const v = parseFloat(t.dataset.v), e = parseFloat(t.dataset.e);
    t.id ||= `tile-${i}`;
    if (t.classList.contains("tile-type")) {
      const c = moodRgb(v, e);
      t.style.setProperty("--tile-bg", rgbCss(c));
      t.style.setProperty("--tile-on", onColor(c));
    }
    const badge = document.createElement("p");
    badge.className = "t-match";
    t.appendChild(badge);
    const pd = document.createElement("i");
    pd.style.left = `${v * 100}%`;
    pd.style.top = `${(1 - e) * 100}%`;
    padDots.appendChild(pd);
    return { el: t, v, e, kind: t.dataset.kind, title: t.querySelector("h3").textContent, badge, pd };
  });

  document.querySelectorAll(".row").forEach((r) => {
    const p = r.querySelector(".row-pad");
    p.style.backgroundImage = `url(${padUrl})`;
    const i = p.querySelector("i");
    i.style.left = `${parseFloat(r.dataset.v) * 100}%`;
    i.style.top = `${(1 - parseFloat(r.dataset.e)) * 100}%`;
  });

  /* keep the name and the email on their lines as the width axis grows */
  const range = document.createRange();
  const textWidth = (node) => { range.selectNodeContents(node); return range.getBoundingClientRect().width; };
  const contentWidth = (el) => {
    const s = getComputedStyle(el);
    return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  };
  const nameEl = document.querySelector(".name");
  const emailEl = document.querySelector(".email");
  const fits = [
    { el: nameEl, prop: "--name-fit", f: 1, widest: () => Math.max(...[...nameEl.children].map(textWidth)), room: () => nameEl.clientWidth },
    { el: emailEl, prop: "--email-fit", f: 1, widest: () => textWidth(emailEl), room: () => contentWidth(emailEl.parentElement) },
  ];
  function fitText() {
    fits.forEach((x) => {
      const w = x.widest();
      if (!w) return;
      x.f = Math.min(1, (x.room() * 0.98) / (w / x.f));
      root.style.setProperty(x.prop, x.f.toFixed(3));
    });
  }
  addEventListener("resize", fitText);
  fits.forEach((x) => x.el.addEventListener("transitionend", fitText));

  /* ---------- state ---------- */

  const state = { v: 0.5, e: 0.5, filter: "all" };
  let order = [];

  const ranked = () => {
    const visible = items.filter((it) => state.filter === "all" || it.kind === state.filter);
    return visible
      .map((it) => ({ it, d: Math.hypot(it.v - state.v, it.e - state.e) }))
      .sort((a, b) => a.d - b.d);
  };

  function setMood(v, e) {
    state.v = clamp01(v); state.e = clamp01(e);
    const c = moodRgb(state.v, state.e);
    const name = moodName(state.v, state.e);

    root.style.setProperty("--mood", rgbCss(c));
    root.style.setProperty("--on-mood", onColor(c));
    root.style.setProperty("--wdth", (62 + state.e * 88).toFixed(1));
    root.style.setProperty("--wght", (300 + (0.62 * state.e + 0.38 * state.v) * 560).toFixed(0));
    themeMeta?.setAttribute("content", rgbCss(c));

    const lab = rgbToOklab(c);
    const pageBg = oklabToRgb(FOG.map((x, i) => x * 0.85 + lab[i] * 0.15));
    root.style.setProperty("--link", rgbCss(complementOn(lab, pageBg, 0.5)));
    root.style.setProperty("--link-on-mood", rgbCss(complementOn(lab, c, lab[0] > 0.62 ? 0.3 : 0.9)));

    dot.style.left = `${state.v * 100}%`;
    dot.style.top = `${(1 - state.e) * 100}%`;
    dot.classList.toggle("flip-hint", state.v > 0.62);

    fitText();
    nameEls.forEach((n) => (n.textContent = name));
    rv.textContent = state.v.toFixed(2);
    re.textContent = state.e.toFixed(2);
    pad.setAttribute("aria-valuenow", Math.round(state.v * 100));
    pad.setAttribute("aria-valuetext", `${name}: positivity ${Math.round(state.v * 100)}%, energy ${Math.round(state.e * 100)}%`);

    const r = ranked();
    r.forEach(({ it, d }, i) => {
      const pct = Math.max(0, Math.round((1 - d / 1.1) * 100));
      it.badge.textContent = i === 0 ? `Best match · ${pct}%` : `${pct}% match`;
    });
    items.forEach((it) => it.pd.classList.toggle("is-near", r[0] && r[0].it === it));
    if (r[0]) {
      rTop.textContent = r[0].it.title;
      rTop.href = `#${r[0].it.el.id}`;
    }
  }

  /* ---------- grid reorder with FLIP ---------- */

  function reorder() {
    const r = ranked().map((x) => x.it);
    const next = r.map((it) => it.el.id).join(",");
    if (next === order.join(",")) return;
    order = next.split(",");

    const first = new Map(tiles.map((t) => [t, t.getBoundingClientRect()]));
    tiles.forEach((t) => {
      const it = items.find((x) => x.el === t);
      t.classList.toggle("is-hidden", !r.includes(it));
      t.classList.remove("rank-1", "rank-wide");
    });
    // rank-1 takes 4 cells and each wide tile 2, so pick the wide count that fills complete rows of 4
    let wide = 2;
    while (r.length > 1 && (r.length + 3 + wide) % 4 !== 0) wide++;
    wide = Math.min(wide, Math.max(0, r.length - 1));
    r.forEach((it, i) => {
      if (i === 0) it.el.classList.add("rank-1");
      else if (i <= wide) it.el.classList.add("rank-wide");
      grid.appendChild(it.el);
    });
    tiles.filter((t) => t.classList.contains("is-hidden")).forEach((t) => grid.appendChild(t));

    if (reduce) return;
    const moved = [];
    r.forEach(({ el }) => {
      const a = first.get(el), b = el.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top;
      const sx = a.width / b.width, sy = a.height / b.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      el.style.transition = "none";
      el.style.transformOrigin = "0 0";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      moved.push(el);
    });
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      moved.forEach((el) => {
        el.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1)";
        el.style.transform = "";
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(play));
    setTimeout(play, 60);
  }

  let reorderTimer = 0;
  const scheduleReorder = (ms = 160) => { clearTimeout(reorderTimer); reorderTimer = setTimeout(reorder, ms); };

  /* ---------- tween helper ---------- */

  let tweenId = 0;
  function tweenTo(v, e, dur, done) {
    const id = ++tweenId;
    if (reduce || dur <= 0) { setMood(v, e); done?.(); return; }
    const v0 = state.v, e0 = state.e, t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished || id !== tweenId) return;
      finished = true;
      setMood(v, e);
      done?.();
    };
    const step = (now) => {
      if (finished || id !== tweenId) return;
      const t = Math.min(1, (now - t0) / dur);
      if (t >= 1) return finish();
      const k = 1 - (1 - t) ** 3;
      setMood(v0 + (v - v0) * k, e0 + (e - e0) * k);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(finish, dur + 60);
  }

  /* ---------- pad input ---------- */

  let dragging = false;
  const fromEvent = (ev) => {
    const b = pad.getBoundingClientRect();
    return [(ev.clientX - b.left) / b.width, 1 - (ev.clientY - b.top) / b.height];
  };
  const touched = () => { pad.classList.remove("show-hint"); presets.forEach((p) => p.classList.remove("is-on")); };

  pad.addEventListener("pointerdown", (ev) => {
    dragging = true; tweenId++;
    pad.setPointerCapture(ev.pointerId);
    touched();
    setMood(...fromEvent(ev));
    scheduleReorder();
  });
  pad.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    setMood(...fromEvent(ev));
    scheduleReorder();
  });
  const end = () => { if (!dragging) return; dragging = false; scheduleReorder(0); };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);

  pad.addEventListener("keydown", (ev) => {
    const step = ev.shiftKey ? 0.12 : 0.04;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = moves[ev.key];
    if (!m) return;
    ev.preventDefault();
    tweenId++;
    touched();
    setMood(state.v + m[0], state.e + m[1]);
    scheduleReorder(220);
  });

  presets.forEach((b) => b.addEventListener("click", () => {
    presets.forEach((p) => p.classList.toggle("is-on", p === b));
    pad.classList.remove("show-hint");
    tweenTo(parseFloat(b.dataset.v), parseFloat(b.dataset.e), 450, () => scheduleReorder(0));
  }));

  /* ---------- filters ---------- */

  document.querySelectorAll(".filters button").forEach((b, _, all) => b.addEventListener("click", () => {
    all.forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b); });
    state.filter = b.dataset.filter;
    setMood(state.v, state.e);
    reorder();
  }));

  /* ---------- photo viewer ---------- */

  const viewer = document.getElementById("viewer");
  const vImg = document.getElementById("viewer-img");
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-open]");
    if (!btn) return;
    const tile = btn.closest(".tile");
    const src = btn.querySelector("img");
    vImg.src = src.currentSrc || src.src;
    vImg.alt = src.alt;
    document.getElementById("viewer-kind").textContent = tile.querySelector(".t-kind").textContent;
    document.getElementById("viewer-title").textContent = tile.querySelector("h3").textContent;
    document.getElementById("viewer-line").textContent = tile.querySelector(".t-line").textContent;
    viewer.showModal();
  });
  viewer.addEventListener("click", (ev) => { if (ev.target === viewer) viewer.close(); });

  /* ---------- copy email ---------- */

  const copy = document.getElementById("copy");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.email);
      copy.textContent = "Copied";
      setTimeout(() => (copy.textContent = "Copy email"), 1600);
    } catch {
      location.href = `mailto:${copy.dataset.email}`;
    }
  });

  /* ---------- opening sequence: the dot drops into place ---------- */

  setMood(0.5, 0.5);
  reorder();
  const START = [0.72, 0.62];
  const start = () => tweenTo(START[0], START[1], 850, () => {
    reorder();
    if (!dragging) pad.classList.add("show-hint");
  });
  (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(start, reduce ? 0 : 120));
})();
