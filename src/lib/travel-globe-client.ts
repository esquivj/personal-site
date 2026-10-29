type Airport = { code: string; city: string; lat: number; lon: number };
type Route = { from: string; to: string; count: number };
type GlobeData = { land: number[]; airports: Airport[]; routes: Route[] };

const POINT_VS = `
attribute vec4 aP;
uniform mat3 uR;
uniform float uS;
uniform float uZ;
varying float vF;
varying float vK;
void main() {
  vec3 p = uR * aP.xyz;
  vF = smoothstep(-0.2, 0.45, p.z);
  vK = aP.w;
  gl_Position = vec4(p.xy * 0.8 * uZ, 0.0, 1.0);
  gl_PointSize = (aP.w > 0.5 ? 6.5 : 2.3) * uS;
}`;

const POINT_FS = `
precision mediump float;
uniform vec3 uInk;
uniform vec3 uAcc;
varying float vF;
varying float vK;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  if (vK > 0.5) {
    gl_FragColor = vec4(uAcc, smoothstep(0.5, 0.42, d) * smoothstep(0.0, 0.25, vF));
  } else {
    gl_FragColor = vec4(uInk, mix(0.05, 0.42, vF));
  }
}`;

const LINE_VS = `
attribute vec3 aP;
attribute vec3 aT;
uniform mat3 uR;
uniform float uZ;
varying float vF;
varying vec3 vT;
void main() {
  vec3 p = uR * aP;
  vF = smoothstep(-0.05, 0.3, p.z);
  vT = aT;
  gl_Position = vec4(p.xy * 0.8 * uZ, 0.0, 1.0);
}`;

