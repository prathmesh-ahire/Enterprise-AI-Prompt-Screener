// The moving background of the public pages: soft indigo, violet and pink light bands drawn
// with plain WebGL, no library. It is a port of the design export's colour-bends script, with
// three differences: it also pauses while the tab is hidden, it checks that its shaders
// compiled, and it frees what it created when it stops.
//
// The bands are atmosphere only. They never carry meaning and no text is set in their
// colours. Content never waits for this: the canvas sits behind the page, and if WebGL is
// unavailable (or anything fails) nothing is drawn and the page stays plain black.

const SETTINGS = {
  rotation: 90, speed: 0.2, scale: 1, frequency: 1, warp: 1, mouse: 1,
  parallax: 0.5, noise: 0.15, iterations: 1, intensity: 1.1, band: 6,
}

// The pixel ratio never exceeds 1.5, and the canvas never exceeds about 2.5 megapixels.
const MAX_PIXEL_RATIO = 1.5
const MAX_PIXELS = 2_500_000
// The one still frame drawn under reduced motion is taken at this moment of the animation.
const STILL_FRAME_SECONDS = 3

const VERTEX = 'attribute vec2 position; varying vec2 vUv; void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }'

const FRAGMENT = [
  '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
  '#define MAX_COLORS 8',
  'uniform vec2 uCanvas; uniform float uTime; uniform float uSpeed; uniform vec2 uRot;',
  'uniform int uColorCount; uniform vec3 uColors[MAX_COLORS]; uniform int uTransparent;',
  'uniform float uScale; uniform float uFrequency; uniform float uWarpStrength;',
  'uniform vec2 uPointer; uniform float uMouseInfluence; uniform float uParallax;',
  'uniform float uNoise; uniform int uIterations; uniform float uIntensity; uniform float uBandWidth;',
  'varying vec2 vUv;',
  'void main() {',
  '  float t = uTime * uSpeed;',
  '  vec2 p = vUv * 2.0 - 1.0;',
  '  p += uPointer * uParallax * 0.1;',
  '  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);',
  '  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);',
  '  q /= max(uScale, 0.0001);',
  '  q /= 0.5 + 0.2 * dot(q, q);',
  '  q += 0.2 * cos(t) - 7.56;',
  '  vec2 toward = (uPointer - rp);',
  '  q += toward * uMouseInfluence * 0.2;',
  '  for (int j = 0; j < 5; j++) {',
  '    if (j >= uIterations - 1) break;',
  '    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));',
  '    q += (rr - q) * 0.15;',
  '  }',
  '  vec3 col = vec3(0.0); float a = 1.0; vec2 s = q; vec3 sumCol = vec3(0.0); float cover = 0.0;',
  '  for (int i = 0; i < MAX_COLORS; ++i) {',
  '    if (i >= uColorCount) break;',
  '    s -= 0.01;',
  '    vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));',
  '    float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);',
  '    float kBelow = clamp(uWarpStrength, 0.0, 1.0);',
  '    float kMix = pow(kBelow, 0.3);',
  '    float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);',
  '    vec2 disp = (r - s) * kBelow;',
  '    vec2 warped = s + disp * gain;',
  '    float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);',
  '    float m = mix(m0, m1, kMix);',
  '    float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));',
  '    sumCol += uColors[i] * w;',
  '    cover = max(cover, w);',
  '  }',
  '  col = clamp(sumCol, 0.0, 1.0);',
  '  a = uTransparent > 0 ? cover : 1.0;',
  '  col *= uIntensity;',
  '  if (uNoise > 0.0001) {',
  '    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);',
  '    col += (n - 0.5) * uNoise;',
  '    col = clamp(col, 0.0, 1.0);',
  '  }',
  '  vec3 rgb = (uTransparent > 0) ? col * a : col;',
  '  gl_FragColor = vec4(rgb, a);',
  '}',
].join('\n')

const nothing = () => {}

