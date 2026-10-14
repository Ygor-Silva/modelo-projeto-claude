# Modelo de projeto (Claude Code)

Repositório-modelo para começar projetos novos no Claude Code (web ou computador).

## Como usar

1. No GitHub, clique em **Use this template** → **Create a new repository**.
2. Abra o repositório novo no Claude Code.

## Mods (Diário de Tarefas, roteador de modelo e outros)

Os mods não ficam mais no repositório: sessões na web não instalam plugins declarados no
`.claude/settings.json`. Eles vêm da sua conta claude.ai e carregam sozinhos em todo projeto,
na web e no computador:

1. Abra [claude.ai/customize/plugins](https://claude.ai/customize/plugins) → **Add** → **Add marketplace**.
2. Informe `Ygor-Silva/claude-mod-diario-tarefas` (o repositório é privado: dê acesso ao Claude GitHub App).
3. Ative os mods que quiser.

Comandos úteis: `/diario` (painel), `/andamento` (status para o gestor), `/roteador` (liga/desliga o roteador de modelo).
