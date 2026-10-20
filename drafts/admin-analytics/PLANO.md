# Central de Análises — preparação isolada

## Estado
Protótipo somente na branch de teste. Nenhum arquivo da pasta public, server.js ou configurações Railway foi modificado nesta etapa. O painel HTML continua sem login, sem coleta e sem banco de dados. Não deve ser publicado como /admin.

## Modelo inicial de eventos
`event-model.cjs` valida e agrega eventos permitidos:
- page_view: visualização de página
- product_view: visualização de produto
- affiliate_outbound: clique de saída para loja
- course_checkout_click: clique rumo ao checkout do curso

Campos admitidos: type, at, product (rótulo limitado a 80 caracteres), store (categoria controlada), source (categoria controlada). Não armazenar email, telefone, IP completo, cookie de sessão, CPF, URL com parâmetros sensíveis ou identidade de visitantes. Ainda não implementa coleta nem armazenamento.

## Antes da implementação operacional
1. Autenticação administrativa exclusiva com sessão httpOnly, Secure, SameSite, expiração, proteção CSRF quando aplicável, limitação de tentativas e segredo apenas em variável de ambiente.
2. Autorização de todas as rotas de leitura, inclusive APIs, no servidor. Nunca confiar em esconder HTML ou em senha no front-end.
3. Armazenamento persistente com acesso restrito, retenção limitada, políticas de exclusão e revisão de LGPD/cookies. Avaliar mecanismo de anonimização e consentimento conforme o caso.
4. Excluir tráfego próprio e robôs quando possível; separar cliques de vendas confirmadas.
5. Testes de contrato, segurança e carga em ambiente isolado; validar encaminhamento do checkout, imagens, cards, buscas, favoritos, menu e área do aluno.
6. Solicitar aprovação expressa antes de integrar módulos ao server.js, adicionar variáveis, criar banco, instalar scripts ou publicar Railway.

## Limitação
Os dados de venda efetiva dos marketplaces não podem ser inferidos dos cliques; exigem relatórios autorizados de cada programa.