// The three band colours are the bends-1/2/3 tokens, read off the canvas. Without all three
// there is nothing to draw with.
function tokenColors(el: HTMLElement): number[] | null {
  const styles = getComputedStyle(el)
  const flat: number[] = []
  for (const name of ['--bends-1', '--bends-2', '--bends-3']) {
    const value = styles.getPropertyValue(name).trim()
    if (!/^#[0-9a-f]{6}/i.test(value)) return null
    const hex = value.slice(1, 7)
    flat.push(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255)
  }
  return flat
}

// Starts the background on `canvas` and returns stop(), which the caller must run when the
// page unmounts. Returns a do-nothing stop when WebGL is not available.
export function mountColorBends(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance',
  })
  const colors = tokenColors(canvas)
  if (!gl || !colors) return nothing

  const shaders: WebGLShader[] = []
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    shaders.push(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  const vertex = compile(gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
  const release = () => {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    shaders.forEach((s) => gl.deleteShader(s))
  }
  if (!program || !buffer || !vertex || !fragment) {
    release()
    return nothing
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    release()
    return nothing
  }
  gl.useProgram(program)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const uCanvas = uniform('uCanvas')
  const uTime = uniform('uTime')
  const uPointer = uniform('uPointer')
  const palette = new Float32Array(24)
  palette.set(colors)
  gl.uniform3fv(uniform('uColors'), palette)
  gl.uniform1i(uniform('uColorCount'), colors.length / 3)
  gl.uniform1i(uniform('uTransparent'), 1)
  gl.uniform1f(uniform('uSpeed'), SETTINGS.speed)
  gl.uniform1f(uniform('uScale'), SETTINGS.scale)
  gl.uniform1f(uniform('uFrequency'), SETTINGS.frequency)
  gl.uniform1f(uniform('uWarpStrength'), SETTINGS.warp)
  gl.uniform1f(uniform('uMouseInfluence'), SETTINGS.mouse)
  gl.uniform1f(uniform('uParallax'), SETTINGS.parallax)
  gl.uniform1f(uniform('uNoise'), SETTINGS.noise)
  gl.uniform1i(uniform('uIterations'), SETTINGS.iterations)
  gl.uniform1f(uniform('uIntensity'), SETTINGS.intensity)
  gl.uniform1f(uniform('uBandWidth'), SETTINGS.band)
  const radians = (SETTINGS.rotation * Math.PI) / 180
  gl.uniform2f(uniform('uRot'), Math.cos(radians), Math.sin(radians))
  gl.clearColor(0, 0, 0, 0)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pointer = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  let alive = true
  let onScreen = true
  let frameId = 0
  let elapsed = 0
  let lastFrame = 0

  const draw = (seconds: number) => {
    gl.uniform1f(uTime, seconds)
    gl.uniform2f(uPointer, eased.x, eased.y)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const resize = () => {
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      MAX_PIXEL_RATIO,
      Math.sqrt(MAX_PIXELS / Math.max(1, canvas.clientWidth * canvas.clientHeight)),
    )
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, width, height)
    gl.uniform2f(uCanvas, width, height)
    // A still canvas has no frame loop to redraw it after a resize.
    if (reduceMotion) draw(STILL_FRAME_SECONDS)
  }

  const frame = (now: number) => {
    frameId = 0
    if (!alive || !shouldRun()) return
    const dt = Math.min(0.1, (now - lastFrame) / 1000)
    lastFrame = now
    elapsed += dt
    const follow = Math.min(1, dt * 8)
    eased.x += (pointer.x - eased.x) * follow
    eased.y += (pointer.y - eased.y) * follow
    draw(elapsed)
    frameId = requestAnimationFrame(frame)
  }

  // Runs only while the canvas is on screen, the tab is visible and motion is allowed.
  const shouldRun = () => onScreen && !document.hidden && !reduceMotion
  const sync = () => {
    if (!alive) return
    if (shouldRun() && frameId === 0) {
      lastFrame = performance.now()
      frameId = requestAnimationFrame(frame)
    } else if (!shouldRun() && frameId !== 0) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect()
    pointer.x = Math.max(-1, Math.min(1, ((e.clientX - box.left) / (box.width || 1)) * 2 - 1))
    pointer.y = Math.max(-1, Math.min(1, -(((e.clientY - box.top) / (box.height || 1)) * 2 - 1)))
  }

  if (!reduceMotion) document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('visibilitychange', sync)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting)
    sync()
  })
  intersectionObserver.observe(canvas)

  resize()
  sync()

  return () => {
    alive = false
    cancelAnimationFrame(frameId)
    frameId = 0
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('visibilitychange', sync)
    release()
  }
}
