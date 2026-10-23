# Demonstração privada proposta

Estado: preparada localmente; não enviada ao GitHub nem publicada.

## Serviço isolado

- Nome proposto: ccr-analytics-demo.
- Fonte: branch feature/painel-analytics-privado, após envio autorizado e CI aprovado.
- Inicialização: node drafts/admin-analytics/private-demo-server.cjs
- Runtime: Node.js 22; sem dependências externas para este servidor.
- Instância única, sem volume e sem banco. Sessões invalidadas a cada reinício por chave efêmera; revogações mantidas em memória apenas até expiração.
- HTTPS terminado pelo provedor; encaminhamento interno HTTP. Não expor a porta interna diretamente na internet.
- Health check: /healthz. Entrada: /admin/login.

## Configuração a aplicar somente após autorização de hospedagem

CCR_ANALYTICS_COLLECTION_ENABLED=false
CCR_DEMO_PUBLIC_ORIGIN=https://ENDERECO-A-DEFINIR/
CCR_DEMO_ADMIN_EMAIL=EMAIL-EXCLUSIVO-DA-DEMONSTRACAO
CCR_DEMO_PASSWORD_HASH=HASH-DE-NOVA-SENHA
CCR_DEMO_BIND_HOST=0.0.0.0
PORT fornecida pelo provedor.

Não copiar variáveis, segredos ou credenciais de produção. Não usar HOTTOK, chave Supabase ou credenciais dos alunos. Nenhum segredo novo foi criado/salvo nesta preparação.

## Dados e isolamento

Massa sintética de sete datas, marcada como demonstração: 14 visualizações de página, 14 de produto, 14 cliques de afiliado e 7 cliques no checkout. Não representa vendas nem visitantes únicos.

/api/analytics/event sempre retorna 404, inclusive com credenciais. O processo se recusa a iniciar se a flag de coleta não for exatamente false. Não há rotas de loja, aluno ou webhook; não há chamadas a serviços externos.

## Verificações restantes

1. Enviar os arquivos da demonstração à branch autorizada e executar CI.
2. Testar o novo servidor sob HTTPS e revisar capturas desktop/mobile. O Chromium aprovado anteriormente testa o handler compartilhado; não equivale a validar este novo servidor publicado.
3. Confirmar capacidade sem cobrança antes de provisionar. Não há garantia de gratuidade do Railway; não criar recursos pagos.
4. Autorizar separadamente hospedagem e domínio, definir credenciais próprias em canal seguro, validar login/relatório/logout/coleta bloqueada no endereço final.

Nenhuma mudança na loja ou na produção é necessária para esta proposta.