const LINE_FS = `
precision mediump float;
uniform vec3 uAcc;
uniform float uTime;
uniform float uPulse;
varying float vF;
varying vec3 vT;
void main() {
  float h = fract(uTime * 0.18 + vT.y);
  float pulse = smoothstep(0.1, 0.0, abs(vT.x - h)) * uPulse;
  float a = (0.3 * vT.z + 0.75 * pulse) * vF;
  gl_FragColor = vec4(uAcc, a);
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
  try {
    program = compile(gl, POINT_VS, POINT_FS);
    lineProgram = compile(gl, LINE_VS, LINE_FS);
  } catch {
    root.dataset.globeState = 'fallback';
    return;
  }

  const data: GlobeData = JSON.parse(payload);
  const byCode = new Map<string, [number, number, number]>();
  const points: number[] = [];
  for (let i = 0; i < data.land.length; i += 2) points.push(...xyz(data.land[i], data.land[i + 1]), 0);
  for (const a of data.airports) {
    const p = xyz(a.lat, a.lon);
    byCode.set(a.code, p);
    points.push(...p, 1);
  }
  const pointCount = points.length / 4;
  const pointBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

  const segments: number[] = [];
  const SEG = 64;
  data.routes.forEach((route, k) => {
    const A = byCode.get(route.from);
    const B = byCode.get(route.to);
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
    const weight = Math.min(1, 0.5 + route.count * 0.15);
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG;
      const t1 = (i + 1) / SEG;
      segments.push(...at(t0), t0, seed, weight, ...at(t1), t1, seed, weight);
    }
  });
  const segmentCount = segments.length / 6;
  const segmentBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, segmentBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segments), gl.STATIC_DRAW);

  const styles = getComputedStyle(root);
  const ink = hex(styles.getPropertyValue('--text'), [0.08, 0.07, 0.07]);
  const accent = hex(styles.getPropertyValue('--accent'), [0.76, 0.29, 0.18]);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let yaw = 118 * toRad; // Los Angeles facing the viewer
  let pitch = 0.42;
  let drag: { x: number; y: number } | null = null;
  let zoom = 1;
  const MIN_ZOOM = 0.85;
  const MAX_ZOOM = 3;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { distance: number; zoom: number } | null = null;
  const setZoom = (value: number) => {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    root.dataset.globeZoom = zoom.toFixed(2);
    zoomIn?.toggleAttribute('disabled', zoom >= MAX_ZOOM);
    zoomOut?.toggleAttribute('disabled', zoom <= MIN_ZOOM);
  };
  const zoomIn = root.querySelector<HTMLButtonElement>('[data-globe-zoom-in]');
  const zoomOut = root.querySelector<HTMLButtonElement>('[data-globe-zoom-out]');
  let visible = true;
  let raf = 0;
  let last = performance.now();
  const start = last;

  const loc = {
    p: gl.getAttribLocation(program, 'aP'),
    pR: gl.getUniformLocation(program, 'uR'),
    pS: gl.getUniformLocation(program, 'uS'),
    pZ: gl.getUniformLocation(program, 'uZ'),
    pInk: gl.getUniformLocation(program, 'uInk'),
    pAcc: gl.getUniformLocation(program, 'uAcc'),
    lP: gl.getAttribLocation(lineProgram, 'aP'),
    lT: gl.getAttribLocation(lineProgram, 'aT'),
    lR: gl.getUniformLocation(lineProgram, 'uR'),
    lZ: gl.getUniformLocation(lineProgram, 'uZ'),
    lAcc: gl.getUniformLocation(lineProgram, 'uAcc'),
    lTime: gl.getUniformLocation(lineProgram, 'uTime'),
    lPulse: gl.getUniformLocation(lineProgram, 'uPulse'),
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
    if (!drag && !reduced.matches) yaw += (dt * 0.12) / zoom;

    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const R = new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.enableVertexAttribArray(loc.p);
    gl.vertexAttribPointer(loc.p, 4, gl.FLOAT, false, 16, 0);
    gl.uniformMatrix3fv(loc.pR, false, R);
    gl.uniform1f(loc.pS, dpr * Math.max(0.7, canvas.clientWidth / 560) * Math.sqrt(zoom));
    gl.uniform1f(loc.pZ, zoom);
    gl.uniform3fv(loc.pInk, ink);
    gl.uniform3fv(loc.pAcc, accent);
    gl.drawArrays(gl.POINTS, 0, pointCount);
    gl.disableVertexAttribArray(loc.p);

    gl.useProgram(lineProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, segmentBuffer);
    gl.enableVertexAttribArray(loc.lP);
    gl.vertexAttribPointer(loc.lP, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(loc.lT);
    gl.vertexAttribPointer(loc.lT, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix3fv(loc.lR, false, R);
    gl.uniform1f(loc.lZ, zoom);
    gl.uniform3fv(loc.lAcc, accent);
    gl.uniform1f(loc.lTime, (now - start) / 1000);
    gl.uniform1f(loc.lPulse, reduced.matches ? 0 : 1);
    gl.drawArrays(gl.LINES, 0, segmentCount);
    gl.disableVertexAttribArray(loc.lP);
    gl.disableVertexAttribArray(loc.lT);
  };

  const loop = (now: number) => {
    raf = 0;
    if (!visible) return;
    draw(now);
    if (!reduced.matches || drag) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf && visible) raf = requestAnimationFrame(loop);
  };

  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  canvas.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      pinch = { distance: distance(), zoom };
      drag = null;
    } else {
      drag = { x: event.clientX, y: event.clientY };
    }
    kick();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size === 2) {
      setZoom(pinch.zoom * (distance() / Math.max(1, pinch.distance)));
    } else if (drag) {
      const speed = 0.006 / zoom;
      yaw += (event.clientX - drag.x) * speed;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + (event.clientY - drag.y) * speed));
      drag = { x: event.clientX, y: event.clientY };
    }
    kick();
  });
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    const rest = [...pointers.values()][0];
    drag = rest ? { x: rest.x, y: rest.y } : null;
    kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  // Trackpad pinch and Ctrl/Cmd + scroll zoom; a plain scroll keeps scrolling the page.
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
    else return;
    event.preventDefault();
    kick();
  });
  zoomIn?.addEventListener('click', () => {
    setZoom(zoom * 1.4);
    kick();
  });
  zoomOut?.addEventListener('click', () => {
    setZoom(zoom / 1.4);
    kick();
  });
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
