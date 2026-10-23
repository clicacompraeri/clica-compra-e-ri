# Validação da Central de Análises — 23/10/2026

## Evidências reproduzidas

Base: `6de46265463932f36ed1fce3bc7812d0697a37ec`, branch `feature/painel-analytics-privado`.

GitHub Actions reexecutado nesta revisão: https://github.com/clicacompraeri/clica-compra-e-ri/actions/runs/40023245276/job/120655294036

- Node.js 22: 65 testes aprovados, zero falhas.
- Express 5.1.0: 2 aprovados; paridade com o commit fixo pré-implantação: 1 aprovado.
- Chromium HTTPS original: 1 aprovado. Limitação: usava `ignoreHTTPSErrors:true` e apenas viewport 390 x 844; não comprova validação do certificado nem layout desktop.
- Total distinto: 69 aprovados, zero falhas. O teste de bloqueio de coleta também foi executado separadamente; não foi contado duas vezes.
- PostgreSQL 17.11 descartável: roteiro SQL aprovado, incluindo bloqueio anon/authenticated, relatório, retenção, validação, revogação por upsert e limite diário de 5.000 eventos.
- Produção: 8 verificações públicas aprovadas no CI, incluindo loja, prévia com link Hotmart esperado, login/rota protegida do aluno, suporte protegido, painel ainda desativado e rejeição de webhook sem autorização. Não comprova compra real nem entrega de webhook válido; nenhuma compra foi feita.
- Local, Node.js 24.19.0: 68 testes aprovados após os ajustes (65 de unidade/integração + 2 Express + 1 paridade), zero falhas nesse conjunto.

## Ajustes desta revisão, somente locais

- Teste Chromium agora exige validação do certificado (`ignoreHTTPSErrors:false`).
- Acrescentadas verificações de overflow, visibilidade e quatro métricas fictícias em 1280, 390 e 320 pixels.
- Nome do teste de paridade corrigido para descrever a referência fixa, em vez de `main`.
- Sintaxe validada. Chromium atualizado: 1 tentativa falhou por dependência ausente (`certutil`, ENOENT), antes da navegação. Instalação de sistema indisponível e download do navegador falhou no gateway. Isso é impedimento de ambiente; o novo teste NÃO está aprovado.
- Nenhum teste removido/desativado. Nenhuma alteração enviada ao remoto.

## Segurança do Supabase em produção — consultas somente de leitura

Projeto Clica do Zero, PostgreSQL 17.

- `ccr_analytics_events` e `ccr_analytics_revoked_sessions`: RLS ativo; FORCE RLS desativado; anon/authenticated sem SELECT, INSERT, UPDATE ou DELETE; service_role com acesso de backend.
- RPCs ingest, purge e report: EXECUTE negado a anon/authenticated, concedido a service_role; SECURITY DEFINER com search_path vazio. São funções privilegiadas de backend, não endpoints públicos autorizados.
- Advisor sem alertas WARNING/ERROR; avisos informativos de RLS sem política são compatíveis com o acesso privado observado. Nenhuma política permissiva foi adicionada.
- Referência do aviso: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Nenhuma linha real lida/modificada; nenhuma migração executada no banco real.

## Funcionalidade e limites

A suíte cobre autenticação, logout, expiração, revogação persistente, proteção de relatórios e integração de quatro tipos de eventos fictícios (página, produto, afiliado, checkout do curso). Visualizações de página não representam visitantes únicos; cliques no checkout não representam vendas confirmadas.

Railway: somente consultas. O OAuth mostrou os nomes das flags, mas ocultou os valores. Não foi possível atestar diretamente `CCR_ANALYTICS_COLLECTION_ENABLED=false`; nenhuma variável foi alterada nem coleta ativada. As verificações públicas confirmaram o painel desativado naquela execução.

## Pendências para demonstração HTTPS

1. Autorizar envio dos ajustes locais exclusivamente à branch de desenvolvimento e executar o CI atualizado, sem merge/deploy.
2. Aprovar o teste estrito de certificado e a cobertura desktop/mobile; revisar visualmente a interface.
3. Confirmar a flag de coleta false e autorizar separadamente o ambiente/endereço HTTPS da demonstração, com dados fictícios. Não utilizar dados reais como massa de testes.

Nenhuma alteração em main, server.js, public/, produtos, preços, afiliados, Hotmart, webhooks, área do aluno, segredos ou produção. Nenhum recurso pago contratado.
