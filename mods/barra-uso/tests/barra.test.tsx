import { expect, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('a faixa desenha as três grades no desktop e no terminal', async ($, on) => {
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('ui.render', ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  await $.session.measure({
    context: { window: 200000, tokens: 22000, percent: 11 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 20, resetsAt: '2026-10-14T16:40:00Z' },
      { kind: 'seven_day', percentUsed: 87 },
    ],
    changed: ['context', 'rateLimits'],
  })

  const desktop = await $.ui.mount({ plugin: 'barra-uso', surface: 'desktop', ...BAND })
  expect(await desktop.findAll({ type: 'Svg' })).toHaveLength(3)
  expect(await desktop.find({ type: 'Text', text: '11%' })).toBeDefined()
  expect(await desktop.find({ type: 'Text', text: 'renova 13:40' })).toBeDefined()
  expect(await desktop.find({ type: 'Text', text: '87%' })).toBeDefined()
  await desktop.unmount()

  const terminal = await $.ui.mount({ plugin: 'barra-uso', surface: 'terminal', ...BAND })
  expect(await terminal.findAll({ type: 'Svg' })).toHaveLength(0)
  expect(await terminal.find({ type: 'Text', text: '20%' })).toBeDefined()
  expect(await terminal.find({ type: 'Text', text: '87%' })).toBeDefined()
  await terminal.unmount()
})
