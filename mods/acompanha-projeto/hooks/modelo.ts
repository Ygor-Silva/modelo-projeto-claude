import type { Item, Painel } from '../types'

// O arquivo que guarda o acompanhamento, relativo à raiz do projeto.
export const ARQUIVO = '.claude/acompanhamento.json'

const itens = (nomes: string[]): Item[] => nomes.map(nome => ({ nome, ok: false }))

export const LGPD_PADRAO = itens([
  'Inventário dos dados pessoais tratados',
  'Base legal definida para cada tratamento',
  'Minimização: coleta só o necessário',
  'Aviso de privacidade / transparência ao titular',
  'Acesso a dados pessoais restrito por perfil',
  'Dados sensíveis (CPF, saúde etc.) mascarados ou criptografados',
  'Prazo de retenção e descarte definidos',
  'Logs sem expor dados pessoais',
  'Atendimento aos direitos do titular (acesso, correção, exclusão)',
])

export const SEGURANCA_PADRAO = itens([
  'Segredos fora do código e do git (.env, cofre)',
  'Autenticação obrigatória nas páginas e rotas',
  'Autorização no servidor / RLS no banco',
  'Validação das entradas no servidor',
  'Proteção contra SQL injection e XSS',
  'HTTPS e cookies seguros',
  'Dependências sem vulnerabilidades conhecidas',
  'Limite de requisições contra abuso',
  'Erros sem vazar detalhes internos',
  'Backup e restauração testados',
])

export function novo(projeto: string): Painel {
  return { projeto, fase: 'A definir', etapas: [], lgpd: LGPD_PADRAO, seguranca: SEGURANCA_PADRAO }
}

function lista(valor: unknown): Item[] {
  if (!Array.isArray(valor)) return []
  return valor
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map(v => ({
      nome: String(v.nome ?? v.item ?? ''),
      ok: v.ok === true || v.feito === true,
      obs: typeof v.obs === 'string' && v.obs !== '' ? v.obs : undefined,
    }))
    .filter(i => i.nome !== '')
}

// Lê o JSON com tolerância: campos faltando viram listas vazias.
export function interpretar(texto: string, pasta: string): Painel | null {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return null
  }
  if (typeof bruto !== 'object' || bruto === null) return null
  const o = bruto as Record<string, unknown>
  return {
    projeto: typeof o.projeto === 'string' && o.projeto !== '' ? o.projeto : pasta,
    fase: typeof o.fase === 'string' ? o.fase : undefined,
    atualizadoEm: typeof o.atualizadoEm === 'string' ? o.atualizadoEm : undefined,
    etapas: lista(o.etapas),
    lgpd: lista(o.lgpd),
    seguranca: lista(o.seguranca),
  }
}

export function percentual(lista: Item[]): number | undefined {
  if (lista.length === 0) return undefined
  return (lista.filter(i => i.ok).length / lista.length) * 100
}

export const PEDIDO_VERIFICAR = `Atualize o acompanhamento deste projeto no arquivo ${ARQUIVO}.
Formato: {"projeto", "fase", "atualizadoEm" (AAAA-MM-DD), "etapas": [{"nome","ok","obs"}], "lgpd": [...], "seguranca": [...]}.

1. Etapas: liste as etapas reais do projeto (pelo código, README, documentação e commits) e marque "ok": true só nas concluídas. Preencha "fase" com a fase atual.
2. LGPD e Segurança: verifique cada item no código e no banco e marque "ok": true apenas com evidência; em "obs", cite o arquivo/trecho que comprova ou o que falta. Mantenha os itens existentes; acrescente outros se forem relevantes para este projeto. Item que não se aplica: "ok": true com "obs": "não se aplica" e o motivo.
3. Se a skill auditoria-seguranca-app estiver disponível, use-a como base da parte de segurança.
4. Não altere nenhum outro arquivo. No fim, resuma em até 3 linhas o que mudou nas porcentagens.`
