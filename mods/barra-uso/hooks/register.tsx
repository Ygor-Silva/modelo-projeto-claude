import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Uso } from '../types'
import { LINHAS, altura, colunasTerminal, largura, raster, svg } from './grade'
import type { Tom } from './grade'

const uso = atom({ plugin: 'barra-uso', key: 'uso' } as const, null)

function paraUso(context: SessionContextUsage, rateLimits: SessionRateLimit[]): Uso {
  const janela = (kind: string) => {
    const r = rateLimits.find(l => l.kind === kind)
    return r && { percent: r.percentUsed, resetsAt: r.resetsAt }
  }
  return { contexto: context.percent, sessao: janela('five_hour'), semana: janela('seven_day') }
}

// Uso alto é ruim: verde até 60%, amarelo até 85%, vermelho depois.
function tom(percent: number): Tom {
  if (percent >= 85) return 'vermelho'
  if (percent >= 60) return 'amarelo'
  return 'verde'
}

const COR_TEXTO: Record<Tom, string> = { verde: '#3fb950', amarelo: '#d29922', vermelho: '#f85149' }

// Horário de Brasília (UTC-3, sem horário de verão).
function hora(iso: string) {
  const d = new Date(Date.parse(iso) - 3 * 3600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const { context, rateLimits } = await $.session.usage()
    await update($, uso, () => paraUso(context, rateLimits))
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, uso, () => paraUso(e.context, e.rateLimits))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const atual = await read($, uso)
    if (e.props.hasSurvey || atual === null) return next(e)
    // Outras faixas (como a do acompanha-projeto) continuam aparecendo embaixo.
    const below = await next(e)

    const el = $.ui.resolve(e)
    const { Box, Text } = el

    const grade = (key: string, percent: number) => {
      const t = tom(percent)
      if ('Svg' in el) {
        const { Svg } = el
        return (
          <Svg
            source={svg(percent, t)}
            alt={`${Math.round(percent)}% usado`}
            width={largura}
            height={altura}
          />
        )
      }
      if ('Raster' in el) {
        const { Raster } = el
        return <Raster key={`${key}-grade`} columns={colunasTerminal} rows={LINHAS} cells={raster(percent, t)} />
      }
      return null
    }

    const item = (key: string, rotulo: string, percent: number | undefined, extra?: string) => {
      if (percent === undefined) return null
      return (
        <Box key={key} flexDirection="row" gap={1} alignItems="center">
          <Text bold>{rotulo}</Text>
          {grade(key, percent)}
          <Text bold color={COR_TEXTO[tom(percent)]}>{`${Math.round(percent)}%`}</Text>
          {extra ? <Text dimColor>{extra}</Text> : null}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={3} paddingX={1} alignItems="center">
          {item('contexto', 'Contexto', atual.contexto)}
          {item('sessao', 'Sessão 5h', atual.sessao?.percent, atual.sessao?.resetsAt && `renova ${hora(atual.sessao.resetsAt)}`)}
          {item('semana', 'Semana', atual.semana?.percent)}
        </Box>
        {below}
      </Box>
    )
  })
}
