/* Field — 3D voxel project jumper (Three.js r160 CDN) */

import * as THREE from "three";

const TEAL = 0x2dd4bf;
const AMBER = 0xf5b942;
const CHARCOAL = 0x12141c;
const NAVY = 0x1a2744;
const SKIN = 0xc4a07a;
const HAIR = 0x1a1410;
const BROWN = 0x6b3f24;
const SHIRT = 0xe8eef5;

const PROJECTS = {
  pulsex: {
    tags: "SIGNAL · FINANCE",
    title: "PulseX — Financial AI Research",
    body: "Six-agent LLM ensemble with weighted voting and explicit state. Fused FinBERT sentiment with time-series technicals. ~56% out-of-sample directional accuracy — and a rebuilt eval harness after a base-rate false positive.",
    stack: ["Python", "FinBERT", "yfinance", "Orchestration"],
    href: "https://github.com/MayhemGOAT/PulseX",
    linkLabel: "GitHub →",
    color: TEAL,
  },
  sonsetu: {
    tags: "LANGUAGE · MUSIC",
    title: "SonSetu — Mood-Aware Music",
    body: "Collaborative playlists on a 4,000+ song set after Spotify deprecated audio features. Gradient boosting + DistilRoBERTa for valence/energy and 8-class vibe labels. Live on Render.",
    stack: ["DistilRoBERTa", "scikit-learn", "librosa", "Render"],
    href: "https://sonsetu.onrender.com",
    linkLabel: "Live site →",
    color: 0x5b8def,
  },
  loctrack: {
    tags: "VISION · GEO",
    title: "LocTrack — Location Tracker",
    body: "No-install share link + private dashboard. Live map with geofence enter/leave alerts and a Three.js globe. Sessions expire after 24 hours — privacy by design.",
    stack: ["React", "Three.js", "FastAPI", "PostgreSQL"],
    href: "https://github.com/MayhemGOAT/loc_track",
    linkLabel: "GitHub →",
    color: AMBER,
  },
  covid: {
    tags: "SPECTRA · CLASSIFY",
    title: "COVID-19 Strain Analysis",
    body: "Streamlit playground for SARS-CoV-2 strain classification from Raman spectra. Applied ML research at IIT Delhi, tied to ACS Omega 2025.",
    stack: ["Streamlit", "scikit-learn", "Raman", "Research"],
    href: "https://github.com/MayhemGOAT/COVID-19_Strain_Analysis_Prediction",
    linkLabel: "GitHub →",
    color: 0xe879a9,
  },
  fieldlog: {
    tags: "LAB · FIELD_LOG",
    title: "Field Log — Mood Reader",
    body: "Models people can poke — shipped from a cafe table. The same lab chrome that powers the Playground Hub demo, captured in the wild.",
    stack: ["ONNX-adjacent", "SonSetu-ish", "Cafe capture"],
    href: "../#work",
    linkLabel: "Back to the portfolio →",
    color: 0x94a3b8,
  },
};

const canvas = document.getElementById("game");
const hintEl = document.getElementById("hint");
const storyEl = document.getElementById("story");
const storyTags = document.getElementById("story-tags");
const storyTitle = document.getElementById("story-title");
const storyBody = document.getElementById("story-body");
const storyStack = document.getElementById("story-stack");
const storyLink = document.getElementById("story-link");
const storyClose = document.getElementById("story-close");

const keys = new Set();
const input = { x: 0, z: 0, jump: false };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080c);
scene.fog = new THREE.Fog(0x07080c, 28, 70);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x07080c, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 10, 14);

const hemi = new THREE.HemisphereLight(0xa8e8dc, 0x2a2030, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 1.45);
sun.position.set(12, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x5a6478, 0.55));
const fill = new THREE.DirectionalLight(0x2dd4bf, 0.35);
fill.position.set(-8, 6, -4);
scene.add(fill);

/* ── helpers ─────────────────────────────────────────────────────── */
function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    emissive: opts.emissive != null ? opts.emissive : 0x000000,
    emissiveIntensity: opts.emissive != null ? 0.25 : 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  if (opts.x != null) mesh.position.set(opts.x, opts.y || 0, opts.z || 0);
  return mesh;
}

