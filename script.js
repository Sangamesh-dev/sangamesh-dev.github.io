(function () {
  'use strict';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hdr = $('#hdr');
  const hdrH = () => (hdr ? hdr.offsetHeight : 0);

  // ── MOBILE MENU ───────────────────────────────────────────
  const menuBtn = $('#menu-btn');
  const menu = $('#menu');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // ── DUBLIN CLOCK ─────────────────────────────
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 30000);
  }

  // ── TONE: header (and guide) take the colours of the section beneath them ──
  const zoneSel = '.hero, .intro, .work-head, .chapter, .rail, .toolkit, .about, .contact, .site-foot, .case-hero, .case-demo, .case-front, .case-back, .case-next';
  const themeMeta = $('meta[name="theme-color"]');
  function zoneAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest(zoneSel);
  }
  function colorsOf(zone) {
    const cs = getComputedStyle(zone);
    let bg = cs.backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = getComputedStyle(document.body).backgroundColor;
    return { bg, fg: cs.color };
  }
  let lastHeaderZone = null;
  function updateTone() {
    if (!hdr) return;
    const zone = zoneAt(window.innerWidth / 2, hdrH() + 24);
    if (zone && zone !== lastHeaderZone) {
      lastHeaderZone = zone;
      const { bg, fg } = colorsOf(zone);
      hdr.style.setProperty('--hdr-bg', bg);
      hdr.style.setProperty('--hdr-fg', fg);
      if (themeMeta) themeMeta.content = bg;
    }
  }

  // ── ACTIVE NAV ────────────────────────────────────────────
  const navLinks = $$('.hdr-nav a, .menu a').filter((a) => a.hash && a.hash.length > 1 && !a.classList.contains('hdr-logo'));
  function updateNav() {
    if (!navLinks.length || !$('#work')) return;
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight * 0.5);
    const section = el && el.closest('#work, #toolkit, #about, #contact');
    const id = section ? section.id : null;
    navLinks.forEach((a) => {
      if (id && a.hash === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  // ── DOT-MATRIX FIELDS ─────────────────────────────────────
  // Each canvas renders a brightness field as a grid of dots (Christen-style),
  // drawn in the canvas's CSS colour. Animated only while on screen.
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const deg = Math.PI / 180;

  const FIELDS = {
    orb: {
      density: 78,
      value(nx, ny, t, s, ix, iy) {
        const R = 0.84;
        const d2 = nx * nx + ny * ny;
        if (d2 < R * R) {
          const nz = Math.sqrt(R * R - d2) / R;
          const px = nx / R, py = ny / R;
          let lx = -0.55 + 0.45 * Math.cos(t * 0.35) + s.px * 0.9;
          let ly = -0.6 + 0.25 * Math.sin(t * 0.27) + s.py * 0.9;
          const ll = Math.hypot(lx, ly, 0.85);
          const lam = Math.max(0, (px * lx + py * ly + nz * 0.85) / ll);
          const band = Math.exp(-Math.pow(py - Math.sin(t * 0.45) * 0.85, 2) / 0.003) * 0.35 * nz;
          return clamp(0.06 + Math.pow(lam, 1.35) * 0.94 + band, 0, 1);
        }
        return ix % 4 === 0 && iy % 4 === 0 ? 0.24 : 0;
      },
    },
    neural: {
      density: 70,
      value(nx, ny, t) {
        const d = Math.hypot(nx, ny);
        if (Math.abs(d - 0.2) < 0.035) return 1;
        if (d < 0.26) return 0;
        const a = (Math.atan2(ny, nx) + Math.PI) / (Math.PI * 2) * 44;
        const k = Math.floor(a);
        const f = a - k;
        const len = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.7 + hash(k) * 9));
        if (f < 0.22 && d < len) return 1 - ((d - 0.26) / len) * 0.55;
        return 0;
      },
    },
    waves: {
      density: 72,
      value(nx, ny, t) {
        let v = 0;
        for (let k = 0; k < 13; k++) {
          const y0 = -0.66 + k * 0.11;
          const env = Math.exp(-Math.pow(nx * 1.15, 2) * 2.4);
          const amp = 0.24 * env * (0.55 + 0.45 * Math.sin(k * 1.31 + t * 0.6));
          const y = y0 - amp * (0.55 + 0.45 * Math.sin(nx * 7 + k * 0.9 + t * 0.9));
          if (Math.abs(ny - y) < 0.032) v = Math.max(v, 0.6 + env * 0.4);
        }
        return v;
      },
    },
    radar: {
      density: 70,
      value(nx, ny, t) {
        const d = Math.hypot(nx, ny);
        if (d > 0.92) return 0;
        let v = 0.05;
        if ([0.3, 0.6, 0.9].some((r) => Math.abs(d - r) < 0.018)) v = 0.55;
        if (Math.abs(nx) < 0.012 || Math.abs(ny) < 0.012) v = Math.max(v, 0.35);
        const sweep = (t * 0.9) % (Math.PI * 2);
        let delta = sweep - (Math.atan2(ny, nx) + Math.PI);
        delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (delta < 1.3) v = Math.max(v, (1 - delta / 1.3) * 0.95);
        for (const [bx, by] of [[0.36, -0.22], [-0.5, 0.31], [0.12, 0.62], [-0.2, -0.55]]) {
          if (Math.hypot(nx - bx, ny - by) < 0.05) v = 1;
        }
        return v;
      },
    },
    globe: {
      density: 58,
      lon0: 36, lat0: 28,
      value(nx, ny, t, s) {
        const R = 0.9;
        const d2 = nx * nx + ny * ny;
        if (d2 > R * R) return 0;
        const z = Math.sqrt(R * R - d2) / R;
        const x = nx / R, y = -ny / R;
        const { lat, lon } = s.inverse(x, y, z);
        // Dotted sphere shaded towards the limb, with a faint 20° graticule
        let v = 0.2 + 0.32 * z;
        const glat = Math.abs(((lat + 900) % 20) - 10);
        const glon = Math.abs(((lon + 900) % 20) - 10);
        if (glat > 8.6 || glon > 8.6) v += 0.28;
        return clamp(v, 0, 1);
      },
    },
  };

  // Orthographic projection helpers for the globe
  function makeGlobe(lon0, lat0) {
    const c0 = Math.cos(lat0 * deg), s0 = Math.sin(lat0 * deg);
    return {
      lon0, lat0,
      project(lat, lon) {
        const la = lat * deg, lo = (lon - this.lon0) * deg;
        const x = Math.cos(la) * Math.sin(lo);
        const y = c0 * Math.sin(la) - s0 * Math.cos(la) * Math.cos(lo);
        const z = s0 * Math.sin(la) + c0 * Math.cos(la) * Math.cos(lo);
        return { x, y, z };
      },
      inverse(x, y, z) {
        const lat = Math.asin(clamp(y * c0 + z * s0, -1, 1));
        const lon = this.lon0 * deg + Math.atan2(x, z * c0 - y * s0);
        return { lat: lat / deg, lon: lon / deg };
      },
    };
  }
  function slerpPoints(a, b, n) {
    const toV = ([lat, lon]) => [Math.cos(lat * deg) * Math.cos(lon * deg), Math.cos(lat * deg) * Math.sin(lon * deg), Math.sin(lat * deg)];
    const A = toV(a), B = toV(b);
    const dot = clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1);
    const w = Math.acos(dot);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const k1 = Math.sin((1 - f) * w) / Math.sin(w), k2 = Math.sin(f * w) / Math.sin(w);
      const v = [A[0] * k1 + B[0] * k2, A[1] * k1 + B[1] * k2, A[2] * k1 + B[2] * k2];
      pts.push([Math.asin(v[2]) / deg, Math.atan2(v[1], v[0]) / deg, Math.sin(f * Math.PI)]);
    }
    return pts;
  }
  const BLR = [12.97, 77.59], DUB = [53.35, -6.26];
  const ARC = slerpPoints(BLR, DUB, 64);

  const fields = [];
  function initField(canvas) {
    const def = FIELDS[canvas.dataset.field];
    if (!def) return;
    const f = {
      canvas, def, ctx: canvas.getContext('2d'),
      state: { px: 0, py: 0, tx: 0, ty: 0, ...(canvas.dataset.field === 'globe' ? makeGlobe(def.lon0, def.lat0) : {}) },
      visible: false, w: 0, h: 0, dpr: 1,
    };
    fields.push(f);
    sizeField(f);
    drawField(f, 0);
    return f;
  }
  function sizeField(f) {
    const rect = f.canvas.getBoundingClientRect();
    f.w = Math.max(1, rect.width);
    f.h = Math.max(1, rect.height);
    f.dpr = Math.min(2, window.devicePixelRatio || 1);
    f.canvas.width = Math.round(f.w * f.dpr);
    f.canvas.height = Math.round(f.h * f.dpr);
    const cells = f.w < 160 ? 20 : f.def.density;
    f.step = Math.max(4, Math.min(f.w, f.h) / cells);
  }
  function drawField(f, t) {
    const { ctx, w, h, step, def, state } = f;
    ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(f.canvas).color;
    const half = Math.min(w, h) / 2;
    const cx = w / 2, cy = h / 2;
    ctx.beginPath();
    let iy = 0;
    for (let y = step / 2; y < h; y += step, iy++) {
      let ix = 0;
      for (let x = step / 2; x < w; x += step, ix++) {
        const v = def.value((x - cx) / half, (y - cy) / half, t, state, ix, iy);
        if (v > 0.03) {
          const r = v * step * 0.46;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
    if (f.canvas.dataset.field === 'globe') drawJourney(f, t);
  }
  function drawJourney(f) {
    const { ctx, w, h, state } = f;
    const half = Math.min(w, h) / 2, cx = w / 2, cy = h / 2, R = 0.9 * half;
    const red = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#d81c0e';
    ctx.fillStyle = red;
    ctx.beginPath();
    for (const [lat, lon, lift] of ARC) {
      const p = state.project(lat, lon);
      if (p.z < 0) continue;
      const k = 1 + lift * 0.18;
      const x = cx + p.x * R * k, y = cy - p.y * R * k;
      ctx.moveTo(x + 2.2, y);
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.font = '500 11px "JetBrains Mono", monospace';
    for (const [[lat, lon], label] of [[BLR, 'BLR'], [DUB, 'DUB']]) {
      const p = state.project(lat, lon);
      if (p.z < 0) continue;
      const x = cx + p.x * R, y = cy - p.y * R;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(label, x + 10, y + 4);
    }
  }

  // Pointer moves the light on interactive orbs (hero)
  function bindPointer(f) {
    const zone = f.canvas.closest('.hero') || f.canvas;
    zone.addEventListener('pointermove', (e) => {
      const r = f.canvas.getBoundingClientRect();
      f.state.tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.2, 1.2);
      f.state.ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.2, 1.2);
    });
    zone.addEventListener('pointerleave', () => { f.state.tx = 0; f.state.ty = 0; });
  }

  $$('canvas.dots').forEach((c) => {
    const f = initField(c);
    if (f && c.hasAttribute('data-interactive')) bindPointer(f);
  });

  const fieldObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const f = fields.find((x) => x.canvas === en.target);
      if (f) f.visible = en.isIntersecting;
    });
  });
  fields.forEach((f) => fieldObserver.observe(f.canvas));

  let last = 0;
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (reduced() || document.hidden || now - last < 33) return;
    last = now;
    const t = (now - t0) / 1000;
    for (const f of fields) {
      if (!f.visible) continue;
      f.state.px += (f.state.tx - f.state.px) * 0.08;
      f.state.py += (f.state.ty - f.state.py) * 0.08;
      if (f.canvas.dataset.field === 'globe') f.state.lon0 = FIELDS.globe.lon0 + Math.sin(t * 0.18) * 10;
      drawField(f, t);
    }
  }
  requestAnimationFrame(frame);

  // ── SOUND: opt-in interface blips (WebAudio). Silent until switched on. ──
  const soundBtn = $('#sound');
  const AC = window.AudioContext || window.webkitAudioContext;
  let audio = null;
  let soundOn = false;
  function blip(freq = 640, dur = 0.05, vol = 0.035) {
    if (!soundOn || !audio) return;
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function chatter(words) {
    for (let i = 0; i < Math.min(words, 8); i++) setTimeout(() => blip(520 + Math.random() * 260, 0.045), i * 70);
  }
  if (soundBtn && AC) {
    soundBtn.hidden = false;
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      if (soundOn) {
        if (!audio) audio = new AC();
        if (audio.state === 'suspended') audio.resume();
        blip(660, 0.06);
        setTimeout(() => blip(990, 0.08), 80);
      }
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.title = soundOn ? 'Sound on' : 'Sound off';
    });
    document.addEventListener('click', (e) => { if (e.target.closest('.btn, .chip, .rail-arrow')) blip(880, 0.03, 0.025); });
  }

  // ── PIXEL MASCOT ──────────────────────────────────────────
  // An original cartoon of me (curly hair, beard, big grin, navy suit, light
  // tie), in the style of Seb's site: drawn as soft grey shapes into a small
  // offscreen canvas, ordered-dithered to ink/paper pixels and scaled up with
  // image-rendering: pixelated. It waves, blinks, talks while the bubble types
  // and looks toward the pointer. data-style="photo" + data-src dithers a
  // photo instead.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const INK = [11, 11, 12], PAPER = [251, 251, 248];
  const portraits = $$('canvas[data-portrait]').map((canvas) => ({
    canvas, ctx: canvas.getContext('2d'), img: null,
    head: canvas.dataset.crop === 'head', cell: 2, visible: true,
    look: [0, 0], lookTarget: [0, 0], talk: [0, 0],
  }));
  const heroPortrait = portraits.find((p) => !p.head);
  const photoMode = !!(heroPortrait && heroPortrait.canvas.dataset.style === 'photo');
  const pbuf = document.createElement('canvas');
  const pctx = pbuf.getContext('2d', { willReadFrequently: true });

  // One outfit per featured project, worn on top of the hair
  let outfitCtx = null, outfitS = 0;
  function drawOutfit(kind, hx, hy, fx, fy, { ball, line, g }) {
    const c = outfitCtx, s = outfitS;
    if (!kind || !c) return;
    if (kind === 'glasses') {
      [[0.49, 0.48], [0.61, 0.48]].forEach(([x, y]) => {
        c.strokeStyle = g(0.04); c.lineWidth = 0.012 * s;
        c.beginPath(); c.arc((x + fx) * s, (y + fy) * s, 0.037 * s, 0, Math.PI * 2); c.stroke();
      });
      line([[0.527 + fx, 0.475 + fy], [0.573 + fx, 0.475 + fy]], 0.01, 0.04);
      line([[0.453 + fx, 0.472 + fy], [0.356 + hx, 0.48 + hy]], 0.009, 0.04);
      line([[0.647 + fx, 0.472 + fy], [0.744 + hx, 0.48 + hy]], 0.009, 0.04);
    } else if (kind === 'beanie') {
      c.save();
      c.beginPath(); c.ellipse((0.55 + hx) * s, (0.335 + hy) * s, 0.24 * s, 0.22 * s, 0, Math.PI, 0); c.closePath(); c.clip();
      ball(0.55 + hx, 0.27 + hy, 0.25, 0.22, 0.7, 0.3);
      for (let k = 0; k < 11; k++) line([[0.325 + k * 0.045 + hx, 0.1 + hy], [0.325 + k * 0.045 + hx, 0.335 + hy]], 0.006, 0.36);
      c.restore();
      ball(0.55 + hx, 0.335 + hy, 0.245, 0.04, 0.55, 0.26); // folded cuff
      ball(0.55 + hx, 0.1 + hy, 0.036, 0.036, 0.85, 0.45); // pompom
    } else if (kind === 'headset') {
      // Light plastic with a dark outline, so it reads against dark hair
      c.lineCap = 'round';
      const band = () => { c.beginPath(); c.ellipse((0.55 + hx) * s, (0.46 + hy) * s, 0.212 * s, 0.335 * s, 0, Math.PI * 1.07, Math.PI * 1.93); c.stroke(); };
      c.strokeStyle = g(0.04); c.lineWidth = 0.042 * s; band();
      c.strokeStyle = g(0.86); c.lineWidth = 0.026 * s; band();
      [0.344, 0.756].forEach((x) => { ball(x + hx, 0.49 + hy, 0.046, 0.072, 0.1, 0.02); ball(x + hx, 0.49 + hy, 0.038, 0.064, 0.92, 0.5); });
      line([[0.352 + hx, 0.535 + hy], [0.41 + fx, 0.6 + fy], [0.475 + fx, 0.604 + fy]], 0.018, 0.04); // mic boom outline
      line([[0.352 + hx, 0.535 + hy], [0.41 + fx, 0.6 + fy], [0.475 + fx, 0.604 + fy]], 0.009, 0.85);
      ball(0.48 + fx, 0.604 + fy, 0.019, 0.019, 0.9, 0.45);
    } else if (kind === 'buckethat') {
      ball(0.55 + hx, 0.318 + hy, 0.32, 0.055, 0.78, 0.4); // brim
      ball(0.55 + hx, 0.215 + hy, 0.215, 0.12, 0.82, 0.45); // crown
      c.fillStyle = g(0.22);
      c.fillRect((0.345 + hx) * s, (0.272 + hy) * s, 0.41 * s, 0.024 * s); // band
    }
  }

  // The character, in the spirit of Seb's mascot: a big round head, soft fluffy
  // hair swept across the forehead, simple features, a rounded sweater body,
  // all lit like a soft 3D render so the dither does the shading. My own
  // touches: dark hair and a beard.
  function drawMascot(c, s, st) {
    outfitCtx = c; outfitS = s;
    const g = (v) => { const k = Math.round(clamp(v, 0, 1) * 255); return `rgb(${k},${k},${k})`; };
    // Soft "3D" ball: radial gradient lit from the upper left
    const ball = (cx, cy, rx, ry, hi, lo, rot = 0) => {
      const gr = c.createRadialGradient((cx - rx * 0.35) * s, (cy - ry * 0.4) * s, 0, cx * s, cy * s, Math.max(rx, ry) * 1.25 * s);
      gr.addColorStop(0, g(hi));
      gr.addColorStop(1, g(lo));
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, Math.PI * 2);
      c.fill();
    };
    const line = (pts, w, v) => {
      c.strokeStyle = g(v); c.lineWidth = w * s; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
      c.stroke();
    };
    // A limb: dark edge first, then the lit sleeve, so it reads against the body
    const limb = (pts, w, v) => { line(pts, w + 0.014, 0.18); line(pts, w, v); };
    const [lkx, lky] = st.look;
    const hx = lkx * 0.012, hy = lky * 0.008; // head turns a little toward the pointer
    const fx = hx + lkx * 0.012, fy = hy + lky * 0.01; // features move a little further
    const X = (v) => (v + hx) * s, Y = (v) => (v + hy) * s;

    // Body: a rounded sweater with a crew neck
    ball(0.55, 1.1, 0.42, 0.37, 0.9, 0.48);

    if (st.gesture === 'point') {
      // Pointing arm: reaches out to the right, toward the project beside him
      const sh = [0.77, 0.9], el = [0.855, 0.8];
      c.save();
      c.translate(sh[0] * s, sh[1] * s);
      c.rotate(st.wave * 0.2);
      c.translate(-sh[0] * s, -sh[1] * s);
      limb([sh, el, [0.9, 0.712]], 0.072, 0.72);
      ball(0.915, 0.684, 0.038, 0.034, 0.98, 0.66);
      line([[0.93, 0.668], [0.972, 0.64]], 0.021, 0.92); // index finger
      line([[0.9, 0.66], [0.913, 0.645]], 0.018, 0.86); // thumb
      c.restore();
    } else if (st.gesture === 'wave') {
      // Waving arm: shoulder → elbow, forearm + hand rotate about the elbow
      const sh = [0.28, 0.92], el = [0.18, 0.8];
      limb([sh, el], 0.08, 0.72);
      c.save();
      c.translate(el[0] * s, el[1] * s);
      c.rotate(st.wave);
      c.translate(-el[0] * s, -el[1] * s);
      limb([el, [0.172, 0.66]], 0.072, 0.76);
      ball(0.172, 0.6, 0.046, 0.054, 0.98, 0.66);
      [[-0.032, -0.058], [-0.01, -0.072], [0.013, -0.07], [0.033, -0.054]].forEach(([dx, dy]) => line([[0.172 + dx * 0.55, 0.59 + dy * 0.3], [0.172 + dx, 0.59 + dy]], 0.021, 0.9));
      line([[0.205, 0.617], [0.232, 0.583]], 0.021, 0.86); // thumb
      c.restore();
    }

    // Short neck, shaded under the chin, sitting in the crew neck
    const ng = c.createLinearGradient(0, 0.62 * s, 0, 0.79 * s);
    ng.addColorStop(0, g(0.42)); ng.addColorStop(1, g(0.74));
    c.fillStyle = ng;
    c.fillRect(0.497 * s, 0.62 * s, 0.106 * s, 0.138 * s);
    c.strokeStyle = g(0.4); c.lineWidth = 0.018 * s;
    c.beginPath(); c.ellipse(0.55 * s, 0.753 * s, 0.072 * s, 0.024 * s, 0, 0, Math.PI); c.stroke();

    // Ears
    ball(0.352 + hx, 0.49 + hy, 0.024, 0.042, 0.86, 0.5);
    ball(0.748 + hx, 0.49 + hy, 0.024, 0.042, 0.86, 0.5);

    // Head: big and round
    const cx = 0.55 + hx, cy = 0.47 + hy;
    const headPath = () => { c.beginPath(); c.ellipse(cx * s, cy * s, 0.2 * s, 0.205 * s, 0, 0, Math.PI * 2); };
    const skin = () => {
      const gr = c.createRadialGradient((cx - 0.07) * s, (cy - 0.08) * s, 0, cx * s, (cy + 0.02) * s, 0.28 * s);
      gr.addColorStop(0, g(0.96)); gr.addColorStop(0.6, g(0.78)); gr.addColorStop(1, g(0.5));
      c.fillStyle = gr;
      headPath(); c.fill();
    };
    skin();
    // Beard: soft stubble around the jaw, cheeks and nose left clear
    c.save();
    headPath(); c.clip();
    const bg = c.createLinearGradient(0, (cy + 0.06) * s, 0, (cy + 0.21) * s);
    bg.addColorStop(0, g(0.6)); bg.addColorStop(1, g(0.3));
    c.fillStyle = bg;
    c.fillRect(0, (cy + 0.03) * s, s, 0.3 * s);
    c.beginPath();
    c.ellipse(cx * s, (cy - 0.005) * s, 0.168 * s, 0.158 * s, 0, 0, Math.PI * 2);
    c.clip();
    skin();
    c.restore();

    // Nose: a soft bump with a little shadow
    ball(0.55 + fx, 0.53 + fy, 0.021, 0.019, 0.95, 0.68);
    line([[0.538 + fx, 0.547 + fy], [0.562 + fx, 0.547 + fy]], 0.006, 0.5);

    // Mouth: a laugh by default; an "o" when surprised; a pout when sulking
    const mo = st.mouth;
    const mx = 0.55 + fx, my = 0.574 + fy;
    if (st.expr === 'surprised' || st.expr === 'dizzy') {
      ball(mx, my + 0.014, 0.019, 0.025 + 0.006 * mo, 0.16, 0.02);
    } else if (st.expr === 'sulk') {
      c.strokeStyle = g(0.05); c.lineWidth = 0.011 * s; c.lineCap = 'round';
      c.beginPath(); c.arc(mx * s, (my + 0.03) * s, 0.026 * s, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
    } else {
      const mw = 0.058, mh = 0.024 + 0.032 * mo;
      const mouthPath = () => {
        c.beginPath();
        c.moveTo((mx - mw) * s, my * s);
        c.lineTo((mx + mw) * s, my * s);
        c.ellipse(mx * s, my * s, mw * s, mh * s, 0, 0, Math.PI);
        c.closePath();
      };
      c.fillStyle = g(0.03);
      mouthPath(); c.fill();
      c.save();
      mouthPath(); c.clip();
      ball(mx, my + mh * 1.02, mw * 0.5, mh * 0.4, 0.62, 0.4); // tongue, low and small
      c.restore();
    }

    // Eyes: happy arcs, open with a glint, wide when surprised, X when dizzy,
    // heavy-lidded when sulking
    [[0.49, 0.48], [0.61, 0.48]].forEach(([ex, ey]) => {
      const x = (ex + fx) * s, y = (ey + fy) * s;
      c.strokeStyle = g(0.03); c.lineCap = 'round';
      if (st.expr === 'dizzy') {
        c.lineWidth = 0.01 * s;
        c.beginPath(); c.moveTo(x - 0.016 * s, y - 0.016 * s); c.lineTo(x + 0.016 * s, y + 0.016 * s);
        c.moveTo(x + 0.016 * s, y - 0.016 * s); c.lineTo(x - 0.016 * s, y + 0.016 * s); c.stroke();
      } else if (st.expr === 'sulk') {
        c.lineWidth = 0.011 * s;
        c.beginPath(); c.moveTo(x - 0.019 * s, y + 0.002 * s); c.lineTo(x + 0.019 * s, y + 0.002 * s); c.stroke();
        c.fillStyle = g(0.03);
        c.beginPath(); c.ellipse(x, y + 0.006 * s, 0.014 * s, 0.008 * s, 0, 0, Math.PI); c.fill();
      } else if (st.expr === 'happy' || st.blink > 0.6) {
        c.lineWidth = 0.012 * s;
        c.beginPath(); c.arc(x, y + 0.012 * s, 0.021 * s, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      } else {
        const wide = st.expr === 'surprised' ? 1.25 : 1;
        const eh = Math.max(0.004, 0.022 * wide * (1 - st.blink));
        c.fillStyle = g(0.03);
        c.beginPath(); c.ellipse(x, y, 0.018 * wide * s, eh * s, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = g(1);
        c.beginPath(); c.arc(x - 0.005 * s, y - 0.007 * s, 0.0055 * s, 0, Math.PI * 2); c.fill();
      }
    });
    // Brows: short, thick dashes; raised when surprised, knitted when sulking
    const by = st.expr === 'surprised' ? -0.014 : 0;
    const knit = st.expr === 'sulk' ? 0.008 : 0;
    line([[0.468 + fx, 0.428 + fy + by - knit], [0.513 + fx, 0.424 + fy + by + knit]], 0.022, 0.05);
    line([[0.587 + fx, 0.424 + fy + by + knit], [0.632 + fx, 0.43 + fy + by - knit]], 0.022, 0.05);

    // Hair: a soft, fluffy volume swept diagonally across the forehead, built
    // from overlapping rounded clumps under one light so it shades as a mass
    const hg = c.createRadialGradient(X(0.45), Y(0.2), 0, X(0.56), Y(0.3), 0.3 * s);
    hg.addColorStop(0, g(0.52)); hg.addColorStop(0.5, g(0.28)); hg.addColorStop(1, g(0.08));
    c.fillStyle = hg;
    [[0.56, 0.255, 0.2, 0.095], [0.375, 0.37, 0.042, 0.075], [0.405, 0.285, 0.07, 0.07], [0.475, 0.215, 0.085, 0.07],
     [0.57, 0.19, 0.095, 0.07], [0.665, 0.21, 0.085, 0.075], [0.725, 0.285, 0.065, 0.08], [0.755, 0.37, 0.042, 0.075]]
      .forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(X(x), Y(y), rx * s, ry * s, 0, 0, Math.PI * 2); c.fill(); });
    // The fringe: an arch whose high point sits right of centre, so the hair
    // sweeps across the forehead instead of sitting straight on it
    c.beginPath();
    c.moveTo(X(0.35), Y(0.44));
    c.lineTo(X(0.355), Y(0.28));
    c.lineTo(X(0.755), Y(0.28));
    c.lineTo(X(0.762), Y(0.43));
    c.quadraticCurveTo(X(0.725), Y(0.34), X(0.645), Y(0.31));
    c.quadraticCurveTo(X(0.56), Y(0.29), X(0.48), Y(0.325));
    c.quadraticCurveTo(X(0.405), Y(0.355), X(0.375), Y(0.42));
    c.closePath();
    c.fill();
    // Soft lighter clumps give the fluffy texture
    c.lineCap = 'round';
    [[0.44, 0.27, 0.04], [0.53, 0.225, 0.045], [0.625, 0.235, 0.042], [0.7, 0.29, 0.035], [0.41, 0.345, 0.03], [0.57, 0.29, 0.038], [0.49, 0.3, 0.032]]
      .forEach(([x, y, r], k) => {
        c.strokeStyle = g(k < 4 ? 0.56 : 0.44); c.lineWidth = 0.012 * s;
        c.beginPath(); c.arc(X(x), Y(y), r * s, Math.PI * 1.1, Math.PI * 1.85); c.stroke();
      });
    drawOutfit(st.outfit, hx, hy, fx, fy, { ball, line, g });
  }

  function renderPortrait(p, cell) {
    const w = p.canvas.clientWidth;
    if (!w) return;
    const n = Math.max(8, Math.round(w / cell)); // square canvas, n × n pixels
    if (p.canvas.width !== n) { p.canvas.width = n; p.canvas.height = n; }
    pbuf.width = n; pbuf.height = n;
    pctx.clearRect(0, 0, n, n);
    if (p.img) {
      // Photo: a square crop from the top of the frame (data-zoom / data-focus-x)
      const iw = p.img.naturalWidth, ih = p.img.naturalHeight;
      const opts = heroPortrait.canvas.dataset;
      const side = Math.min(iw, ih) * (parseFloat(opts.zoom) || 1) * (p.head ? 0.7 : 1);
      const sx = clamp((parseFloat(opts.focusX) || 0.5) * iw - side / 2, 0, iw - side);
      pctx.drawImage(p.img, sx, 0, side, side, 0, 0, n, n);
    } else {
      pctx.save();
      if (p.head) { pctx.scale(1.78, 1.78); pctx.translate(-0.27 * n, -0.15 * n); } // badge: the round head, framed on the face
      else {
        // When pointing, slide the figure left so the arm and hand fit the frame
        const pose = mascotPose(p);
        pctx.translate((pose.gesture === 'point' ? -0.15 : -0.075) * n, -0.01 * n); pctx.scale(1.12, 1.12);
        p.pose = pose;
      }
      drawMascot(pctx, n, p.pose || mascotPose(p));
      p.pose = null;
      pctx.restore();
    }
    let src;
    try { src = pctx.getImageData(0, 0, n, n).data; } catch (e) { p.img = null; return renderPortrait(p, cell); } // unreadable photo → mascot
    const tone = p.img ? toneMap(src, n) : null;
    const out = p.ctx.createImageData(n, n);
    const d = out.data;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 4;
        if (src[k + 3] < 128) continue;
        let lum = tone ? tone[j * n + i] : 0.06 + 0.94 * (src[k] / 255);
        if (p.head && !tone) lum = clamp((lum - 0.5) * 1.4 + 0.6, 0, 1); // small badge: more contrast keeps the face legible
        const c = lum > BAYER[(i & 3) + (j & 3) * 4] ? PAPER : INK;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    p.ctx.putImageData(out, 0, 0);
  }

  // Photo tone mapping: stretch the subject's own luminance range, sharpen
  // local detail and lift the shadows, so dark hair and a dark suit become a
  // dot texture instead of solid black.
  function toneMap(src, n) {
    const l = new Float32Array(n * n);
    const hist = new Uint32Array(256);
    let count = 0;
    for (let i = 0; i < n * n; i++) {
      const k = i * 4;
      l[i] = (0.299 * src[k] + 0.587 * src[k + 1] + 0.114 * src[k + 2]) / 255;
      if (src[k + 3] >= 128) { hist[Math.round(l[i] * 255)]++; count++; }
    }
    const pct = (q) => { let acc = 0; for (let b = 0; b < 256; b++) { acc += hist[b]; if (acc >= count * q) return b / 255; } return 1; };
    const lo = pct(0.03), hi = Math.max(lo + 0.05, pct(0.98));
    const r = Math.max(2, Math.round(n / 70));
    const tmp = new Float32Array(n * n), blur = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0, c = 0;
      for (let dd = -r; dd <= r; dd++) { const xx = x + dd; if (xx >= 0 && xx < n) { s += l[y * n + xx]; c++; } }
      tmp[y * n + x] = s / c;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0, c = 0;
      for (let dd = -r; dd <= r; dd++) { const yy = y + dd; if (yy >= 0 && yy < n) { s += tmp[yy * n + x]; c++; } }
      blur[y * n + x] = s / c;
    }
    const out = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const v = Math.pow(clamp((l[i] - lo) / (hi - lo) + (l[i] - blur[i]) * 1.4, 0, 1), 0.72);
      out[i] = 0.1 + 0.9 * v;
    }
    return out;
  }

  // ── Mascot animation: wave, blink, talk, look ────────────
  const born = performance.now();
  let nextBlink = born + 2200, blinkAt = -1;
  let waveAt = born + 300;
  function mascotPose(p) {
    const now = performance.now();
    const gesture = p.gestureOverride || p.gesture, expr = p.exprOverride || p.expr;
    if (reduced()) return { look: [0, 0], wave: -0.15, blink: 0, mouth: 0.75, outfit: p.outfit, gesture, expr };
    if (now > nextBlink) { blinkAt = now; nextBlink = now + 2600 + Math.random() * 2600; }
    const bt = (now - blinkAt) / 140;
    const blink = bt >= 0 && bt < 1 ? Math.sin(bt * Math.PI) : 0;
    const wt = (now - waveAt) / 1600;
    const wave = -0.15 + (wt >= 0 && wt < 1 ? Math.sin(wt * Math.PI * 6) * 0.32 * Math.sin(wt * Math.PI) : 0);
    if (wt >= 1) waveAt = now + 7000 + Math.random() * 3000;
    const talking = now > p.talk[0] && now < p.talk[1];
    const mouth = talking ? 0.35 + 0.65 * Math.abs(Math.sin((now - p.talk[0]) / 70)) : 0.75;
    const lt = p.lookOverride || p.lookTarget;
    p.look[0] += (lt[0] - p.look[0]) * 0.18;
    p.look[1] += (lt[1] - p.look[1]) * 0.18;
    return { look: p.look, wave, blink, mouth, outfit: p.outfit, gesture, expr };
  }
  // Talk while the bubble types itself out
  function mascotTalk(p, ms, delay = 0) {
    if (!p) return;
    const now = performance.now();
    p.talk = [now + delay, now + delay + ms];
  }
  const portraitCell = () => 2;
  function playPortrait(p) {
    if (reduced()) { renderPortrait(p, portraitCell()); return; }
    [24, 12, 6, portraitCell()].forEach((c, i) => setTimeout(() => { p.cell = c; renderPortrait(p, c); }, i * 110));
  }
  const pObserver = new IntersectionObserver((entries) => entries.forEach((en) => {
    const p = portraits.find((x) => x.canvas === en.target);
    if (p) p.visible = en.isIntersecting;
  }));
  portraits.forEach((p) => pObserver.observe(p.canvas));
  let lastMascot = 0;
  function mascotLoop(now) {
    requestAnimationFrame(mascotLoop);
    if (reduced() || document.hidden || now - lastMascot < 50) return; // ~20fps is plenty for pixel art
    lastMascot = now;
    portraits.forEach((p) => { if (p.visible && !p.img && p.canvas.clientWidth) renderPortrait(p, p.head ? 1.5 : p.cell); });
  }
  if (heroPortrait) {
    window.addEventListener('pointermove', (e) => {
      const r = heroPortrait.canvas.getBoundingClientRect();
      heroPortrait.lookTarget = [
        clamp((e.clientX - (r.left + r.width * 0.55)) / (r.width * 0.6), -1, 1),
        clamp((e.clientY - (r.top + r.height * 0.45)) / (r.height * 0.6), -1, 1),
      ];
    });
    document.addEventListener('pointerleave', () => { heroPortrait.lookTarget = [0, 0]; });
  }

  function startPortraits(srcUrl) {
    portraits.forEach((p) => {
      if (srcUrl) {
        const img = new Image();
        img.onload = () => { p.img = img; if (p.head) renderPortrait(p, 2); else playPortrait(p); };
        img.onerror = () => { if (p.head) renderPortrait(p, 2); else playPortrait(p); };
        img.src = srcUrl;
      } else if (p.head) renderPortrait(p, 2);
      else playPortrait(p);
    });
    requestAnimationFrame(mascotLoop);
  }
  const photoUrl = photoMode ? heroPortrait.canvas.dataset.src : '';
  if (photoUrl && location.protocol === 'file:') {
    // Opened from disk: browsers refuse to let a canvas read pixels from local
    // files, so load the same photo embedded as a data URI (images/portrait.js)
    const s = document.createElement('script');
    s.src = photoUrl.replace(/\.png$/, '.js');
    s.onload = () => startPortraits(window.PORTRAIT_DATA || '');
    s.onerror = () => startPortraits('');
    document.head.append(s);
  } else {
    startPortraits(photoUrl);
  }

  // ── HALFTONE ENTRY EFFECT ─────────────────────────────────
  // The real screenshot is always the resting state. When a preview first
  // scrolls into view, a dot-matrix copy resolves over it (large pixels →
  // halftone dots) and then dissolves away. Reduced motion skips the effect.
  const halftones = $$('.halftone');
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });

  // Area the image actually occupies inside its frame (object-fit: contain)
  function containRect(img, w, h) {
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
  }
  function renderHalftone(h, cell, final) {
    const img = h.querySelector('img');
    if (!img.complete || !img.naturalWidth) return;
    let c = h.querySelector('canvas');
    if (!c) { c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); h.append(c); }
    const w = h.clientWidth, ht = h.clientHeight;
    if (!w || !ht) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(w * dpr); c.height = Math.round(ht * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = containRect(img, w, ht);
    const cols = Math.max(1, Math.ceil(r.w / cell)), rows = Math.max(1, Math.ceil(r.h / cell));
    work.width = cols; work.height = rows;
    wctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, cols, rows);
    const data = wctx.getImageData(0, 0, cols, rows).data;
    ctx.clearRect(0, 0, w, ht);
    ctx.fillStyle = '#0b0a09';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        // Lift dark UI screenshots so the dots read as an image, not a void
        const lum = Math.min(1, 0.12 + (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255 * 1.4);
        const cx = r.x + x * cell, cy = r.y + y * cell;
        if (final) {
          const rad = Math.sqrt(lum) * cell * 0.5;
          ctx.moveTo(cx + cell / 2 + rad, cy + cell / 2);
          ctx.arc(cx + cell / 2, cy + cell / 2, rad, 0, Math.PI * 2);
        } else {
          ctx.rect(cx, cy, cell - 1, cell - 1);
          ctx.fillStyle = `rgba(244,241,234,${(lum * 0.9).toFixed(3)})`;
          ctx.fill();
          ctx.beginPath();
        }
      }
    }
    if (final) ctx.fill();
  }
  function playHalftone(h) {
    if (reduced()) { h.classList.add('is-resolved'); return; }
    const cell = Math.max(5, h.clientWidth / 110);
    const steps = [48, 30, 18, cell];
    let i = 0;
    const next = () => {
      if (i < steps.length) { renderHalftone(h, steps[i], i === steps.length - 1); i++; setTimeout(next, i === steps.length ? 420 : 90); }
      else h.classList.add('is-resolved');
    };
    next();
  }
  const htObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      htObserver.unobserve(en.target);
      const img = en.target.querySelector('img');
      if (img.loading === 'lazy') img.loading = 'eager';
      const go = () => playHalftone(en.target);
      if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
    });
  }, { threshold: 0.35 });
  halftones.forEach((h) => htObserver.observe(h));

  // Load every rail screenshot as soon as the rail approaches, so sideways
  // browsing never lands on an unloaded preview.
  const railEl = $('.rail');
  if (railEl) {
    const preload = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      $$('img[loading="lazy"]', railEl).forEach((img) => { img.loading = 'eager'; });
      preload.disconnect();
    }, { rootMargin: '100% 0px' });
    preload.observe(railEl);
  }

  // "View" label follows the pointer over a preview
  $$('.rail-media').forEach((m) => {
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      m.style.setProperty('--mx', `${e.clientX - r.left}px`);
      m.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ── INTRO: words fill in as you scroll (Seb) ──────────────
  const fill = $('[data-fill]');
  let words = [];
  if (fill) {
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.append(tok);
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; frag.append(s); }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) wrap(child);
      });
    };
    wrap(fill);
    words = $$('.w', fill);
  }
  function updateFill() {
    if (!words.length) return;
    if (reduced()) { words.forEach((w) => w.classList.add('on')); return; }
    const sec = fill.closest('.intro');
    const r = sec.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.6), 0, 1);
    const n = Math.round(p * words.length * 1.05);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  // ── FEATURED CHAPTERS: content rises into the sticky stage ─
  const chapters = $$('.chapter');
  const wide = window.matchMedia('(min-width: 861px)');
  function updateChapters() {
    const vh = window.innerHeight;
    chapters.forEach((c) => {
      if (!wide.matches || reduced()) { c.style.setProperty('--enter', 1); return; }
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      c.style.setProperty('--enter', clamp(1 - (r.top - hdrH()) / (vh * 0.85), 0, 1).toFixed(3));
    });
  }

  // ── PROJECT RAIL: pinned horizontal browsing (Christen) ───
  const rail = $('.rail');
  const track = $('#rail-track');
  const railViewport = $('.rail-viewport');
  const railCount = $('#rail-count');
  const railBar = $('#rail-bar');
  const railPrev = $('#rail-prev');
  const railNext = $('#rail-next');
  const dividers = $$('.rail-divider');
  let railDist = 0;
  let activeIdx = 0;
  const visibleCards = () => $$('.rail-card', track).filter((c) => !c.hidden);
  const pinned = () => rail && rail.classList.contains('is-pinned');
  // Card position along the track (the transformed track is the cards' offset parent)
  const posOf = (c) => c.offsetLeft;

  // Current horizontal offset of the rail (pinned: from page scroll; otherwise native scroll)
  function railOffset() {
    if (pinned()) return clamp(hdrH() - rail.getBoundingClientRect().top, 0, railDist);
    return railViewport.scrollLeft;
  }
  function layoutRail() {
    if (!rail) return;
    const pin = wide.matches && !reduced();
    rail.classList.toggle('is-pinned', pin);
    if (!pin) { rail.style.height = ''; track.style.transform = ''; railDist = 0; updateRail(); return; }
    railDist = Math.max(0, track.scrollWidth - railViewport.clientWidth);
    rail.style.height = `calc(100svh - var(--hdr-h) + ${railDist}px)`;
    updateRail();
  }
  function updateRail() {
    if (!rail) return;
    const x = railOffset();
    if (pinned()) {
      track.style.transform = `translate3d(${-x}px, 0, 0)`;
      railViewport.scrollLeft = 0;
    }
    const cards = visibleCards();
    if (!cards.length) return;
    let idx = cards.findIndex((c) => posOf(c) + c.offsetWidth * 0.5 > x);
    if (idx < 0) idx = cards.length - 1;
    const max = pinned() ? railDist : Math.max(0, railViewport.scrollWidth - railViewport.clientWidth);
    if (max > 0 && x >= max - 2) idx = cards.length - 1;
    activeIdx = idx;
    cards.forEach((c, i) => c.classList.toggle('is-active', i === idx && wide.matches));
    if (railCount) railCount.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    if (railBar) railBar.style.width = `${max > 0 ? (x / max) * 100 : 100}%`;
    if (railPrev) railPrev.disabled = idx === 0;
    if (railNext) railNext.disabled = idx === cards.length - 1;
  }
  // Bring card i into view: pinned → scroll the page; unpinned → scroll the rail itself
  function goToCard(i) {
    const cards = visibleCards();
    const card = cards[clamp(i, 0, cards.length - 1)];
    if (!card) return;
    const behavior = reduced() ? 'instant' : 'smooth';
    if (pinned()) {
      const target = clamp(posOf(card), 0, railDist);
      const r = rail.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - hdrH() + target, behavior });
    } else {
      railViewport.scrollTo({ left: posOf(card), behavior });
    }
  }
  if (railPrev) railPrev.addEventListener('click', () => goToCard(activeIdx - 1));
  if (railNext) railNext.addEventListener('click', () => goToCard(activeIdx + 1));
  if (railViewport) {
    // Keyboard focus makes the browser scroll the clipped viewport sideways.
    // When pinned, convert that offset into page scroll so the rail stays in sync.
    railViewport.addEventListener('scroll', () => {
      if (!pinned()) { updateRail(); return; }
      const sl = railViewport.scrollLeft;
      if (!sl) return;
      railViewport.scrollLeft = 0;
      const r = rail.getBoundingClientRect();
      const current = clamp(hdrH() - r.top, 0, railDist);
      const target = clamp(current + sl, 0, railDist);
      window.scrollTo({ top: window.scrollY + r.top - hdrH() + target, behavior: 'instant' });
    });
  }

  // ── FILTERS ───────────────────────────────────────────────
  const chips = $$('.chip');
  const filterStatus = $('#filter-status');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    $$('.rail-card', track).forEach((card) => {
      card.hidden = f !== 'all' && !card.dataset.cats.split(' ').includes(f);
    });
    // A divider shows only when projects are visible before it and inside its own
    // group (between it and the next divider)
    const cards = visibleCards();
    const isBefore = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    dividers.forEach((d, k) => {
      const next = dividers[k + 1];
      const before = cards.some((c) => isBefore(c, d));
      const inGroup = cards.some((c) => isBefore(d, c) && (!next || isBefore(c, next)));
      d.hidden = !(before && inGroup);
    });
    const n = visibleCards().length;
    if (filterStatus) filterStatus.textContent = `Showing ${n} project${n === 1 ? '' : 's'}`;
    layoutRail();
    if (pinned()) {
      const r = rail.getBoundingClientRect();
      if (r.top < hdrH()) window.scrollTo({ top: window.scrollY + r.top - hdrH(), behavior: 'instant' });
    } else if (railViewport) {
      railViewport.scrollLeft = 0;
    }
    updateRail();
  }));

  // ── MASCOT DIRECTOR: one fixed mascot that travels with the page (Seb) ──
  // Each section asks for a pose: big beside the hero, pointing from the
  // bottom-left in the intro, a round badge everywhere else; it steps away
  // over the contact links. The pose eases toward its target every frame, and
  // the bubble follows the head with that section's line.
  const mascotEl = heroPortrait ? heroPortrait.canvas : null;
  const mSay = $('#mascot-say');
  const mSayText = $('#mascot-say-text');
  const heroEl = $('.hero');
  const narrow = window.matchMedia('(max-width: 860px)');
  let greeting = mSayText ? mSayText.innerHTML : '';
  try {
    if (document.body.classList.contains('page-home')) {
      if (localStorage.getItem('sd-visited')) greeting = "Welcome back! I'm <b>Sangamesh</b>. Scroll down and I'll show you around again.";
      localStorage.setItem('sd-visited', '1');
    }
  } catch (e) { /* storage unavailable: everyone is a first-time visitor */ }
  const cur = { x: 0, y: 0, size: 0, away: 0 };
  let target = null, poseKind = '', sayMsg = null, sayTimer, sayWords = [];

  function poseFor(kind) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pad = parseFloat(getComputedStyle($('.wrap')).paddingLeft) || 24;
    if (narrow.matches) {
      if (kind === 'hero') {
        const size = Math.min(vw * 0.92, 480, vh * 0.48);
        // Short phones: keep the bubble below the hero's buttons until they scroll away
        const links = $('.hero-links');
        const clear = links ? links.getBoundingClientRect().bottom + (mSay ? mSay.offsetHeight : 0) + 32 - size * 0.07 : 0;
        return { x: (vw - size) / 2, y: Math.max(vh - size * 0.86, clear), size, badge: false };
      }
      if (kind.startsWith('tour')) { const size = Math.min(vw * 0.46, 240); return { x: -size * 0.06, y: vh - size * 0.82, size, badge: false }; }
      return { x: 12, y: vh - 72 - 16, size: 72, badge: true };
    }
    if (kind === 'hero') {
      const size = Math.min(vw * 0.44, vh * 0.8 - 20, 700);
      const right = Math.max(pad, (vw - 1360) / 2 - size * 0.08);
      return { x: vw - right - size, y: vh * 1.12 - size, size, badge: false };
    }
    if (kind === 'side') { const size = Math.min(vh * 0.46, vw * 0.25, 380); return { x: pad - size * 0.12, y: vh - size * 0.88, size, badge: false }; }
    // Finale: big and grinning in the bottom-right, beside the contact details
    if (kind === 'finale') {
      const size = Math.min(vh * 0.78, vw * 0.38, 640);
      return { x: vw - pad - size * 0.9, y: vh - size * 0.96, size, badge: false };
    }
    // Project tour: big, beside the project, cropped by the bottom of the screen
    if (kind.startsWith('tour')) {
      const size = Math.min(vh * 0.7, vw * 0.31, 580);
      const x = kind === 'tour-right' ? vw - pad - size * 0.94 : pad - size * 0.08;
      return { x, y: vh - size * 0.97, size, badge: false };
    }
    return { x: vw - 24 - 92, y: vh - 24 - 44 - 18 - 92, size: 92, badge: true };
  }
  function kindOf(zone) {
    if (!zone) return 'badge';
    if (zone.dataset.mascot) return zone.dataset.mascot;
    if (zone.matches('.hero')) return 'hero';
    if (zone.matches('.intro')) return 'side';
    if (zone.matches('.chapter')) return `tour-${zone.dataset.side || 'left'}`;
    if (zone.matches('.contact, .site-foot')) return narrow.matches ? 'badge' : 'finale';
    return 'badge';
  }

  // Bubble text: words fill in one by one while the mascot talks
  function setSay(html, persist) {
    if (!mSay || html === sayMsg) return;
    sayMsg = html;
    clearTimeout(sayTimer);
    if (!html) { mSay.classList.add('is-hidden'); return; }
    mSay.classList.add('is-hidden');
    setTimeout(() => {
      if (sayMsg !== html) return;
      mSayText.innerHTML = html;
      sayWords = [];
      [...mSayText.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            sayWords.push(w);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeName === 'B') { n.classList.add('w'); sayWords.push(n); }
      });
      mSay.classList.remove('is-hidden');
      if (reduced()) sayWords.forEach((w) => w.classList.add('on'));
      else sayWords.forEach((w, i) => setTimeout(() => { w.classList.add('on'); if (i % 2 === 0) blip(520 + Math.random() * 260, 0.045); }, 120 + i * 85));
      mascotTalk(heroPortrait, sayWords.length * 85 + 200, 120);
      if (!persist) sayTimer = setTimeout(() => mSay.classList.add('is-hidden'), 6500);
    }, reduced() ? 0 : 200);
  }

  const esc = (t) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // Line for a section: its data-guide text, with the project's name picked out
  function lineFor(host) {
    let html = esc(host.dataset.guide);
    // Highlight the longest leading part of the name the line actually uses
    const words = (host.dataset.name || '').split(' ');
    for (let n = words.length; n > 0; n--) {
      const part = esc(words.slice(0, n).join(' '));
      if (html.includes(part)) return html.replace(part, `<b>${part}</b>`);
    }
    return html;
  }
  // The name takes the chapter's colour, unless that's too pale or too dark on paper
  function accentFor(zone) {
    const bg = zone && zone.matches('.chapter') ? getComputedStyle(zone).getPropertyValue('--c-bg').trim() : '';
    const m = /^#([0-9a-f]{6})$/i.exec(bg);
    if (!m) return '';
    const n = parseInt(m[1], 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.12 && lum < 0.62 ? bg : '';
  }
  function updateMascotTarget() {
    if (!mascotEl) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const zone = zoneAt(vw / 2, vh * 0.6);
    const kind = kindOf(zone);
    poseKind = kind;
    target = kind === 'away' ? { ...poseFor('badge'), away: 1 } : { ...poseFor(kind), away: 0 };
    const tour = kind.startsWith('tour');
    // A section can dress the mascot (chapters, error pages); otherwise dress-up applies
    heroPortrait.outfit = zone && zone.dataset.outfit ? zone.dataset.outfit : heroPortrait.dress && heroPortrait.dress !== 'none' ? heroPortrait.dress : '';
    // Like Seb's: no arm in the hero, pointing at the content, waving goodbye
    heroPortrait.gesture = kind === 'tour-left' || kind === 'side' ? 'point' : kind === 'hero' || kind === 'badge' ? 'none' : 'wave';
    heroPortrait.expr = zone && zone.dataset.expr ? zone.dataset.expr : kind === 'hero' || kind === 'finale' ? 'happy' : 'open';
    if (mSay) mSay.style.setProperty('--say-accent', accentFor(zone) || 'var(--blue)');
    if (performance.now() < sayLock) return;
    if (kind === 'hero') { setSay(greeting, true); return; }
    const finale = kind === 'finale';
    const host = tour ? zone : finale ? $('#contact') : (() => { const mid = document.elementFromPoint(vw / 2, vh * 0.55); return mid && mid.closest('[data-guide]'); })();
    // On the tour and at the end the bubble stays up like Seb's; elsewhere it fades
    setSay(host ? lineFor(host) : '', (tour || finale) && !narrow.matches);
  }

  function placeMascot() {
    if (!mascotEl || !target) return;
    const k = reduced() || !cur.size ? 1 : 0.14;
    ['x', 'y', 'size', 'away'].forEach((key) => { cur[key] += ((target[key] || 0) - cur[key]) * k; });
    const badge = target.badge && cur.size < 150;
    if (heroPortrait.head !== badge) heroPortrait.head = badge;
    mascotEl.classList.toggle('is-badge', badge);
    const size = Math.round(cur.size);
    if (mascotEl.style.width !== `${size}px`) { mascotEl.style.width = `${size}px`; mascotEl.style.height = `${size}px`; }
    const px = cur.x + fxs.dx, py = cur.y + cur.away * 160 + fxs.dy;
    mascotEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${fxs.rot.toFixed(3)}rad) scale(${fxs.scale.toFixed(3)})`;
    mascotEl.style.opacity = String((1 - cur.away) * fxs.alpha);
    if (handle) {
      // The grab area covers the head and body, not the empty corners of the canvas
      const hb = badge ? [0, 0, 1, 1] : [0.26, 0.08, 0.52, 0.78];
      const hh = Math.min(cur.size * hb[3], window.innerHeight - (py + cur.size * hb[1]));
      handleBox = { x: px + cur.size * hb[0], y: py + cur.size * hb[1], w: cur.size * hb[2], h: hh };
      handle.style.transform = `translate3d(${(px + cur.size * hb[0]).toFixed(1)}px, ${(py + cur.size * hb[1]).toFixed(1)}px, 0)`;
      handle.style.width = `${Math.round(cur.size * hb[2])}px`;
      handle.style.height = `${Math.max(0, Math.round(hh))}px`;
      handle.style.borderRadius = badge ? '50%' : '';
      // Stand aside while gliding between poses, so it never sits over a link in passing
      const gliding = !held && (Math.abs(target.x - cur.x) > 8 || Math.abs(target.y - cur.y) > 8 || Math.abs(target.size - cur.size) > 8);
      handle.hidden = !held && (cur.away > 0.5 || fxs.alpha < 0.3 || gliding || overLink);
    }
    if (!mSay) return;
    // Bubble sits above the head, its tail pointing at the face
    const bw = mSay.offsetWidth, bh = mSay.offsetHeight;
    const headX = badge ? cur.x + cur.size / 2 : cur.x + cur.size * 0.54;
    const headTop = badge ? cur.y : cur.y + cur.size * 0.07;
    const left = clamp(headX - bw * (badge ? 0.7 : 0.45), 12, window.innerWidth - bw - 16);
    const still = trick && trick.still;
    mSay.style.transform = `translate3d(${(left + (still ? 0 : fxs.dx)).toFixed(1)}px, ${(headTop - bh - 20 + cur.away * 160 + (still ? 0 : fxs.dy)).toFixed(1)}px, 0)`;
    mSay.style.setProperty('--tail-x', `${clamp(headX - left, 28, bw - 28).toFixed(1)}px`);
    mSay.classList.toggle('is-small', poseKind !== 'hero' && poseKind !== 'finale' && !(poseKind.startsWith('tour') && !narrow.matches));
  }
  // ── PLAY: grab, drag, poke, tricks and dress-up (Seb's mascot) ──
  // fxs holds live offsets layered on top of the scroll pose: drags and
  // tricks write to it, and it springs back to rest when nothing is playing.
  const handle = $('.mascot-handle');
  const fxs = { dx: 0, dy: 0, rot: 0, scale: 1, alpha: 1 };
  let held = null, press = null, trick = null, sayLock = 0, lastHoverLine = 0;
  // The handle steps aside whenever a link or button scrolls underneath it
  let handleBox = null, overLink = false;
  function checkHandleOverLink() {
    if (!handleBox || held) return;
    const { x, y, w, h } = handleBox;
    overLink = $$('a[href], button, input, select, textarea, summary').some((el) => {
      if (el.closest('.mascot-layer, [hidden]')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > x && r.left < x + w && r.bottom > y && r.top < y + h;
    });
  }
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  // Play owns the bubble for a while, then hands it back to the section line
  function sayFor(html, ms) {
    sayLock = performance.now() + ms;
    sayMsg = null;
    setSay(html, true);
    clearTimeout(sayFor.t);
    sayFor.t = setTimeout(() => { sayLock = 0; sayMsg = null; updateMascotTarget(); }, ms);
  }
  const ease = (t) => t * t * (3 - 2 * t);
  const bump = (t, at, w) => Math.max(0, 1 - Math.abs(t - at) / w);
  const TRICKS = {
    dance: { dur: 2800, line: "Nobody's <b>watching</b>, right?", expr: 'happy', gesture: 'wave',
      fn: (t) => ({ dx: Math.sin(t * Math.PI * 4) * 16, dy: -Math.abs(Math.sin(t * Math.PI * 8)) * 12, rot: Math.sin(t * Math.PI * 4) * 0.12 }) },
    fly: { dur: 2800, line: '<b>Wheee!</b>', expr: 'happy', gesture: 'wave',
      fn: (t) => ({ dy: -Math.sin(t * Math.PI) * window.innerHeight * 0.85, rot: Math.sin(t * Math.PI * 3) * 0.12 }) },
    vanish: { dur: 2600, line: 'Now you see me…', expr: 'happy', still: true,
      fn: (t) => { const a = t < 0.3 ? 1 - ease(t / 0.3) : t > 0.75 ? ease((t - 0.75) / 0.25) : 0; return { alpha: a, scale: 0.8 + 0.2 * a }; } },
    hiccup: { dur: 2400, line: '<b>Hic!</b> Sorry. <b>Hic!</b>', expr: 'surprised',
      fn: (t) => ({ dy: -Math.max(bump(t, 0.12, 0.06), bump(t, 0.45, 0.06), bump(t, 0.78, 0.06)) * 24 }) },
    peekaboo: { dur: 3000, line: '<b>Peekaboo!</b>', expr: 'happy', still: true,
      fn: (t) => { const d = t < 0.3 ? ease(t / 0.3) : t < 0.6 ? 1 : 1 - ease((t - 0.6) / 0.4); return { dy: cur.size * 1.05 * d - (t > 0.6 ? Math.sin(((t - 0.6) / 0.4) * Math.PI) * 26 : 0) }; } },
    dizzy: { dur: 2800, line: "Whoa… the room's <b>spinning</b>.", expr: 'dizzy',
      fn: (t) => ({ rot: ease(Math.min(1, t / 0.6)) * Math.PI * 4 + (t > 0.6 ? Math.sin((t - 0.6) * 40) * 0.1 * (1 - t) : 0) }) },
    sneeze: { dur: 2200, line: 'Ah… ah… <b>achoo!</b>', expr: (t) => (t < 0.6 ? 'surprised' : 'happy'),
      fn: (t) => (t < 0.6 ? { scale: 1 - 0.06 * ease(t / 0.6), dy: 6 * ease(t / 0.6) } : { dy: -20 * Math.sin(Math.min(1, (t - 0.6) / 0.2) * Math.PI), rot: -0.14 * Math.sin(Math.min(1, (t - 0.6) / 0.25) * Math.PI) }) },
    sulk: { dur: 3000, line: 'Hmph. <b>Fine.</b>', expr: 'sulk', look: [-0.9, 0.7],
      fn: (t) => ({ rot: -0.08 * ease(Math.min(1, t / 0.2)), dy: 8 * ease(Math.min(1, t / 0.2)) }) },
    panic: { dur: 2400, line: 'Ahh! A <b>bug</b> in production!', expr: 'surprised', gesture: 'wave',
      fn: (t) => ({ dx: Math.sin(t * 90) * 7, rot: Math.sin(t * 70) * 0.05 }) },
    hop: { dur: 700, expr: 'happy', fn: (t) => ({ dy: -Math.sin(t * Math.PI) * 18 }) },
  };
  function startTrick(name) {
    const def = TRICKS[name];
    if (!def || !heroPortrait || held || reduced()) return;
    trick = { ...def, name, t0: performance.now() };
    heroPortrait.gestureOverride = def.gesture || '';
    heroPortrait.lookOverride = def.look || null;
    if (def.line) { sayFor(def.line, def.dur + 600); chatter(6); }
    blip(700, 0.06);
  }
  function endTrick() {
    trick = null;
    heroPortrait.exprOverride = '';
    heroPortrait.gestureOverride = '';
    heroPortrait.lookOverride = null;
  }
  function playStep(now) {
    if (trick) {
      const t = (now - trick.t0) / trick.dur;
      if (t >= 1) { endTrick(); return; }
      Object.assign(fxs, { dx: 0, dy: 0, rot: 0, scale: 1, alpha: 1 }, trick.fn(t));
      heroPortrait.exprOverride = typeof trick.expr === 'function' ? trick.expr(t) : trick.expr;
    } else if (held) {
      fxs.rot += (clamp(held.vx * 0.012, -0.45, 0.45) - fxs.rot) * 0.2;
      held.vx *= 0.8;
    } else {
      fxs.dx *= 0.84; fxs.dy *= 0.84; fxs.rot *= 0.8;
      fxs.scale += (1 - fxs.scale) * 0.2; fxs.alpha += (1 - fxs.alpha) * 0.2;
    }
  }

  // Grab & drag. Mouse: press and move. Touch: hold first ("hold me to pick
  // me up"), so a normal swipe over the mascot still scrolls the page.
  if (handle && heroPortrait) {
    const grab = () => {
      held = { id: press.id, x0: press.x - fxs.dx, y0: press.y - fxs.dy, lx: press.x, vx: 0 };
      try { handle.setPointerCapture(press.id); } catch (e) { /* pointer already gone */ }
      handle.classList.add('is-held');
      document.documentElement.classList.add('is-holding-mascot');
      if (trick) endTrick();
      heroPortrait.exprOverride = 'surprised';
      sayFor(pick(['Whoa! Put me <b>down!</b>', 'Hey! Where are we <b>going?</b>', "I'm not <b>insured</b> for this."]), 60000);
      blip(900, 0.05);
    };
    const release = () => {
      clearTimeout(press && press.timer);
      if (held) {
        held = null;
        handle.classList.remove('is-held');
        document.documentElement.classList.remove('is-holding-mascot');
        heroPortrait.exprOverride = 'happy';
        setTimeout(() => { if (!held && !trick) heroPortrait.exprOverride = ''; }, 1400);
        sayFor(pick(['Phew. Thanks for the <b>ride</b>.', 'Back to work, then.', "Let's never do that <b>again</b>."]), 2600);
        blip(500, 0.08);
      } else if (press && performance.now() - press.t < 350 && !press.moved) {
        // A quick tap or click: a poke
        sayFor(pick(['Hey, that <b>tickles!</b>', '<b>Boop.</b>', "Careful, I'm <b>load-bearing</b>."]), 2200);
        startTrick('hop');
      }
      press = null;
    };
    handle.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== 'mouse', moved: false };
      if (press.touch) press.timer = setTimeout(() => { if (press && !press.moved) grab(); }, 350);
    });
    handle.addEventListener('pointermove', (e) => {
      if (held && e.pointerId === held.id) {
        held.vx = e.clientX - held.lx; held.lx = e.clientX;
        fxs.dx = e.clientX - held.x0; fxs.dy = e.clientY - held.y0;
        return;
      }
      if (!press || e.pointerId !== press.id) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > (press.touch ? 10 : 5)) {
        press.moved = true;
        if (press.touch) { clearTimeout(press.timer); press = null; } // it was a scroll
        else grab();
      }
    });
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    // Once held on a touch screen, stop the page from scrolling under the finger
    handle.addEventListener('touchmove', (e) => { if (held) e.preventDefault(); }, { passive: false });
    handle.addEventListener('contextmenu', (e) => { if (held || press) e.preventDefault(); });
    handle.addEventListener('pointerenter', (e) => {
      const now = performance.now();
      if (e.pointerType !== 'mouse' || held || trick || now < sayLock || now - lastHoverLine < 12000) return;
      lastHoverLine = now;
      sayFor('Psst. You can <b>grab</b> me.', 2600);
    });
  }

  // Footer: "Dress me up" cycles the outfits, "Do a trick" opens the tricks
  const dressBtn = $('#dress-btn');
  if (dressBtn && heroPortrait) {
    const looks = [
      ['glasses', 'How do I look? <b>Smart</b>, right?'], ['beanie', 'Hacker mode: <b>on</b>.'],
      ['headset', 'Malware hunting <b>shift</b> starts now.'], ['buckethat', 'Gone <b>phishing</b>.'], ['', 'Back to <b>basics</b>.'],
    ];
    let look = -1;
    dressBtn.addEventListener('click', () => {
      look = (look + 1) % looks.length;
      heroPortrait.dress = looks[look][0] || 'none';
      sayFor(looks[look][1], 2800);
      updateMascotTarget();
      startTrick('hop');
      blip(780, 0.05);
    });
  }
  const trickBtn = $('#trick-btn');
  const trickList = $('#trick-list');
  if (trickBtn && trickList) {
    trickBtn.addEventListener('click', () => {
      const open = trickList.hidden;
      trickList.hidden = !open;
      trickBtn.setAttribute('aria-expanded', String(open));
      // Bring the whole list into view, clear of the mascot in the corner
      if (open) {
        const over = trickList.getBoundingClientRect().bottom - (window.innerHeight - 120);
        if (over > 0) window.scrollBy({ top: over, behavior: reduced() ? 'auto' : 'smooth' });
      }
    });
    $$('[data-trick]', trickList).forEach((b) => b.addEventListener('click', () => startTrick(b.dataset.trick)));
  }

  let lastLinkCheck = 0;
  function directorLoop(now) {
    requestAnimationFrame(directorLoop);
    playStep(now);
    placeMascot();
    // Content can slide under a resting mascot without a scroll event (sticky
    // chapters, glides settling), so re-check the handle a few times a second
    if (now - lastLinkCheck > 250) { lastLinkCheck = now; checkHandleOverLink(); }
  }
  if (mascotEl) {
    // Pixel size stays 2px whatever the pose, so re-render whenever the size moves
    let lastSize = 0;
    const sizeWatch = () => {
      requestAnimationFrame(sizeWatch);
      const s = Math.round(cur.size);
      if (s !== lastSize && (reduced() || document.hidden)) { lastSize = s; renderPortrait(heroPortrait, 2); }
    };
    updateMascotTarget();
    placeMascot();
    requestAnimationFrame(directorLoop);
    requestAnimationFrame(sizeWatch);
    narrow.addEventListener('change', updateMascotTarget);
  }

  // ── CONNECTION: the mascot says when the internet drops or comes back ──
  window.addEventListener('offline', () => { if (heroPortrait) { heroPortrait.exprOverride = 'surprised'; sayFor("Uh-oh, you're <b>offline</b>. The site's fine; it's the connection.", 6000); setTimeout(() => { heroPortrait.exprOverride = ''; }, 6000); } });
  window.addEventListener('online', () => { if (heroPortrait) sayFor('Back <b>online</b>. Carry on!', 3000); });

  // ── ERROR PAGES ───────────────────────────────────────────
  const retryBtn = $('#retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => location.reload());
    // Reload by itself as soon as the connection returns
    window.addEventListener('online', () => setTimeout(() => location.reload(), 600));
  }
  const reportLink = $('#report-link');
  if (reportLink) reportLink.href += `&body=${encodeURIComponent(`This address on your portfolio didn't load: ${location.href}`)}`;

  // Offline page support: a small service worker serves offline.html when
  // there's no connection (network first, so nothing is ever served stale)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* optional */ }));
  }

  // ── DEMO VIDEOS: chapter demos play muted only while on screen ──
  // With reduced motion they never autoplay; the poster stays until played.
  $$('video.demo[data-autoplay]').forEach((v) => {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && en.intersectionRatio > 0.5 && !reduced()) {
        v.preload = 'auto';
        v.play().catch(() => { /* autoplay refused: the poster stays */ });
      } else {
        v.pause();
      }
    }, { threshold: [0, 0.5, 1] }).observe(v);
  });

  // ── COPY EMAIL ────────────────────────────────────────────
  const copyBtn = $('#copy-email');
  const copyStatus = $('#copy-status');
  if (copyBtn && navigator.clipboard && window.isSecureContext) {
    copyBtn.hidden = false;
    let resetTimer;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.email);
        copyBtn.textContent = 'Copied';
        sayFor('<b>Copied!</b> Talk soon.', 2800);
        copyStatus.textContent = 'Email address copied';
      } catch (e) {
        copyStatus.textContent = 'Copy failed — select the address instead';
      }
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { copyBtn.textContent = 'Copy address'; copyStatus.textContent = ''; }, 2400);
    });
  }

  // ── SCROLL / RESIZE LOOP ──────────────────────────────────
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateTone();
      updateNav();
      updateFill();
      updateChapters();
      updateRail();
      updateMascotTarget();
      checkHandleOverLink();
    });
  }
  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fields.forEach((f) => { sizeField(f); drawField(f, 0); });
      portraits.forEach((p) => renderPortrait(p, p.head ? 1.5 : p.cell));
      layoutRail();
      lastHeaderZone = null;
      onScroll();
    }, 150);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  motionQuery.addEventListener('change', onResize);
  window.addEventListener('load', () => { layoutRail(); onScroll(); });
  if (document.fonts) document.fonts.ready.then(() => { layoutRail(); onScroll(); });
  layoutRail();
  onScroll();
})();
