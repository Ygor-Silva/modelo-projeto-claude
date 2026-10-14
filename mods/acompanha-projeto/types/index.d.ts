export type Item = { nome: string; ok: boolean; obs?: string }

export type Painel = {
  projeto: string
  fase?: string
  atualizadoEm?: string
  etapas: Item[]
  lgpd: Item[]
  seguranca: Item[]
}

declare module 'claude-code' {
  interface PluginState {
    'acompanha-projeto': { painel: Painel | null }
  }
}