function addVoxel(parent, x, y, z, sx, sy, sz, color) {
  const m = box(sx, sy, sz, color);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* ── world platforms ─────────────────────────────────────────────── */
const platforms = [];

function makeIsland(id, x, y, z, w, d, color, label) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const top = box(w, 0.55, d, color, { cast: true, receive: true, emissive: color });
  top.position.y = 0;
  group.add(top);

  const base = box(w * 0.92, 1.2, d * 0.92, CHARCOAL, { cast: true, receive: true });
  base.position.y = -0.85;
  group.add(base);

  // Accent rim
  const rim = box(w + 0.15, 0.12, d + 0.15, 0x0a0c12, { cast: false });
  rim.position.y = 0.32;
  group.add(rim);

  // Sign post
  const post = box(0.18, 1.6, 0.18, 0x2a3142);
  post.position.set(0, 1.1, -d * 0.35);
  group.add(post);

  const board = box(1.6, 0.7, 0.1, 0x10141e);
  board.position.set(0, 1.85, -d * 0.35);
  group.add(board);

  // Canvas label
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#10141e";
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = "#2dd4bf";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = "#2dd4bf";
  ctx.font = "bold 28px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.56),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  sign.position.set(0, 1.85, -d * 0.35 + 0.06);
  group.add(sign);

  scene.add(group);

  const halfW = w / 2;
  const halfD = d / 2;
  platforms.push({
    id,
    group,
    minX: x - halfW,
    maxX: x + halfW,
    minZ: z - halfD,
    maxZ: z + halfD,
    topY: y + 0.275,
    visited: false,
  });
  return group;
}

// Hub spawn + stepping stones + project islands
makeIsland(null, 0, 0, 0, 5.5, 5.5, 0x2a3548, "HUB");
makeIsland(null, 0, 0.4, -7, 2.4, 2.4, 0x243044, "→");
makeIsland("pulsex", -8, 1.2, -14, 5, 5, 0x1a4a42, "PULSEX");
makeIsland(null, -3, 0.9, -18, 2.2, 2.2, 0x243044, "→");
makeIsland("sonsetu", 6, 1.6, -20, 5, 5, 0x243a58, "SONSETU");
makeIsland(null, 2, 1.3, -26, 2.2, 2.2, 0x243044, "→");
makeIsland("loctrack", -6, 2.0, -30, 5, 5, 0x4a3a1c, "LOCTRACK");
makeIsland(null, 1, 1.8, -34, 2.2, 2.2, 0x243044, "→");
makeIsland("covid", 8, 2.4, -38, 5, 5, 0x4a2438, "COVID");
makeIsland(null, 3, 2.1, -44, 2.2, 2.2, 0x243044, "→");
makeIsland("fieldlog", -2, 2.8, -48, 5.5, 5.5, 0x2e3648, "FIELD LOG");

// Decorative floating voxels
for (let i = 0; i < 28; i++) {
  const s = 0.25 + Math.random() * 0.55;
  const m = box(s, s, s, Math.random() > 0.5 ? TEAL : AMBER, { cast: false, receive: false });
  m.material.transparent = true;
  m.material.opacity = 0.35 + Math.random() * 0.35;
  m.position.set(
    (Math.random() - 0.5) * 40,
    1 + Math.random() * 10,
    -Math.random() * 55
  );
  m.userData.bob = Math.random() * Math.PI * 2;
  m.userData.baseY = m.position.y;
  scene.add(m);
}

// Void grid under world
{
  const grid = new THREE.GridHelper(80, 40, 0x1a2230, 0x121820);
  grid.position.y = -3;
  scene.add(grid);
}

/* ── voxel Aditya ────────────────────────────────────────────────── */
const player = new THREE.Group();
const bodyRoot = new THREE.Group();
player.add(bodyRoot);

