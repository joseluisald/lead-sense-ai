# Análise técnica — LeadSense AI

## Visão geral

O repositório contém dois serviços independentes:

- `frontend/`: painel administrativo estático em Astro 7, Tailwind CSS 4 e Alpine.js.
- `backend/`: API TypeScript em Bun/Elysia, com MySQL, Gemini, SMTP e webhooks.

O produto recebe leads de clientes externos, calcula score/probabilidade, opcionalmente solicita confirmação por e-mail, dispara webhooks e oferece um painel administrativo com estatísticas, listas, logs e configurações.

## Frontend

### Estrutura e execução

- `frontend/package.json`: Node >= 22.12; comandos `bun/npm run dev` (Astro), `build` e `preview`. Não há suíte de testes configurada.
- `frontend/astro.config.mjs`: integra Tailwind, Alpine e compressão de assets.
- `frontend/captain-definition`: gera site estático com Nginx; aceita `PUBLIC_API_URL` no build.
- `frontend/src/entrypoint.js`: registra Alpine e o plugin de collapse.
- `frontend/src/styles/global.css`: contém as poucas regras globais; o restante é majoritariamente Tailwind nas páginas.

### Páginas e comportamento

- Painel: `frontend/src/pages/index.astro` e `frontend/src/pages/dashboard.astro`, com visão em `frontend/src/components/Dashboard.astro`.
- Listagem de leads, clientes e logs: `frontend/src/pages/leads.astro`, `clients.astro` e `logs.astro`.
- Configurações: `frontend/src/pages/settings/{email,whatsapp,rules}.astro`.
- Acesso: `frontend/src/pages/{login,signup,forgot-password,reset-password}.astro`.
- Layout navegado: `frontend/src/layouts/Layout.astro` e `frontend/src/components/Sidebar.astro`.
- Estado, carregamento e filtros ficam centralizados em stores Alpine dentro de `frontend/src/scripts/main.js`.

### Integração atual

- A maior parte do painel usa Eden Treaty em `frontend/src/lib/eden.ts`, que aponta de modo fixo para `http://localhost:3000`.
- Apenas recuperação e redefinição de senha usam `PUBLIC_API_URL` (`forgot-password.astro` e `reset-password.astro`).
- Login e cadastro possuem somente interface: os formulários previnem o submit, mas não chamam os endpoints da API nem armazenam sessão.
- O logout remove `auth_token` e `user` do navegador em `frontend/src/scripts/main.js`, porém estes dados não são gravados pelo login atual.

## Backend

### Estrutura e execução

- `backend/package.json`: Bun; comandos `start`, `dev`, `build`, `format` e `format:check`. Não há testes configurados.
- `backend/src/index.ts`: inicializa o banco, configura CORS para `FRONTEND_URL` e expõe a API na porta 3000.
- `backend/src/routes/index.ts`: agrupa todas as rotas sob `/api`.
- `backend/src/plugins/openapi.ts`: expõe documentação Scalar em `/docs`.
- `backend/captain-definition`: instala com Bun e executa `bun run start`.

### Dados e modelos

