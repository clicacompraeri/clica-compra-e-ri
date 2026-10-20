# Estado de validação — Central de Análises privada

Atualização: 2026-10-20. Laboratório exclusivamente fictício e local.

## Resultados reproduzidos

- `node --test ./*.test.cjs` em cópia local dos módulos do laboratório (`ccr-https-candidate`): **12 aprovados, 0 falhas**. Esta é uma suíte local parcial, NÃO equivale à execução de todos os arquivos `drafts/admin-analytics/*.test.cjs` da branch.
- Chromium headless com `page.set_content()`, HTML original (hash Git `07ae804bd74a6b5ca46954eac7c947309a1d3688`): **6 cenários de interface aprovados** (1280, 390, 320 px; dados estáticos e relatório injetado). Sem erros JavaScript ou overflow horizontal; filtro estático e botão de logout verificados.
- HTTPS em cliente HTTP local com certificado temporário: **aprovado** para login, cookie Secure/HttpOnly/SameSite, relatório autenticado, logout e rejeição de sessão antiga (coberto nos testes Node).
- Navegação real do Chromium em `https://127.0.0.1:<porta>/login`: **BLOQUEADA PELO AMBIENTE** (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). Isso não é falha comprovada da aplicação e não deve ser contornado. O fluxo de login em navegador HTTPS continua **pendente**.

## Verificações ainda obrigatórias

1. Executar **todos** os testes da branch com `node --test drafts/admin-analytics/*.test.cjs` no checkout completo e registrar contagem, falhas e versão do Node.
2. Em ambiente HTTPS separado e **expressamente autorizado**, testar Chromium real do login até o logout, seguindo cookies, SameSite, Origin, CSP e expiracão/revogação. Não usar o Railway de produção.
3. Revisar os relatórios, retenção, concorrência de arquivos e autenticação para ambiente multi-instância antes de qualquer publicação.
4. Obter autorização separada antes de criar serviço/ambiente de demonstração HTTPS, atribuir domínio ou coletar dados reais. Nenhum webhook, checkout, preço ou página de produção deve ser alterado.

## Restrições

Nenhum arquivo fora de `drafts/admin-analytics/`. Não alterar `main`, `server.js`, `public/`, Railway de produção, produtos, preços, checkout, webhooks, links de afiliados ou área do aluno. Não ativar coleta de visitantes sem autorização.