// Legs
addVoxel(bodyRoot, -0.18, 0.35, 0, 0.28, 0.7, 0.28, NAVY);
addVoxel(bodyRoot, 0.18, 0.35, 0, 0.28, 0.7, 0.28, NAVY);
// Shoes
addVoxel(bodyRoot, -0.18, 0.08, 0.06, 0.3, 0.16, 0.38, BROWN);
addVoxel(bodyRoot, 0.18, 0.08, 0.06, 0.3, 0.16, 0.38, BROWN);
// Torso (suit)
addVoxel(bodyRoot, 0, 1.05, 0, 0.72, 0.85, 0.42, NAVY);
// Shirt / tie strip
addVoxel(bodyRoot, 0, 1.1, 0.22, 0.22, 0.55, 0.06, SHIRT);
addVoxel(bodyRoot, 0, 1.05, 0.24, 0.1, 0.45, 0.05, 0x1a1a22);
// Arms
addVoxel(bodyRoot, -0.52, 1.0, 0, 0.26, 0.7, 0.26, NAVY);
addVoxel(bodyRoot, 0.52, 1.0, 0, 0.26, 0.7, 0.26, NAVY);
// Hands
addVoxel(bodyRoot, -0.52, 0.58, 0.02, 0.22, 0.18, 0.22, SKIN);
addVoxel(bodyRoot, 0.52, 0.58, 0.02, 0.22, 0.18, 0.22, SKIN);
// Neck
addVoxel(bodyRoot, 0, 1.55, 0, 0.22, 0.18, 0.2, SKIN);
// Head
const head = addVoxel(bodyRoot, 0, 1.85, 0, 0.52, 0.52, 0.52, SKIN);

// Face texture on front of head
const faceLoader = new THREE.TextureLoader();
faceLoader.load(
  "face-voxel.png",
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.46),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    face.position.set(0, 1.85, 0.27);
    bodyRoot.add(face);
  },
  undefined,
  () => {
    // Fallback painted face if texture fails
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#c4a07a";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#1a1410";
    ctx.fillRect(8, 12, 4, 4);
    ctx.fillRect(20, 12, 4, 4);
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(12, 20, 8, 3);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.46),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    face.position.set(0, 1.85, 0.27);
    bodyRoot.add(face);
  }
);

// Curly hair — irregular voxel mass
const hairOffsets = [
  [0, 0.32, 0, 0.56, 0.28, 0.56],
  [-0.22, 0.22, -0.1, 0.28, 0.28, 0.28],
  [0.22, 0.24, -0.08, 0.26, 0.26, 0.28],
  [-0.18, 0.18, 0.18, 0.24, 0.22, 0.22],
  [0.16, 0.2, 0.2, 0.24, 0.22, 0.22],
  [0, 0.38, -0.18, 0.34, 0.22, 0.28],
  [-0.28, 0.1, 0, 0.18, 0.28, 0.4],
  [0.28, 0.1, 0, 0.18, 0.28, 0.4],
  [0.05, 0.42, 0.1, 0.22, 0.18, 0.22],
  [-0.08, 0.4, 0.05, 0.2, 0.16, 0.2],
];
for (const [ox, oy, oz, sx, sy, sz] of hairOffsets) {
  addVoxel(bodyRoot, ox, 1.85 + oy, oz, sx, sy, sz, HAIR);
}

player.position.set(0, 0.275, 1.5);
scene.add(player);

const playerState = {
  vy: 0,
  onGround: true,
  facing: 0,
  width: 0.55,
  depth: 0.45,
  height: 2.15,
};

