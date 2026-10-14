import { expect, test } from 'claude-code/testing'

const CASA = 'C:/Users/teste'

const ARQUIVOS: Record<string, string> = {
  [`${CASA}/.claude/settings.json`]: JSON.stringify({
    model: 'sonnet',
    enabledPlugins: { 'barra-uso@local-desktop-app-uploads': true, 'guarda-costas@local-desktop-app-uploads': false },
  }),
  [`${CASA}/.claude/plugins/installed_plugins.json`]: JSON.stringify({
    version: 2,
    plugins: {
      'barra-uso@local-desktop-app-uploads': [{ installPath: 'C:\\pl\\barra-uso', version: '0.2.1' }],
      'guarda-costas@local-desktop-app-uploads': [{ installPath: 'C:\\pl\\guarda-costas', version: '0.1.0' }],
    },
  }),
  'C:/pl/barra-uso/.claude-plugin/plugin.json': JSON.stringify({ name: 'barra-uso', version: '0.2.1', description: 'Faixa de uso' }),
  [`${CASA}/.claude/plugins/synced/abc/data~g2/.claude-plugin/plugin.json`]: JSON.stringify({ version: '1.1.0' }),
}

const norm = (p: string) => p.replace(/\\/g, '/')

const PANE = {
  component: 'Pane',
  requestId: 'painel-mods',
  props: { title: 'Mods', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

test('lista os mods e liga/desliga gravando só enabledPlugins', async ($, on) => {
  const gravados: Record<string, string> = {}
  on('env.get', ($, e) => ({ value: e.name === 'USERPROFILE' ? 'C:\\Users\\teste' : undefined }))
  on('fs.read', ($, e) => {
    const t = gravados[norm(e.path)] ?? ARQUIVOS[norm(e.path)]
    if (t === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: t }
  })
  on('fs.exists', ($, e) => ({ value: norm(e.path).endsWith('/synced') }))
  on('fs.list', ($, e) => ({
    value: norm(e.path).endsWith('/synced')
      ? [{ name: 'abc', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }, { name: '.staging', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }]
      : [{ name: 'data~g2', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }],
  }))
  on('fs.write', ($, e) => {
    gravados[norm(e.path)] = e.text
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))

  await $.command.run({ command: 'mods', args: '' })

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'painel-mods', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: 'barra-uso' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'data' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 de 2 ligados/ })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'alternar-data@synced' })).toBeUndefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'painel-mods', surface: 'desktop', ...PANE })
  await ui.press({ key: 'alternar-guarda-costas@local-desktop-app-uploads' })
  const salvo = JSON.parse(gravados[`${CASA}/.claude/settings.json`] ?? '{}')
  expect(salvo.model).toBe('sonnet')
  expect(salvo.enabledPlugins['guarda-costas@local-desktop-app-uploads']).toBe(true)
  expect(salvo.enabledPlugins['barra-uso@local-desktop-app-uploads']).toBe(true)
  expect(await ui.find({ type: 'Text', text: /2 de 2 ligados/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'abra uma conversa nova' })).toBeDefined()
})
