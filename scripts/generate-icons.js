// Genera iconos PNG para la PWA usando solo Node.js built-ins
const zlib = require("node:zlib")
const fs = require("node:fs")
const path = require("node:path")

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii")
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function createPNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw scanlines: 1 filter byte + RGB per row
  const raw = Buffer.allocUnsafe(size * (3 * size + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (3 * size + 1)] = 0 // filter None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels(x, y, size)
      const i = y * (3 * size + 1) + 1 + x * 3
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// Paleta de colores
const BG   = [15, 23, 42]    // #0f172a slate-900
const BLUE = [59, 130, 246]  // #3b82f6 blue-500
const GRN  = [34, 197, 94]   // #22c55e green-500
const RED  = [239, 68, 68]   // #ef4444 red-500
const WHT  = [248, 250, 252] // #f8fafc

function lerp(a, b, t) { return Math.round(a + (b - a) * t) }
function lerpColor(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)] }

// Diseño del icono: fondo oscuro + línea de chart alcista + línea bajista + barra de volumen
function iconPixels(x, y, size) {
  const s = size
  const nx = x / s  // 0..1
  const ny = y / s  // 0..1

  // Margen de bordes redondeados (esquinas)
  const margin = 0.08
  const r = 0.12 // radio de borde
  const dx = Math.max(margin - nx, nx - (1 - margin), 0)
  const dy = Math.max(margin - ny, ny - (1 - margin), 0)
  if (Math.sqrt(dx * dx + dy * dy) > r) return BG

  // Línea verde alcista: de (0.1, 0.7) a (0.55, 0.3)
  const lineW = 0.03
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2)
  }

  // Línea verde: de izquierda-abajo a centro-arriba
  if (distToSegment(nx, ny, 0.1, 0.72, 0.55, 0.28) < lineW) return GRN
  // Línea roja: de centro-arriba a derecha-abajo
  if (distToSegment(nx, ny, 0.55, 0.28, 0.9, 0.58) < lineW) return RED

  // Barras de volumen
  const barH = 0.15
  const bar1x = [0.12, 0.22], bar2x = [0.32, 0.42], bar3x = [0.52, 0.62], bar4x = [0.72, 0.82]
  const bars = [bar1x, bar2x, bar3x, bar4x]
  const barHeights = [0.12, 0.08, 0.14, 0.10]
  for (let i = 0; i < bars.length; i++) {
    const [bx1, bx2] = bars[i]
    const bh = barHeights[i]
    if (nx >= bx1 && nx <= bx2 && ny >= 0.85 - bh && ny <= 0.85) {
      return lerpColor(BLUE, [30, 70, 150], ny * 2)
    }
  }

  // Fondo con ligero degradado
  const fade = ny * 0.12
  return [Math.round(BG[0] + fade * 30), Math.round(BG[1] + fade * 30), Math.round(BG[2] + fade * 20)]
}

const outDir = path.join(__dirname, "..", "public", "icons")
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const buf = createPNG(size, (x, y, s) => iconPixels(x, y, s))
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf)
  console.log(`✓ public/icons/icon-${size}.png (${buf.length} bytes)`)
}

// Copiar al raíz de public para compatibilidad con manifest.json existente
fs.copyFileSync(
  path.join(outDir, "icon-192.png"),
  path.join(__dirname, "..", "public", "icon-192.png")
)
fs.copyFileSync(
  path.join(outDir, "icon-512.png"),
  path.join(__dirname, "..", "public", "icon-512.png")
)
console.log("✓ Copiados a public/icon-192.png y public/icon-512.png")
