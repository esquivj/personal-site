type City = { name: string; country: string; codes: string[]; lat: number; lon: number };
type Airport = { code: string; lat: number; lon: number };
type Route = { from: string; to: string; count: number };
type Homes = { current: string; previous: string };
type GlobeData = { land: number[]; cities: City[]; airports: Airport[]; routes: Route[]; homes: Homes };

// Point kinds: 0 land, 1 city, 2 current home, 3 previous home.
const POINT_VS = `
attribute vec4 aP;
attribute float aI;
uniform mat3 uR;
uniform float uS;
uniform float uZ;
uniform float uHover;
uniform float uFocus;
varying float vF;
varying float vK;
varying float vH;
varying float vDim;
void main() {
  vec3 p = uR * aP.xyz;
  vF = smoothstep(-0.02, 0.5, p.z);
  vK = aP.w;
  vH = step(abs(aI - uHover), 0.5);
  // While a city is focused, other cities step back.
  vDim = (uFocus > -0.5 && vK > 0.5 && abs(aI - uFocus) > 0.5) ? 0.45 : 1.0;
  gl_Position = vec4(p.xy * 0.8 * uZ, 0.0, 1.0);
  float depth = mix(0.55, 1.0, vF);
  float size = 2.4 * depth;
  if (vK > 2.5) size = 15.0;
  else if (vK > 1.5) size = 26.0;
  else if (vK > 0.5) size = 8.0 * (1.0 + vH * 0.6);
  gl_PointSize = size * uS;
}`;

const POINT_FS = `
precision mediump float;
uniform vec3 uInk;
uniform vec3 uAcc;
uniform float uTime;
uniform float uPulse;
varying float vF;
varying float vK;
varying float vH;
varying float vDim;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float front = smoothstep(0.0, 0.2, vF);
  if (vK > 2.5) {
    // Previous home: a quiet open ring around a small dot.
    float ring = smoothstep(0.06, 0.0, abs(d - 0.4));
    float core = smoothstep(0.2, 0.15, d);
    gl_FragColor = vec4(uAcc, max(ring * 0.75, core) * front * vDim);
  } else if (vK > 1.5) {
    // Current home: a solid core with a ring that keeps breathing outward.
    float core = smoothstep(0.15, 0.11, d);
    float halo = smoothstep(0.2, 0.15, d) - core;
    float t = fract(uTime * 0.55) * uPulse;
    float r = mix(0.16, 0.48, t);
    float wave = smoothstep(0.04, 0.0, abs(d - r)) * (1.0 - t) * uPulse;
    float a = max(core, max(halo * 0.9, wave * 0.8));
    vec3 col = halo > 0.5 ? vec3(0.98, 0.97, 0.95) : uAcc;
    gl_FragColor = vec4(col, a * front);
  } else if (vK > 0.5) {
    float body = smoothstep(0.5, 0.44, d);
    vec3 col = d < 0.32 ? uAcc : vec3(0.98, 0.97, 0.95);
    gl_FragColor = vec4(col, body * front * vDim);
  } else {
    gl_FragColor = vec4(uInk, 0.62 * vF);
  }
}`;

const SPHERE_VS = `
attribute vec2 aQ;
varying vec2 vQ;
void main() {
  vQ = aQ;
  gl_Position = vec4(aQ, 0.0, 1.0);
}`;

// The globe on the dark stage: a faintly lit body, a cool rim, and a warm halo.
const SPHERE_FS = `
precision mediump float;
uniform float uRad;
uniform vec3 uInk;
uniform vec3 uAcc;
varying vec2 vQ;
void main() {
  float r = length(vQ) / uRad;
  if (r > 1.0) {
    float halo = smoothstep(1.18, 1.0, r);
    gl_FragColor = vec4(uAcc, halo * halo * 0.12);
    return;
  }
  vec3 n = vec3(vQ / uRad, sqrt(1.0 - r * r));
  float light = dot(n, normalize(vec3(-0.55, 0.6, 0.6)));
  float body = mix(0.015, 0.075, smoothstep(-0.4, 1.0, light));
  float rim = smoothstep(0.82, 1.0, r) * 0.16;
  gl_FragColor = vec4(uInk, body + rim);
}`;

// aE = (city index at one end, city index at the other, route weight 0..1).
const LINE_VS = `
attribute vec3 aP;
attribute vec3 aT;
attribute vec3 aE;
uniform mat3 uR;
uniform float uZ;
uniform float uFocus;
varying float vF;
varying vec3 vT;
varying float vOn;
void main() {
  vec3 p = uR * aP;
  vF = smoothstep(-0.05, 0.3, p.z);
  vT = vec3(aT.xy, aE.z);
  float touches = step(abs(aE.x - uFocus), 0.5) + step(abs(aE.y - uFocus), 0.5);
  vOn = uFocus < -0.5 ? 0.5 : (touches > 0.5 ? 1.0 : 0.0);
  gl_Position = vec4(p.xy * 0.8 * uZ, 0.0, 1.0);
}`;

