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

## Mods deste repositório (barra de uso, acompanhamento e painel)

Este repositório também é um marketplace (`.claude-plugin/marketplace.json`) com três mods, em `mods/`:

| Mod | O que faz |
| --- | --- |
| `barra-uso` | Faixa acima do prompt com o uso do contexto, da sessão de 5h e da semana, em grade de quadradinhos (verde → amarelo → vermelho). |
| `acompanha-projeto` | Faixa com o andamento do projeto, LGPD e segurança em %, lidos de `.claude/acompanhamento.json`. `/projeto` abre o painel com cada item; `/projeto verificar` pede ao Claude para reavaliar e marcar só o que tiver evidência. |
| `painel-mods` | `/mods` lista os mods e liga/desliga os enviados pelo app (muda só `enabledPlugins` no `settings.json`; vale nas conversas novas). |

Para usar:

1. Abra [claude.ai/customize/plugins](https://claude.ai/customize/plugins) → **Add** → **Add marketplace**.
2. Informe `Ygor-Silva/modelo-projeto-claude` (repositório público).
3. Ative os mods que quiser e abra uma conversa nova.

Se você já tinha subido os mesmos mods pelo app (zip), desligue as cópias locais com `/mods` para não carregar em dobro.

Para mexer nos mods: `claude plugin validate mods/<mod>` e `claude plugin test mods/<mod>` (os testes ficam em `mods/<mod>/tests`).
Num projeto novo criado a partir deste modelo, a pasta `mods/` e o `.claude-plugin/` podem ser apagados.
