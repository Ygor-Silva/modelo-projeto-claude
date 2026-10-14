// Grade de quadradinhos no estilo do gráfico de contribuições do GitHub.
// No desktop vira um SVG com cantos arredondados; no terminal, linhas de ■.

export type Tom = 'verde' | 'amarelo' | 'vermelho'

const PALETA: Record<Tom, string[]> = {
  verde: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
  amarelo: ['#f8e3a1', '#e3b341', '#d29922', '#9e6a03'],
  vermelho: ['#ffc1bc', '#ff7b72', '#f85149', '#b62324'],
}

const VAZIO = '#8b949e'

export const COLUNAS = 10
export const LINHAS = 2
const LADO = 10
const ESPACO = 3

// Uma cor por célula, preenchendo coluna a coluna (de cima para baixo, da
// esquerda para a direita). Cada célula vale 100 / (COLUNAS * LINHAS) %.
// As cheias escurecem conforme avançam; a parcial fica no tom mais claro.
export function celulas(percent: number, tom: Tom): (string | null)[] {
  const total = COLUNAS * LINHAS
  const valor = (Math.max(0, Math.min(100, percent)) / 100) * total
  const cheias = Math.floor(valor)
  const temParcial = valor - cheias >= 0.25
  const tons = PALETA[tom]
  return Array.from({ length: total }, (_, i) => {
    if (i < cheias) return tons[1 + Math.floor((i * 3) / Math.max(cheias, 1))] ?? null
    if (i === cheias && temParcial) return tons[0] ?? null
    return null
  })
}

export const largura = COLUNAS * (LADO + ESPACO) - ESPACO
export const altura = LINHAS * (LADO + ESPACO) - ESPACO

export function svg(percent: number, tom: Tom): string {
  const rects = celulas(percent, tom).map((cor, i) => {
    const x = Math.floor(i / LINHAS) * (LADO + ESPACO)
    const y = (i % LINHAS) * (LADO + ESPACO)
    const pinta = cor === null ? `fill="${VAZIO}" fill-opacity="0.45"` : `fill="${cor}"`
    return `<rect x="${x}" y="${y}" width="${LADO}" height="${LADO}" rx="2.5" ${pinta}/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">${rects.join('')}</svg>`
}

// No terminal a grade é um Raster: um ■ por célula, com um espaço entre elas.
export const colunasTerminal = COLUNAS * 2 - 1

const PADRAO = 0x01000000
const VAZIO_TERMINAL = 0x6e7681

export function raster(percent: number, tom: Tom): string {
  const todas = celulas(percent, tom)
  const words = new Uint32Array(colunasTerminal * LINHAS * 3)
  for (let r = 0; r < LINHAS; r++) {
    for (let x = 0; x < colunasTerminal; x++) {
      const base = (r * colunasTerminal + x) * 3
      const cor = x % 2 === 0 ? todas[(x / 2) * LINHAS + r] : undefined
      words[base] = x % 2 === 0 ? 0x25a0 : 0x20
      words[base + 1] = x % 2 !== 0 ? PADRAO : cor ? parseInt(cor.slice(1), 16) : VAZIO_TERMINAL
      words[base + 2] = PADRAO
    }
  }
  return base64(new Uint8Array(words.buffer))
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += ALFABETO[(n >> 18) & 63]! + ALFABETO[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? ALFABETO[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? ALFABETO[n & 63]! : '='
  }
  return out
}