- `backend/src/core/database.ts`: pool MySQL, configurado por `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
- `backend/src/core/init-db.ts`: cria tabelas `clients`, `leads`, `api_logs`, `users` e `settings`; também cria dados de exemplo na primeira inicialização.
- `backend/src/models/`: camada de consultas SQL por domínio (`client`, `lead`, `user`, `setting`, `stat` e `log`). As consultas usam parâmetros preparados.

### Endpoints e fluxos

- Autenticação — `backend/src/routes/auth.routes.ts` / `controllers/auth.controller.ts`:
  - `POST /api/auth/signup`, `signin`, `reset-password/request` e `reset-password`.
  - Senhas usam `Bun.password`; tokens de redefinição são armazenados como hash e expiram em uma hora.
  - JWT é emitido no cadastro/login; `JWT_SECRET` deve existir em produção.
- Clientes — `backend/src/routes/client.routes.ts`:
  - criar/listar/buscar/excluir clientes e configurar webhooks.
  - cada cliente recebe uma API key para envio de leads.
- Leads — `backend/src/routes/lead.routes.ts` / `controllers/lead.controller.ts`:
  - `POST /api/leads` exige `x-api-key` válido;
  - consulta regras, avalia no Gemini, persiste o lead, registra log, envia e-mail de verificação quando necessário e chama webhook após confirmação;
  - há listagem administrativa, confirmação por link, exclusão e revalidação em lote.
- Configurações — `backend/src/routes/setting.routes.ts`:
  - e-mail, WhatsApp e regras de validação são persistidos em `settings` como JSON.
- Estatísticas e logs — `backend/src/routes/{stat,log}.routes.ts`:
  - métricas consolidadas de leads e os últimos 100 logs de ingestão.

### Integrações externas

- Gemini: `backend/src/core/utils.ts`, ativado por `GEMINI_API_KEY`; sem chave, retorna uma avaliação padrão.
- SMTP: credenciais armazenadas no banco e utilizadas por Nodemailer.
- Webhooks: URL e cabeçalhos por cliente; são enviados quando um lead é confirmado.
- WhatsApp: a configuração é armazenada, mas o envio e o teste atuais apenas registram mensagens no log do servidor; não há chamada a provedor externo.

## Pontos críticos observados

### Funcionais

1. **URL da API divergente:** o painel Eden está fixo em localhost (`frontend/src/lib/eden.ts`), ignorando `PUBLIC_API_URL`; a imagem de produção fornece esta variável, mas ela só vale para recuperação de senha.
2. **Login e cadastro não conectados:** `login.astro` e `signup.astro` não utilizam `POST /api/auth/signin` ou `signup`.
3. **Configurações incompatíveis:** o frontend usa `PUT` e envia o formulário diretamente em `frontend/src/scripts/main.js`, enquanto o backend aceita `POST` com envelopes diferentes (`{ template, smtp }`, `{ template, provider }` e `{ rules }`). Assim, salvar configurações não funcionará como está.
4. **Campos SMTP incompatíveis:** a UI usa `username`, `password`, `fromEmail` e `fromName`; o envio lê `user`, `pass`, `senderEmail` e `senderName` em `backend/src/core/utils.ts`.
5. **Teste SMTP incompatível:** a interface envia a configuração SMTP inteira, enquanto `POST /api/settings/email/test` exige somente `{ email }`.
6. **Regras de validação não são aplicadas integralmente:** o backend usa limites e `customScoringRules`; os controles apresentados (`minimumScore`, domínios bloqueados, telefone obrigatório e bloqueio de descartáveis) não entram na avaliação atual.
7. **Modelo de dados vs. UI de clientes:** a tela prevê status, contato e contagem de leads, mas o endpoint lista apenas `id`, `name`, `apiKey` e `createdAt`.

### Segurança e operação

1. **Rotas administrativas estão desprotegidas:** JWT é emitido, mas não existe middleware que o valide nas rotas de painel. Clientes, leads, configurações e logs estão acessíveis sem sessão.
2. **Exposição de segredos e dados pessoais:** `GET /api/clients` retorna API keys; logs guardam corpo de requisições/respostas de leads; ambos são públicos enquanto não houver autorização.
3. **Risco de SSRF via webhook:** URLs e cabeçalhos configuráveis são usados pelo servidor em `fireWebhook` sem validação/restrição de destino.
4. **Segredos com fallback inseguro:** senha de banco tem fallback literal e `JWT_SECRET` aleatório invalida todas as sessões após reinício se não configurado.
5. **Seed automático:** `init-db.ts` cria um cliente e chave de API previsível de teste no primeiro start; isso deve ser separado do fluxo de produção.
6. **Inconsistência de URLs de produção:** a documentação declara uma base `/api/v1`, mas as rotas implementadas estão sob `/api`; links de verificação dependem de `APP_URL` e porta, enquanto o servidor escuta fixamente em 3000.
7. **CORS rígido mas dependente de configuração:** aceita apenas a origem idêntica a `FRONTEND_URL`; a variável precisa ser definida corretamente para qualquer frontend hospedado.

## Estado do repositório

- Não foram feitas alterações de implementação durante a análise.
- O repositório já possuía modificações locais em `backend/src/plugins/openapi.ts`, `frontend/.astro/dev.json`, `frontend/package.json`, `frontend/src/components/Sidebar.astro`, `frontend/src/layouts/Layout.astro` e `frontend/src/scripts/main.js`.
- Não há marcadores de conflito (`<<<<<<<`, `=======`, `>>>>>>>`) nos arquivos de código pesquisados, embora o ambiente tenha sinalizado um conflito de merge pendente no início da sessão. Esse estado deve ser conferido e resolvido antes de implementar ou commitar mudanças.

## Arquivos de referência prioritária para próximos pedidos

- Integração do painel: `frontend/src/lib/eden.ts`, `frontend/src/scripts/main.js`.
- Acesso e sessão: `frontend/src/pages/login.astro`, `frontend/src/pages/signup.astro`, `backend/src/routes/auth.routes.ts`, `backend/src/controllers/auth.controller.ts`.
- Configurações e canais: `frontend/src/pages/settings/*.astro`, `backend/src/routes/setting.routes.ts`, `backend/src/controllers/setting.controller.ts`, `backend/src/core/utils.ts`.
- Ingestão e qualificação: `backend/src/routes/lead.routes.ts`, `backend/src/controllers/lead.controller.ts`, `backend/src/models/lead.model.ts`.
- Dados, permissões e inicialização: `backend/src/core/{database,init-db}.ts`, `backend/src/models/*.ts`, `backend/src/index.ts`.

## Diretriz para a próxima solicitação

Priorizar qualquer alteração de forma vertical, alinhando interface, contrato de API, persistência e autorização no mesmo fluxo. Antes de disponibilizar o painel fora de ambiente local, tratar autenticação de todas as rotas administrativas, não retornar API keys/logs sem privilégios e validar/restringir URLs de webhook.
