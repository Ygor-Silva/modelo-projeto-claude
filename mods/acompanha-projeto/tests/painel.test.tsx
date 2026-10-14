import { expect, test } from 'claude-code/testing'

const ARQUIVO = JSON.stringify({
  projeto: 'Meu App',
  fase: 'Homologação',
  etapas: [
    { nome: 'Levantamento', ok: true },
    { nome: 'Banco', ok: true },
    { nome: 'Telas', ok: true },
    { nome: 'Publicação', ok: false },
  ],
  lgpd: [
    { nome: 'Base legal', ok: true },
    { nome: 'Retenção', ok: false, obs: 'sem prazo definido' },
  ],
  seguranca: [
    { nome: 'Segredos fora do git', ok: true },
    { nome: 'RLS', ok: true },
    { nome: 'Rate limit', ok: false },
  ],
})

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const PANE = {
  component: 'Pane',
  requestId: 'acompanha-projeto',
  props: { title: 'Projeto', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

test('lê o acompanhamento e mostra as porcentagens na faixa e no painel', async ($, on) => {
  on('session.root', () => ({ value: 'C:/projetos/meu-app' }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', () => ({ value: ARQUIVO }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })

  await $.command.run({ command: 'projeto', args: '' })

  for (const surface of ['desktop', 'terminal'] as const) {
    const faixa = await $.ui.mount({ plugin: 'acompanha-projeto', surface, ...BAND })
    expect(await faixa.find({ type: 'Text', text: '75%' })).toBeDefined() // etapas 3/4
    expect(await faixa.find({ type: 'Text', text: '50%' })).toBeDefined() // LGPD 1/2
    expect(await faixa.find({ type: 'Text', text: '67%' })).toBeDefined() // segurança 2/3
    expect(await faixa.find({ type: 'Text', text: /Homologação/ })).toBeDefined()
    if (surface === 'desktop') expect(await faixa.findAll({ type: 'Svg' })).toHaveLength(3)
    await faixa.unmount()

    const painel = await $.ui.mount({ plugin: 'acompanha-projeto', surface, ...PANE })
    expect(await painel.find({ type: 'Markdown', text: /sem prazo definido/ })).toBeDefined()
    expect(await painel.find({ type: 'Button', key: 'verificar' })).toBeDefined()
    await painel.unmount()
  }
})

test('sem arquivo, a faixa convida a rodar /projeto verificar', async ($, on) => {
  on('session.root', () => ({ value: 'C:/projetos/novo' }))
  on('fs.exists', () => ({ value: false }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })

  await $.command.run({ command: 'projeto', args: '' })

  const faixa = await $.ui.mount({ plugin: 'acompanha-projeto', surface: 'desktop', ...BAND })
  expect(await faixa.find({ type: 'Text', text: /\/projeto verificar/ })).toBeDefined()
  await faixa.unmount()
})
