export type Janela = { percent: number; resetsAt?: string }

export type Uso = {
  contexto?: number
  sessao?: Janela
  semana?: Janela
}

declare module 'claude-code' {
  interface PluginState {
    'barra-uso': { uso: Uso | null }
  }
}
