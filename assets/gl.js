/* ─────────────────────────────────────────────
   Fond WebGL — shader GLSL écrit à la main.
   Aucune librairie, aucun CDN : un triangle plein
   écran et un fragment shader.
   ───────────────────────────────────────────── */

(() => {
  "use strict";

  const canvas = document.getElementById("bg");
  if (!canvas) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  }) || canvas.getContext("experimental-webgl");

  if (!gl) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  /* ── shaders ─────────────────────────────── */

  const VERT = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision highp float;

    uniform vec2  u_res;
    uniform float u_time;
    uniform float u_scroll;
    uniform vec2  u_mouse;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.55;
      mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.04;
        a *= 0.5;
      }
      return v;
    }

    /* étoile ponctuelle : noyau net, pas de halo flou */
    float starLayer(vec2 uv, float density, float speed, float seed, float core) {
      uv.y += u_time * speed + u_scroll * 2.6;
      vec2 g = floor(uv * density);
      vec2 f = fract(uv * density) - 0.5;
      float h = hash21(g + seed);
      float on = step(0.986, h);
      float d = length(f);
      float sharp = 1.0 - smoothstep(0.0, core, d);
      float tw = 0.55 + 0.45 * sin(u_time * 1.5 + h * 55.0);
      return on * sharp * tw;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

      vec3 base = vec3(0.010, 0.012, 0.023);
      vec3 col = base;

      /* à peine plus clair en haut */
      col += vec3(0.000, 0.005, 0.012) * (1.0 - uv.y);

      /* ── aurore : filaments fins, basse énergie ── */
      vec2 drift = (u_mouse - 0.5) * vec2(0.22, 0.12);
      vec2 q = p * vec2(1.0, 1.65) + drift;
      q.y += u_scroll * 0.32;

      float t = u_time * 0.028;
      float warp = fbm(q * 1.10 + vec2(t, -t * 0.5));
      float fil  = fbm(q * vec2(2.4, 4.2) + vec2(warp * 1.6, t * 0.85) + 7.0);
      float fil2 = fbm(q * vec2(4.6, 7.2) - vec2(t * 0.55, warp * 1.15) + 19.0);
      float band = smoothstep(0.56, 0.90, fil) * (0.50 + 0.50 * smoothstep(0.42, 0.86, fil2));
      band *= 1.0 - smoothstep(0.16, 0.92, abs(p.y + 0.12));

      vec3 mint   = vec3(0.28, 0.88, 0.80);
      vec3 violet = vec3(0.50, 0.40, 0.95);
      float side = smoothstep(0.0, 1.0, uv.x + warp * 0.5);
      col += mix(mint, violet, side) * band * 0.20;

      /* halo d'horizon, très discret */
      float glow = exp(-length(p - vec2(0.0, -0.62)) * 3.0);
      col += vec3(0.050, 0.170, 0.215) * glow * 0.42;

      /* ── étoiles, trois profondeurs ── */
      float s = 0.0;
      s += starLayer(uv, 240.0, 0.006,  3.0, 0.10) * 0.42;
      s += starLayer(uv, 145.0, 0.011, 19.0, 0.13) * 0.72;
      s += starLayer(uv,  80.0, 0.019, 37.0, 0.17) * 1.00;
      col += vec3(0.80, 0.88, 1.00) * s * 0.62;

      /* vignette : le texte garde la priorité */
      float vig = 1.0 - smoothstep(0.28, 1.55, length(p * vec2(0.76, 1.0)));
      col *= 0.40 + 0.60 * vig;

      /* grain fin */
      float g = hash21(gl_FragCoord.xy + fract(u_time) * 97.0);
      col += (g - 0.5) * 0.013;

      /* aberration chromatique à peine perceptible */
      col.r *= 1.0 + 0.016 * p.x;
      col.b *= 1.0 - 0.016 * p.x;

      /* le fond s'apaise dès qu'on quitte le hero */
      float calm = mix(1.0, 0.28, smoothstep(0.03, 0.20, u_scroll));
      col = base + (col - base) * calm;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("[bg] shader:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[bg] link:", gl.getProgramInfoLog(prog));
    document.documentElement.classList.add("no-webgl");
    return;
  }
  gl.useProgram(prog);

  /* triangle plein écran */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes   = gl.getUniformLocation(prog, "u_res");
  const uTime  = gl.getUniformLocation(prog, "u_time");
  const uScroll= gl.getUniformLocation(prog, "u_scroll");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");

  /* ── état ────────────────────────────────── */

  const state = {
    w: 0,
    h: 0,
    scroll: 0,       // 0 → 1 sur toute la page
    scrollSmooth: 0,
    mouse: [0.5, 0.5],
    mouseSmooth: [0.5, 0.5],
    time: 0,
    visible: true,
    raf: 0,
    last: 0,
  };

  function renderScale() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const mobile = window.innerWidth < 700;
    return dpr * (mobile ? 0.50 : 0.58);
  }

  function resize() {
    const scale = renderScale();
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (w === state.w && h === state.h) return;
    state.w = w;
    state.h = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function draw() {
    gl.uniform2f(uRes, state.w, state.h);
    gl.uniform1f(uTime, state.time);
    gl.uniform1f(uScroll, state.scrollSmooth);
    gl.uniform2f(uMouse, state.mouseSmooth[0], state.mouseSmooth[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    state.raf = requestAnimationFrame(frame);
    if (!state.visible) return;

    const dt = Math.min((now - state.last) / 1000 || 0.016, 0.05);
    state.last = now;

    if (!reduce) state.time += dt;

    /* lissage : rien ne saute, tout glisse */
    const ease = 1 - Math.pow(0.001, dt);
    state.scrollSmooth += (state.scroll - state.scrollSmooth) * ease;
    state.mouseSmooth[0] += (state.mouse[0] - state.mouseSmooth[0]) * ease;
    state.mouseSmooth[1] += (state.mouse[1] - state.mouseSmooth[1]) * ease;

    draw();
  }

  /* ── entrées ─────────────────────────────── */

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    state.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function onMouse(e) {
    state.mouse[0] = e.clientX / window.innerWidth;
    state.mouse[1] = 1 - e.clientY / window.innerHeight;
  }

  function onVisibility() {
    state.visible = !document.hidden;
    state.last = performance.now();
  }

  window.addEventListener("resize", () => { resize(); draw(); }, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onMouse, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  gl.clearColor(0.016, 0.020, 0.042, 1);

  resize();
  onScroll();
  state.scrollSmooth = state.scroll;
  draw();

  if (!reduce) {
    state.last = performance.now();
    state.raf = requestAnimationFrame(frame);
  } else {
    state.time = 12.0; // composition figée, jolie
    draw();
  }

  /* WebGL peut perdre son contexte (GPU reset, onglet en veille) */
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(state.raf);
  });
})();
