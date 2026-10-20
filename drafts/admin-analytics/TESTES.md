# Execução dos testes da Central de Análises (somente desenvolvimento)

Este diretório é experimental e **não pode ser integrado ao site publicado** antes de aprovação explícita. Nenhum comando abaixo faz deploy, altera a branch main ou exige plano pago.

## Pré-requisitos
- Node.js 20 ou superior.
- Checkout local da branch `feature/painel-analytics-privado`.
- Não usar credenciais de produção, clientes ou dados reais.

## Executar a suíte original
Na raiz do repositório, executar:

```sh
node --test drafts/admin-analytics/*.test.cjs
```

Conferir a saída final: quantidade de testes, falhas e código de saída do comando. **Não declarar aprovado** se qualquer teste falhar ou não tiver sido executado.

## Critérios de aceitação
- Acesso a `/admin` e `/admin/report` sem cookie: 401.
- Credencial errada: 401.
- Login correto de laboratório: 303; acesso autorizado à interface e ao relatório: 200.
- Logout: 303 somente se a revogação foi gravada.
- Reutilizar token anterior ao logout: 401, inclusive após recriar o servidor.
- Lock remanescente: acesso negado; arquivo corrompido: não liberar acesso.
- Falha na leitura do relatório HTML: 503 e jamais página com dados inválidos.
- Cookie `Secure` precisa ser validado separadamente em **HTTPS real**: requisições HTTP manuais que enviam um cookie explicitamente não validam o comportamento de navegadores.
- Não usar dados reais, não conectar coletores, não publicar login ou relatório sem revisão de segurança.

## Limitações pendentes
O armazenamento de laboratório usa arquivos locais e não está aprovado para múltiplos processos, compartilhamento de disco ou produção. Persistência da revogação, verificação segura de symlinks e recuperação após interrupção devem ser avaliadas numa revisão adicional.

## Conservação do site
Não tocar `main`, `server.js`, `public/`, produtos, preços, checkout, integrações, área de alunos ou Railway.