const LINE_FS = `
precision mediump float;
uniform vec3 uAcc;
uniform float uTime;
uniform float uPulse;
varying float vF;
varying vec3 vT;
varying float vOn;
void main() {
  float w = vT.z;
  // Busier routes carry faster, brighter comets.
  float h = fract(uTime * mix(0.12, 0.3, w) + vT.y);
  float tail = mix(0.06, 0.16, w);
  float comet = smoothstep(tail, 0.0, h - vT.x) * step(vT.x, h) * uPulse;
  float base = mix(0.16, 0.5, w);
  float glow = comet * mix(0.5, 1.0, w);
  float a = base + glow;
  if (vOn > 0.75) a = 0.7 + 0.3 * w + glow;
  else if (vOn < 0.25) a *= 0.15;
  a *= vF;
  gl_FragColor = vec4(uAcc, min(a, 1.0));
}`;

const toRad = Math.PI / 180;
const xyz = (lat: number, lon: number): [number, number, number] => [
  Math.cos(lat * toRad) * Math.sin(lon * toRad),
  Math.sin(lat * toRad),
  Math.cos(lat * toRad) * Math.cos(lon * toRad),
];

function hex(value: string, fallback: [number, number, number]): [number, number, number] {
  const m = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, vs: string, fs: string) {
  const program = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Globe shader failed to link');
  return program;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function initTravelGlobe(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-globe-canvas]');
  const payload = root.querySelector('[data-globe-data]')?.textContent;
  if (!canvas || !payload) return;

  const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
  if (!gl) {
    root.dataset.globeState = 'fallback';
    return;
  }

  let program: WebGLProgram;
  let lineProgram: WebGLProgram;
  let sphereProgram: WebGLProgram;
  try {
    program = compile(gl, POINT_VS, POINT_FS);
    lineProgram = compile(gl, LINE_VS, LINE_FS);
    sphereProgram = compile(gl, SPHERE_VS, SPHERE_FS);
  } catch {
    root.dataset.globeState = 'fallback';
    return;
  }

  const data: GlobeData = JSON.parse(payload);
  const homeIndex = data.cities.findIndex((c) => c.name === data.homes.current);
  const previousIndex = data.cities.findIndex((c) => c.name === data.homes.previous);

  // Points: land dots, then one marker per city.
  const points: number[] = [];
  const ids: number[] = [];
  for (let i = 0; i < data.land.length; i += 2) {
    points.push(...xyz(data.land[i], data.land[i + 1]), 0);
    ids.push(-1);
  }
  const cityVectors = data.cities.map((city, i) => {
    const v = xyz(city.lat, city.lon);
    const kind = i === homeIndex ? 2 : i === previousIndex ? 3 : 1;
    points.push(...v, kind);
    ids.push(i);
    return { city, v, index: i, kind };
  });
  const pointCount = points.length / 4;
  const pointBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  const idBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, idBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids), gl.STATIC_DRAW);

  // Routes run between airports; each end is tagged with the city it belongs to.
  const airportPos = new Map(data.airports.map((a) => [a.code, xyz(a.lat, a.lon)]));
  const cityOf = new Map<string, number>();
  data.cities.forEach((city, i) => city.codes.forEach((code) => cityOf.set(code, i)));
  const maxCount = Math.max(1, ...data.routes.map((r) => r.count));

  const segments: number[] = [];
  const ends: number[] = [];
  const SEG = 64;
  data.routes.forEach((route, k) => {
    const A = airportPos.get(route.from);
    const B = airportPos.get(route.to);
    if (!A || !B) return;
    const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
    const omega = Math.acos(dot);
    if (omega < 1e-4) return;
    const lift = Math.min(0.25, omega * 0.14);
    const at = (t: number) => {
      const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
      const s2 = Math.sin(t * omega) / Math.sin(omega);
      const h = 1 + lift * Math.sin(Math.PI * t);
      return [(A[0] * s1 + B[0] * s2) * h, (A[1] * s1 + B[1] * s2) * h, (A[2] * s1 + B[2] * s2) * h];
    };
    const seed = (k * 0.618) % 1;
    const weight = Math.sqrt((route.count - 1) / Math.max(1, maxCount - 1));
    const e = [cityOf.get(route.from) ?? -9, cityOf.get(route.to) ?? -9, weight];
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG;
      const t1 = (i + 1) / SEG;
      segments.push(...at(t0), t0, seed, 0, ...at(t1), t1, seed, 0);
      ends.push(...e, ...e);
    }
  });
  const segmentCount = segments.length / 6;
  const segmentBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, segmentBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segments), gl.STATIC_DRAW);
  const endBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, endBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ends), gl.STATIC_DRAW);

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const tip = root.querySelector<HTMLElement>('[data-globe-tip]');
  const tipCity = tip?.querySelector<HTMLElement>('[data-tip-city]');
  const tipMeta = tip?.querySelector<HTMLElement>('[data-tip-meta]');
  const homeTags = [...root.querySelectorAll<HTMLElement>('[data-globe-home]')].map((el) => ({
    el,
    item: cityVectors.find((c) => c.city.name === el.dataset.globeHome),
  }));

  const styles = getComputedStyle(root);
  const ink = hex(styles.getPropertyValue('--globe-ink'), [0.95, 0.94, 0.92]);
  const accent = hex(styles.getPropertyValue('--globe-accent'), [0.88, 0.41, 0.29]);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const start = performance.now();
  let last = start;

  // Camera
  const home = cityVectors[homeIndex] ?? cityVectors[0];
  const viewFor = (city: City) => ({ yaw: -city.lon * toRad, pitch: Math.max(-1.1, Math.min(1.1, city.lat * toRad * 0.8)) });
  let { yaw, pitch } = home ? viewFor(home.city) : { yaw: 118 * toRad, pitch: 0.42 };
  let spin = 0; // inertial yaw velocity (rad/s)
  let flight: { from: { yaw: number; pitch: number }; to: { yaw: number; pitch: number }; t0: number; ms: number } | null = null;
  let idleUntil = 0;

  let zoom = 1;
  const MIN_ZOOM = 0.85;
  const MAX_ZOOM = 3;
  const zoomIn = root.querySelector<HTMLButtonElement>('[data-globe-zoom-in]');
  const zoomOut = root.querySelector<HTMLButtonElement>('[data-globe-zoom-out]');
  const homeButton = root.querySelector<HTMLButtonElement>('[data-globe-home-button]');
  const setZoom = (value: number) => {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    root.dataset.globeZoom = zoom.toFixed(2);
    zoomIn?.toggleAttribute('disabled', zoom >= MAX_ZOOM);
    zoomOut?.toggleAttribute('disabled', zoom <= MIN_ZOOM);
  };

  let hover: (typeof cityVectors)[number] | null = null;
  let focus: (typeof cityVectors)[number] | null = null;
  let rotation = new Float32Array(9);
  let drag: { x: number; y: number; t: number } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { distance: number; zoom: number } | null = null;
  let visible = true;
  let raf = 0;

  const loc = {
    p: gl.getAttribLocation(program, 'aP'),
    i: gl.getAttribLocation(program, 'aI'),
    pR: gl.getUniformLocation(program, 'uR'),
    pS: gl.getUniformLocation(program, 'uS'),
    pZ: gl.getUniformLocation(program, 'uZ'),
    pInk: gl.getUniformLocation(program, 'uInk'),
    pAcc: gl.getUniformLocation(program, 'uAcc'),
    pHover: gl.getUniformLocation(program, 'uHover'),
    pFocus: gl.getUniformLocation(program, 'uFocus'),
    pTime: gl.getUniformLocation(program, 'uTime'),
    pPulse: gl.getUniformLocation(program, 'uPulse'),
    sQ: gl.getAttribLocation(sphereProgram, 'aQ'),
    sRad: gl.getUniformLocation(sphereProgram, 'uRad'),
    sInk: gl.getUniformLocation(sphereProgram, 'uInk'),
    sAcc: gl.getUniformLocation(sphereProgram, 'uAcc'),
    lP: gl.getAttribLocation(lineProgram, 'aP'),
    lT: gl.getAttribLocation(lineProgram, 'aT'),
    lE: gl.getAttribLocation(lineProgram, 'aE'),
    lR: gl.getUniformLocation(lineProgram, 'uR'),
    lZ: gl.getUniformLocation(lineProgram, 'uZ'),
    lFocus: gl.getUniformLocation(lineProgram, 'uFocus'),
    lAcc: gl.getUniformLocation(lineProgram, 'uAcc'),
    lTime: gl.getUniformLocation(lineProgram, 'uTime'),
    lPulse: gl.getUniformLocation(lineProgram, 'uPulse'),
  };

  const project = (v: [number, number, number]) => {
    const R = rotation;
    const x = R[0] * v[0] + R[3] * v[1] + R[6] * v[2];
    const y = R[1] * v[0] + R[4] * v[1] + R[7] * v[2];
    const z = R[2] * v[0] + R[5] * v[1] + R[8] * v[2];
    const k = 0.8 * zoom * 0.5;
    return { x: (x * k + 0.5) * canvas.clientWidth, y: (0.5 - y * k) * canvas.clientHeight, front: z > 0.08 };
  };

  const placeOverlays = () => {
    for (const { el, item } of homeTags) {
      if (!item) continue;
      const p = project(item.v);
      el.hidden = !p.front || hover === item;
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    }
    if (!hover || !tip) return;
    const p = project(hover.v);
    if (!p.front) {
      setHover(null);
      return;
    }
    tip.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
  };

  const draw = (now: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.clientWidth * dpr);
    const H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (flight) {
      const t = Math.min(1, (now - flight.t0) / flight.ms);
      const e = ease(t);
      yaw = flight.from.yaw + wrap(flight.to.yaw - flight.from.yaw) * e;
      pitch = flight.from.pitch + (flight.to.pitch - flight.from.pitch) * e;
      if (t >= 1) flight = null;
    } else if (!drag) {
      yaw += spin * dt;
      spin *= Math.pow(0.04, dt); // inertia fades out over about a second
      if (Math.abs(spin) < 0.002) spin = 0;
      if (!spin && !hover && !reduced.matches && now > idleUntil) yaw += (dt * 0.1) / zoom;
    }

    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const R = new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
    rotation = R;
    const time = (now - start) / 1000;
    const pulse = reduced.matches ? 0 : 1;
    const focusId = focus ? focus.index : hover ? hover.index : -1;

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    // Keep canvas alpha linear so marks composite onto the dark stage at full strength.
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(sphereProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(loc.sQ);
    gl.vertexAttribPointer(loc.sQ, 2, gl.FLOAT, false, 8, 0);
    gl.uniform1f(loc.sRad, 0.8 * zoom);
    gl.uniform3fv(loc.sInk, ink);
    gl.uniform3fv(loc.sAcc, accent);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(loc.sQ);

    gl.useProgram(lineProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, segmentBuffer);
    gl.enableVertexAttribArray(loc.lP);
    gl.vertexAttribPointer(loc.lP, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(loc.lT);
    gl.vertexAttribPointer(loc.lT, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, endBuffer);
    gl.enableVertexAttribArray(loc.lE);
    gl.vertexAttribPointer(loc.lE, 3, gl.FLOAT, false, 12, 0);
    gl.uniformMatrix3fv(loc.lR, false, R);
    gl.uniform1f(loc.lZ, zoom);
    gl.uniform1f(loc.lFocus, focusId);
    gl.uniform3fv(loc.lAcc, accent);
    gl.uniform1f(loc.lTime, time);
    gl.uniform1f(loc.lPulse, pulse);
    gl.drawArrays(gl.LINES, 0, segmentCount);
    gl.disableVertexAttribArray(loc.lP);
    gl.disableVertexAttribArray(loc.lT);
    gl.disableVertexAttribArray(loc.lE);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.enableVertexAttribArray(loc.p);
    gl.vertexAttribPointer(loc.p, 4, gl.FLOAT, false, 16, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, idBuffer);
    gl.enableVertexAttribArray(loc.i);
    gl.vertexAttribPointer(loc.i, 1, gl.FLOAT, false, 4, 0);
    gl.uniformMatrix3fv(loc.pR, false, R);
    gl.uniform1f(loc.pS, dpr * Math.max(0.7, canvas.clientWidth / 560) * Math.sqrt(zoom));
    gl.uniform1f(loc.pZ, zoom);
    gl.uniform3fv(loc.pInk, ink);
    gl.uniform3fv(loc.pAcc, accent);
    gl.uniform1f(loc.pHover, hover ? hover.index : -10);
    gl.uniform1f(loc.pFocus, focusId);
    gl.uniform1f(loc.pTime, time);
    gl.uniform1f(loc.pPulse, pulse);
    gl.drawArrays(gl.POINTS, 0, pointCount);
    gl.disableVertexAttribArray(loc.p);
    gl.disableVertexAttribArray(loc.i);

    placeOverlays();
  };

  // Keep drawing while anything moves; the home ring keeps a slow pulse going.
  const loop = (now: number) => {
    raf = 0;
    if (!visible) return;
    draw(now);
    if (!reduced.matches || drag || flight || spin) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf && visible) raf = requestAnimationFrame(loop);
  };

  const flyTo = (city: City, ms = 900) => {
    const to = viewFor(city);
    if (reduced.matches) {
      yaw = to.yaw;
      pitch = to.pitch;
    } else {
      flight = { from: { yaw, pitch }, to, t0: performance.now(), ms };
    }
    spin = 0;
    idleUntil = performance.now() + 4000;
    kick();
  };

  const pick = (clientX: number, clientY: number) => {
    const box = canvas.getBoundingClientRect();
    const mx = clientX - box.left;
    const my = clientY - box.top;
    let best: (typeof cityVectors)[number] | null = null;
    let bestD = 18;
    for (const item of cityVectors) {
      const p = project(item.v);
      if (!p.front) continue;
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  };

  function setHover(item: (typeof cityVectors)[number] | null) {
    if (item === hover) return;
    hover = item;
    canvas!.style.cursor = item ? 'pointer' : '';
    if (!tip || !tipCity || !tipMeta) return;
    if (!item) {
      tip.hidden = true;
      kick();
      return;
    }
    tipCity.textContent = item.city.name;
    tipMeta.textContent =
      item.kind === 2 ? `${item.city.country} · Home` : item.kind === 3 ? `${item.city.country} · Previously home` : item.city.country;
    tip.hidden = false;
    kick();
  }

  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  let downAt: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    flight = null;
    spin = 0;
    if (pointers.size === 2) {
      pinch = { distance: distance(), zoom };
      drag = null;
    } else {
      drag = { x: event.clientX, y: event.clientY, t: performance.now() };
    }
    kick();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType === 'mouse') setHover(pick(event.clientX, event.clientY));
      return;
    }
    if (hover && event.pointerType !== 'mouse') setHover(null);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size === 2) {
      setZoom(pinch.zoom * (distance() / Math.max(1, pinch.distance)));
    } else if (drag) {
      const now = performance.now();
      const speed = 0.006 / zoom;
      const dYaw = (event.clientX - drag.x) * speed;
      yaw += dYaw;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + (event.clientY - drag.y) * speed));
      const dt = Math.max(1, now - drag.t) / 1000;
      spin = spin * 0.6 + (dYaw / dt) * 0.4;
      drag = { x: event.clientX, y: event.clientY, t: now };
    }
    kick();
  });
  const release = (event: PointerEvent) => {
    const tapped = downAt && Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) < 5;
    downAt = null;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    const rest = [...pointers.values()][0];
    if (rest) {
      drag = { x: rest.x, y: rest.y, t: performance.now() };
    } else {
      // Let go mid-swipe and the globe keeps turning, then settles.
      if (drag && performance.now() - drag.t > 80) spin = 0;
      if (reduced.matches) spin = 0;
      drag = null;
    }
    if (tapped) {
      spin = 0;
      const picked = pick(event.clientX, event.clientY);
      // Tap a city to bring it to the front and light up its routes. Tap empty space to clear.
      focus = picked && picked !== focus ? picked : null;
      setHover(picked);
      if (picked) flyTo(picked.city);
    }
    kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !pointers.size && !focus) setHover(null);
  });
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom(zoom * Math.exp(-event.deltaY * 0.01));
      kick();
    },
    { passive: false },
  );
  canvas.addEventListener('keydown', (event) => {
    const step = 0.15 / zoom;
    if (event.key === 'ArrowLeft') yaw -= step;
    else if (event.key === 'ArrowRight') yaw += step;
    else if (event.key === 'ArrowUp') pitch = Math.max(-1.2, pitch - step);
    else if (event.key === 'ArrowDown') pitch = Math.min(1.2, pitch + step);
    else if (event.key === '+' || event.key === '=') setZoom(zoom * 1.4);
    else if (event.key === '-' || event.key === '_') setZoom(zoom / 1.4);
    else if (event.key === 'h' || event.key === 'H' || event.key === 'Home') goHome();
    else if (event.key === 'Escape') {
      focus = null;
      setHover(null);
    } else return;
    event.preventDefault();
    kick();
  });
  const goHome = () => {
    focus = null;
    setHover(null);
    if (home) flyTo(home.city, 1100);
  };
  zoomIn?.addEventListener('click', () => {
    setZoom(zoom * 1.4);
    kick();
  });
  zoomOut?.addEventListener('click', () => {
    setZoom(zoom / 1.4);
    kick();
  });
  homeButton?.addEventListener('click', goHome);
  setZoom(1);

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    kick();
  }).observe(canvas);
  new ResizeObserver(kick).observe(canvas);
  reduced.addEventListener?.('change', kick);

  root.dataset.globeState = 'ready';
  kick();
}
