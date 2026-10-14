import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Lista, Mod } from '../types'

const lista = atom({ plugin: 'painel-mods', key: 'lista' } as const, null)
const alterados = atom({ plugin: 'painel-mods', key: 'alterados' } as const, [])

const PANE = 'painel-mods'
const EU = 'painel-mods'

type Objeto = Record<string, unknown>

const ehObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v)
const texto = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined)

async function casa($: EngineInterface) {
  const h = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  return h.replace(/\\/g, '/')
}

async function lerJson($: EngineInterface, caminho: string): Promise<Objeto | null> {
  try {
    const v: unknown = JSON.parse(await $.fs.read(caminho))
    return ehObjeto(v) ? v : null
  } catch {
    return null
  }
}

async function manifesto($: EngineInterface, pasta: string) {
  const m = await lerJson($, `${pasta}/.claude-plugin/plugin.json`)
  return { versao: texto(m?.version), descricao: texto(m?.description) }
}

// Os mods enviados pelo app estão em installed_plugins.json; ligado é o que
// enabledPlugins do settings.json diz. Os da conta ficam em plugins/synced.
async function escanear($: EngineInterface): Promise<Lista> {
  const h = await casa($)
  if (h === '') return { mods: [], erro: 'Não encontrei a pasta do usuário.' }
  const base = `${h}/.claude`
  const settings = await lerJson($, `${base}/settings.json`)
  const ligados = ehObjeto(settings?.enabledPlugins) ? settings.enabledPlugins : {}
  const instalados = await lerJson($, `${base}/plugins/installed_plugins.json`)
  const plugins = ehObjeto(instalados?.plugins) ? instalados.plugins : {}

  const mods: Mod[] = []
  for (const [id, entradas] of Object.entries(plugins)) {
    const primeira = Array.isArray(entradas) && ehObjeto(entradas[0]) ? entradas[0] : undefined
    const pasta = texto(primeira?.installPath)?.replace(/\\/g, '/')
    const m = pasta ? await manifesto($, pasta) : { versao: undefined, descricao: undefined }
    mods.push({
      id,
      nome: id.split('@')[0] ?? id,
      versao: m.versao ?? texto(primeira?.version),
      descricao: m.descricao,
      origem: 'app',
      ligado: ligados[id] === true,
    })
  }

  const synced = `${base}/plugins/synced`
  if (await $.fs.exists(synced)) {
    for (const grupo of await $.fs.list(synced)) {
      if (grupo.kind !== 'dir' || grupo.name.startsWith('.')) continue
      for (const p of await $.fs.list(`${synced}/${grupo.name}`)) {
        if (p.kind !== 'dir' || p.name.startsWith('.')) continue
        const nome = p.name.replace(/~.*$/, '')
        if (mods.some(x => x.id === `${nome}@synced`)) continue
        const m = await manifesto($, `${synced}/${grupo.name}/${p.name}`)
        mods.push({ id: `${nome}@synced`, nome, ...m, origem: 'conta', ligado: true })
      }
    }
  }

  mods.sort((a, b) => (a.origem === b.origem ? a.nome.localeCompare(b.nome) : a.origem === 'app' ? -1 : 1))
  return { mods }
}

async function recarregar($: EngineInterface) {
  const nova = await escanear($).catch((err: unknown) => ({ mods: [], erro: String(err) }))
  await update($, lista, () => nova)
}

// O mesmo que `claude plugin enable/disable`: muda só a chave do mod em
// enabledPlugins e mantém o resto do settings.json como está.
async function alternar($: EngineInterface, id: string, ligar: boolean) {
  const caminho = `${await casa($)}/.claude/settings.json`
  const settings: unknown = JSON.parse(await $.fs.read(caminho))
  if (!ehObjeto(settings)) throw new Error('settings.json não é um objeto JSON')
  const ativos = ehObjeto(settings.enabledPlugins) ? { ...settings.enabledPlugins } : {}
  ativos[id] = ligar
  await $.fs.write(caminho, JSON.stringify({ ...settings, enabledPlugins: ativos }, null, 2) + '\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'mods', description: 'Painel dos mods: ver, ligar e desligar' })
    return result
  })

  on('command.run', { command: 'mods' }, async $ => {
    try {
      await recarregar($)
      await $.ui.open({ id: PANE, title: 'Mods' })
      return { text: 'Painel de mods aberto.' }
    } catch (err) {
      return { text: `painel-mods: falhou (${String(err)})` }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const atual = await read($, lista)
    const mudou = await read($, alterados)

    const pressionar = (mod: Mod) => async () => {
      try {
        await alternar($, mod.id, !mod.ligado)
        await update($, alterados, ids => (ids.includes(mod.id) ? ids.filter(i => i !== mod.id) : [...ids, mod.id]))
        await recarregar($)
        $.ui.toast(`${mod.nome} ${mod.ligado ? 'desligado' : 'ligado'}: vale nas conversas novas`)
      } catch (err) {
        $.ui.toast(`painel-mods: não consegui alterar ${mod.nome} (${String(err)})`)
      }
    }

    const linha = (mod: Mod) => (
      <Box key={`mod-${mod.id}`} flexDirection="column">
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={mod.ligado ? '#3fb950' : undefined} dimColor={!mod.ligado}>
            {mod.ligado ? '●' : '○'}
          </Text>
          <Text bold>{mod.nome}</Text>
          {mod.versao ? <Text dimColor>{`v${mod.versao}`}</Text> : null}
          {mudou.includes(mod.id) ? <Text color="#d29922">abra uma conversa nova</Text> : null}
          {mod.origem === 'app' && mod.nome !== EU ? (
            <Button
              key={`alternar-${mod.id}`}
              label={mod.ligado ? 'Desligar' : 'Ligar'}
              onPress={pressionar(mod)}
            />
          ) : null}
          {mod.nome === EU ? <Text dimColor>(este painel)</Text> : null}
        </Box>
        {mod.descricao ? (
          <Box paddingLeft={2}>
            <Text dimColor wrap="truncate-end">
              {mod.descricao}
            </Text>
          </Box>
        ) : null}
      </Box>
    )

    const atualizar = <Button key="atualizar" label="Atualizar" onPress={() => recarregar($)} />
    const fechar = <Button key="fechar" label="Fechar" role="dismiss" onPress={() => $.ui.close({ id: PANE })} />

    if (atual === null) return <Text dimColor>Carregando os mods…</Text>

    const doApp = atual.mods.filter(m => m.origem === 'app')
    const daConta = atual.mods.filter(m => m.origem === 'conta')
    return (
      <Box flexDirection="column" gap={1}>
        {atual.erro ? <Text color="#f85149">{atual.erro}</Text> : null}
        {mudou.length > 0 ? (
          <Text color="#d29922">As mudanças valem nas conversas novas: clique em + Novo.</Text>
        ) : null}
        <Text bold>{`Mods enviados pelo app (${doApp.filter(m => m.ligado).length} de ${doApp.length} ligados)`}</Text>
        {doApp.length === 0 ? <Text dimColor>Nenhum mod enviado pelo app.</Text> : doApp.map(linha)}
        {daConta.length > 0 ? <Text bold>Plugins da conta (gerenciados no claude.ai)</Text> : null}
        {daConta.map(linha)}
        <Box flexDirection="row" gap={2}>
          {atualizar}
          {fechar}
        </Box>
      </Box>
    )
  })
}
