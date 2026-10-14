import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Item, Painel } from '../types'
import { LINHAS, altura, colunasTerminal, largura, raster, svg } from './grade'
import type { Tom } from './grade'
import { ARQUIVO, PEDIDO_VERIFICAR, interpretar, novo, percentual } from './modelo'

const painel = atom({ plugin: 'acompanha-projeto', key: 'painel' } as const, null)

const PANE = 'acompanha-projeto'

// Aqui quanto mais, melhor: vermelho abaixo de 40%, amarelo até 75%, verde depois.
function tom(percent: number): Tom {
  if (percent >= 75) return 'verde'
  if (percent >= 40) return 'amarelo'
  return 'vermelho'
}

const COR_TEXTO: Record<Tom, string> = { verde: '#3fb950', amarelo: '#d29922', vermelho: '#f85149' }

async function raiz($: EngineInterface) {
  const caminho = await $.session.root()
  const pasta = caminho.split(/[\\/]/).filter(Boolean).pop() ?? caminho
  return { arquivo: `${caminho}/${ARQUIVO}`, pasta }
}

async function carregar($: EngineInterface) {
  const { arquivo, pasta } = await raiz($)
  const texto = (await $.fs.exists(arquivo)) ? await $.fs.read(arquivo) : null
  const lido = texto === null ? null : interpretar(texto, pasta)
  await update($, painel, () => lido)
}

function linhaItem(i: Item) {
  return `- ${i.ok ? '✅' : '⬜'} ${i.nome}${i.obs ? ` — _${i.obs}_` : ''}`
}

function secao(titulo: string, lista: Item[]) {
  if (lista.length === 0) return `### ${titulo}\n_Nenhum item ainda. Rode \`/projeto verificar\`._`
  const feitos = lista.filter(i => i.ok).length
  const pct = Math.round(percentual(lista) ?? 0)
  return `### ${titulo} — ${feitos}/${lista.length} (${pct}%)\n${lista.map(linhaItem).join('\n')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: 'projeto',
      description: 'Painel do projeto: andamento, LGPD e segurança. "/projeto verificar" pede ao Claude para reavaliar',
      argumentHint: '[verificar]',
    })
    await carregar($)
    return result
  })

  // O Claude atualiza o arquivo com Write/Edit; relê assim que ele grava.
  // Só observa: nunca recusa uma chamada, e uma falha ao reler não a atrapalha.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    const caminho = 'file_path' in e && typeof e.file_path === 'string' ? e.file_path : ''
    if (caminho.replace(/\\/g, '/').endsWith(ARQUIVO)) await carregar($).catch(() => undefined)
    return result
  }).catch(($, e, next) => next(e))

  // Pega também edições feitas à mão entre um turno e outro.
  on('turn.complete', async ($, e, next) => {
    await carregar($)
    return next(e)
  })

  on('command.run', { command: 'projeto' }, async ($, e) => {
    try {
      const pedido = e.args.trim().toLowerCase()
      if (pedido === 'verificar' || pedido === 'iniciar') {
        const { arquivo, pasta } = await raiz($)
        if (!(await $.fs.exists(arquivo))) {
          await $.fs.write(arquivo, JSON.stringify(novo(pasta), null, 2) + '\n')
          await carregar($)
        }
        // Enviar o pedido de dentro do comando trava (ele esperaria o próprio
        // comando acabar); o timer envia logo depois que o comando termina.
        $.clock.after(300, () => {
          $.prompt.submit({ text: PEDIDO_VERIFICAR }).catch(err =>
            $.ui.toast(`acompanha-projeto: não consegui pedir a verificação (${String(err)})`),
          )
        })
        return { text: `Vou pedir ao Claude para reavaliar o projeto (${ARQUIVO}).` }
      }
      await carregar($)
      await $.ui.open({ id: PANE, title: 'Projeto' })
      return { text: 'Painel do projeto aberto.' }
    } catch (err) {
      return { text: `acompanha-projeto: falhou (${String(err)})` }
    }
  })

  const grade = (el: ReturnType<EngineInterface['ui']['resolve']>, key: string, percent: number) => {
    const t = tom(percent)
    if ('Svg' in el) {
      const { Svg } = el
      return <Svg source={svg(percent, t)} alt={`${Math.round(percent)}%`} width={largura} height={altura} />
    }
    if ('Raster' in el) {
      const { Raster } = el
      return <Raster key={`${key}-grade`} columns={colunasTerminal} rows={LINHAS} cells={raster(percent, t)} />
    }
    return null
  }

  const indicadores = (el: ReturnType<EngineInterface['ui']['resolve']>, atual: Painel) => {
    const { Box, Text } = el
    const item = (key: string, rotulo: string, lista: Item[]) => {
      const percent = percentual(lista)
      if (percent === undefined) return null
      return (
        <Box key={key} flexDirection="row" gap={1} alignItems="center">
          <Text bold>{rotulo}</Text>
          {grade(el, key, percent)}
          <Text bold color={COR_TEXTO[tom(percent)]}>{`${Math.round(percent)}%`}</Text>
        </Box>
      )
    }
    return (
      <Box flexDirection="row" gap={3} paddingX={1} alignItems="center">
        <Text dimColor wrap="truncate-end">{`📁 ${atual.projeto}${atual.fase ? ` · ${atual.fase}` : ''}`}</Text>
        {item('etapas', 'Projeto', atual.etapas)}
        {item('lgpd', 'LGPD', atual.lgpd)}
        {item('seguranca', 'Segurança', atual.seguranca)}
      </Box>
    )
  }

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const atual = await read($, painel)
    const below = await next(e)
    const el = $.ui.resolve(e)
    const { Box, Text } = el
    const faixa =
      atual === null ? (
        <Box paddingX={1}>
          <Text dimColor>📁 Projeto sem acompanhamento: digite /projeto verificar</Text>
        </Box>
      ) : (
        indicadores(el, atual)
      )
    return (
      <Box flexDirection="column">
        {faixa}
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const atual = await read($, painel)
    const el = $.ui.resolve(e)
    const { Box, Button, Markdown, Text } = el
    const verificar = (
      <Button
        key="verificar"
        label="Verificar agora"
        variant="primary"
        onPress={() => {
          void $.command.run({ command: 'projeto', args: 'verificar' })
        }}
      />
    )
    const fechar = <Button key="fechar" label="Fechar" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />
    if (atual === null) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text>Este projeto ainda não tem acompanhamento.</Text>
          <Text dimColor>{`"Verificar agora" cria ${ARQUIVO} e pede ao Claude para avaliar etapas, LGPD e segurança.`}</Text>
          <Box flexDirection="row" gap={2}>
            {verificar}
            {fechar}
          </Box>
        </Box>
      )
    }
    const corpo = [
      `**${atual.projeto}**${atual.fase ? ` · fase: ${atual.fase}` : ''}${atual.atualizadoEm ? ` · atualizado em ${atual.atualizadoEm}` : ''}`,
      secao('Etapas do projeto', atual.etapas),
      secao('LGPD', atual.lgpd),
      secao('Segurança', atual.seguranca),
    ].join('\n\n')
    return (
      <Box flexDirection="column" gap={1}>
        {indicadores(el, atual)}
        <Markdown key="detalhes" text={corpo} />
        <Box flexDirection="row" gap={2}>
          {verificar}
          {fechar}
        </Box>
      </Box>
    )
  })
}
