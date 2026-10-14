export type Mod = {
  /** `nome@marketplace`, a chave de `enabledPlugins`; o nome da pasta para os da conta. */
  id: string
  nome: string
  versao?: string
  descricao?: string
  /** `app`: enviado pelo app (liga/desliga aqui); `conta`: sincronizado do claude.ai. */
  origem: 'app' | 'conta'
  ligado: boolean
}

export type Lista = { mods: Mod[]; erro?: string }

declare module 'claude-code' {
  interface PluginState {
    'painel-mods': { lista: Lista | null; alterados: string[] }
  }
}
