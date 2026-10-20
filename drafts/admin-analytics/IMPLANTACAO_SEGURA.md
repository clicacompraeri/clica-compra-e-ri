# Central de Análises — implantação segura

Estado: **código preparado, coleta e banco NÃO ativados**.

## Testes e segurança
- GitHub Actions executa todos os arquivos de testes da pasta drafts/admin-analytics com Node 22.
- Os testes do Supabase usam clientes simulados: ainda falta verificar permissões reais.
- SQL isolado: drafts/admin-analytics/supabase-private-schema.sql, NÃO EXECUTADO no banco.
- Não tocar nas tabelas de alunos e suporte. Confirmar RLS negando acesso de anon e authenticated.
- Não afirmar compras com base em cliques. Os dados são eventos, não pedidos pagos.
- Eventos limitados a 5.000/dia pela RPC; limpeza de dados acima de 30 dias precisa de rotina validada.

## Variáveis privadas (sem armazenar valores no GitHub)
- CCR_ANALYTICS_ENABLED=false (ou ausente: todas as rotas novas desligadas)
- CCR_ANALYTICS_COLLECTION_ENABLED=false (ou ausente: coletor desligado MESMO quando login privado estiver habilitado)
- CCR_ANALYTICS_PUBLIC_ORIGIN=https://dominio-do-site/
- CCR_ANALYTICS_ADMIN_EMAIL: conta administrativa independente
- CCR_ANALYTICS_ADMIN_PASSWORD_HASH: hash scrypt local
- CCR_ANALYTICS_SIGNING_KEY: aleatório com pelo menos 32 caracteres
- CCR_ANALYTICS_SUPABASE_URL: URL segura do projeto
- CCR_ANALYTICS_SUPABASE_SERVICE_ROLE_KEY: chave privada apenas no servidor
- Suporte a sb_secret_ (somente apikey) e service_role legado (JWT Bearer).
- Nunca reutilizar HOTTOK, chave do aluno ou outras credenciais existentes.

## Integração de baixo risco
- Server.js só registra as rotas se CCR_ANALYTICS_ENABLED for exatamente true.
- Módulos prontos: analytics-mount.cjs, analytics-http-candidate.cjs e supabase-analytics-store.cjs.
- O cliente analytics-client-candidate.js não coleta nada sem data-ccr-analytics="enabled".
- O backend também rejeita toda coleta com HTTP 404 sem CCR_ANALYTICS_COLLECTION_ENABLED=true. A ativação do painel não autoriza coleta.
- O cliente AINDA NÃO foi carregado nas páginas públicas.
- Não alterar links dos afiliados, preço ou checkout para instrumentar cliques.

## Critérios de publicação
1. Aplicar SQL em ambiente autorizado e verificar RLS, limite diário, relatório e retenção.
2. Configurar credenciais exclusivas na plataforma sem contratação paga.
3. Testar login, relatório, logout, bloqueio de token e fail-closed do banco.
4. Testar Chromium HTTPS real, cookies Secure/HttpOnly/SameSite e Origin.
5. Testar eventos fictícios de produto e checkout, GPC e DNT.
6. Confirmar links originais, webhook Hotmart, área do aluno e suporte.
7. Monitorar métricas e usar CCR_ANALYTICS_ENABLED=false como desligamento de emergência. Manter CCR_ANALYTICS_COLLECTION_ENABLED=false durante todo o primeiro rollout.
8. Só depois ativar cliente e coleta real com revisão de privacidade.

**PARE:** se houver bloqueio de permissão, custo não aprovado, segredo ausente ou falha de segurança.
