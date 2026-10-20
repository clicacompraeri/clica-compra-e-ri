# Liberação controlada — Central de Análises

**Estado:** aguardando CI verde após separar coleta de eventos e painel. Nenhum deploy autorizado/executado nesta etapa.

## Referência e retorno seguro

- Aplicação: serviço `clica-compra-e-ri`, projeto Railway `e1fedbdf-1bde-42a7-956a-950fd8f372e4`, ambiente de produção `790e5e56-6b60-46d6-8134-1540cb72d41c`.
- Branch publicada: `main`.
- Deploy original conferido antes do rollout: `f6ab014b-0efc-45c4-a315-e4319b777def` (commit `50d3ec830421f196e0ec0d69c807b80d65260ad3`, status SUCCESS). Railway informou `canRollback=true` e `canRedeploy=true` para esse build naquela verificação. **Reconfirmar esses indicadores antes do deploy.**
- Se houver regressão: desligar `CCR_ANALYTICS_ENABLED` e `CCR_ANALYTICS_COLLECTION_ENABLED` imediatamente e restaurar o build indicado, se ainda disponível; considerar também reverter o commit na `main` para impedir novos redeploys automáticos. Verificar compra, aluno e webhook depois.
- Não editar/remover o HOTTOK, cookies de alunos, oferta, checkout, links de afiliados nem as tabelas do curso.

## Duas ativações independentes

1. Primeiro publicar código com `CCR_ANALYTICS_ENABLED=false` e `CCR_ANALYTICS_COLLECTION_ENABLED=false`: nova interface completamente inativa, sem receber eventos.
2. Após smoke test da vitrine, webhook e área do aluno, ativar só `CCR_ANALYTICS_ENABLED=true` para o login administrativo e consultar relatório vazio. **`CCR_ANALYTICS_COLLECTION_ENABLED=false` permanece inalterado.**
3. Testar login em Chromium HTTPS, expiração e revogação, dados fictícios e banco em ambiente autorizado; jamais solicitar a senha em chat.
4. Só após revisar LGPD/custos, instrumentar páginas públicas de forma mínima e optar por `CCR_ANALYTICS_COLLECTION_ENABLED=true`. Não introduzir coleta silenciosa.

## Verificações para cada passagem

- Confirmar CI atualizado, incluindo Node, Express, PostgreSQL descartável, Chromium e paridade com `main` com flag desligada.
- Conferir variáveis apenas pelo nome (8 variáveis staged): `CCR_ANALYTICS_ADMIN_EMAIL`, `CCR_ANALYTICS_ADMIN_PASSWORD_HASH`, `CCR_ANALYTICS_ENABLED`, `CCR_ANALYTICS_PUBLIC_ORIGIN`, `CCR_ANALYTICS_SIGNING_KEY`, `CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY`, `CCR_ANALYTICS_SUPABASE_URL`, `CCR_ANALYTICS_COLLECTION_ENABLED`.
- Não imprimir nenhuma chave secreta, mesmo em logs internos.
- Confirmar como se dará a cobrança pelo novo deploy (Railway pode contabilizar uso de recursos). Não autorizar contratação, upgrade nem custo adicional sem aprovação expressa.
- Verificar status, versão e homepage após qualquer alteração efetivamente aplicada.

**Parada obrigatória:** sem CI verde, confirmação de custos/rollback ou autorização explícita do deploy, permanecer no PR em rascunho.