/* ── input ───────────────────────────────────────────────────────── */
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "Escape") closeStory();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function bindPad(btn) {
  const code = btn.dataset.key;
  const down = (e) => {
    e.preventDefault();
    keys.add(code);
  };
  const up = (e) => {
    e.preventDefault();
    keys.delete(code);
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointerleave", up);
  btn.addEventListener("pointercancel", up);
}
document.querySelectorAll(".mobile-pad [data-key]").forEach(bindPad);

storyClose.addEventListener("click", closeStory);

function openStory(id) {
  const p = PROJECTS[id];
  if (!p) return;
  storyTags.textContent = p.tags;
  storyTitle.textContent = p.title;
  storyBody.textContent = p.body;
  storyStack.innerHTML = "";
  for (const s of p.stack) {
    const span = document.createElement("span");
    span.textContent = s;
    storyStack.appendChild(span);
  }
  storyLink.href = p.href;
  storyLink.textContent = p.linkLabel;
  storyEl.hidden = false;
  storyEl.classList.add("open");
}

function closeStory() {
  storyEl.classList.remove("open");
  setTimeout(() => {
    if (!storyEl.classList.contains("open")) storyEl.hidden = true;
  }, 350);
}

/* ── physics / camera ────────────────────────────────────────────── */
const MOVE_SPEED = 7.5;
const JUMP_V = 9.2;
const GRAVITY = 22;
const camOffset = new THREE.Vector3(0, 7.5, 11);
const camLook = new THREE.Vector3();
const camPos = new THREE.Vector3();
let activeIsland = null;
let hintTimer = 0;

function groundedPlatform(px, pz, py) {
  let best = null;
  let bestY = -Infinity;
  for (const p of platforms) {
    if (px >= p.minX - 0.15 && px <= p.maxX + 0.15 && pz >= p.minZ - 0.15 && pz <= p.maxZ + 0.15) {
      if (py >= p.topY - 0.35 && py <= p.topY + 0.55 && p.topY > bestY) {
        best = p;
        bestY = p.topY;
      }
    }
  }
  return best;
}

function updatePlayer(dt) {
  let ix = 0;
  let iz = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) iz -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iz += 1;

  // Camera-relative: forward is -Z in world for our chase cam
  const len = Math.hypot(ix, iz) || 1;
  ix /= len;
  iz /= len;

  if (ix || iz) {
    player.position.x += ix * MOVE_SPEED * dt;
    player.position.z += iz * MOVE_SPEED * dt;
    playerState.facing = Math.atan2(ix, iz);
    bodyRoot.rotation.y = playerState.facing;
  }

  // Jump
  const wantJump = keys.has("Space");
  if (wantJump && playerState.onGround) {
    playerState.vy = JUMP_V;
    playerState.onGround = false;
  }

  playerState.vy -= GRAVITY * dt;
  player.position.y += playerState.vy * dt;

  const plat = groundedPlatform(player.position.x, player.position.z, player.position.y);
  if (plat && playerState.vy <= 0) {
    player.position.y = plat.topY;
    playerState.vy = 0;
    playerState.onGround = true;

    if (plat.id && plat.id !== activeIsland) {
      activeIsland = plat.id;
      openStory(plat.id);
      plat.visited = true;
    } else if (!plat.id) {
      // hub / stepping stone — keep story if already open, don't clear
    }
  } else if (!plat) {
    playerState.onGround = false;
    if (player.position.y < -8) {
      // Respawn
      player.position.set(0, 2, 1.5);
      playerState.vy = 0;
      activeIsland = null;
      closeStory();
    }
  }

  // Leave island bounds → close story after a beat
  if (activeIsland) {
    const cur = platforms.find((p) => p.id === activeIsland);
    if (cur) {
      const on =
        player.position.x >= cur.minX - 0.4 &&
        player.position.x <= cur.maxX + 0.4 &&
        player.position.z >= cur.minZ - 0.4 &&
        player.position.z <= cur.maxZ + 0.4;
      if (!on && playerState.onGround) {
        activeIsland = null;
        closeStory();
      }
    }
  }

  // Bob hair / idle
  const bob = playerState.onGround && (ix || iz) ? Math.sin(performance.now() * 0.018) * 0.04 : 0;
  bodyRoot.position.y = bob;
}

function updateCamera(dt) {
  camPos.copy(player.position).add(camOffset);
  camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
  camLook.set(player.position.x, player.position.y + 1.4, player.position.z);
  camera.lookAt(camLook);
}

/* ── loop ────────────────────────────────────────────────────────── */
let last = performance.now();
let hintHidden = false;

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  updatePlayer(dt);
  updateCamera(dt);

  // Float decor
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.bob != null) {
      obj.position.y = obj.userData.baseY + Math.sin(now * 0.001 + obj.userData.bob) * 0.35;
      obj.rotation.y += dt * 0.4;
    }
  });

  hintTimer += dt;
  if (!hintHidden && hintTimer > 8) {
    hintEl.classList.add("fade");
    hintHidden = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Demo / screenshot helpers: ?at=pulsex teleports + opens story */
{
  const at = new URLSearchParams(location.search).get("at");
  if (at && PROJECTS[at]) {
    const plat = platforms.find((p) => p.id === at);
    if (plat) {
      player.position.set(
        (plat.minX + plat.maxX) / 2,
        plat.topY + 0.05,
        (plat.minZ + plat.maxZ) / 2
      );
      playerState.vy = 0;
      playerState.onGround = true;
      activeIsland = at;
      openStory(at);
      camera.position.copy(player.position).add(camOffset);
      camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z);
    }
  }
}

requestAnimationFrame(frame);
