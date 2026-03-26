# CSRF em rotas com sessão/cookie - Ciclo 7

## Nome

Cross-Site Request Forgery (CSRF) em endpoint de alteração de email.

## Descrição

Foi criado um cenário baseado em autenticação por sessão (cookie), onde:
- o endpoint vulnerável aceita `POST` sem validar CSRF token;
- o endpoint seguro exige validação CSRF.

Assim, no vulnerável, uma página maliciosa pode disparar ação em nome do usuário autenticado.

## Endpoints

- Login de sessão (lab): `POST /api/csrf/session-login/`
- Gerar cookie CSRF: `GET /api/csrf/token/`
- Vulnerável: `POST /api/csrf/vuln/change-email/`
- Seguro: `POST /api/csrf/secure/change-email/`

## Como explorar

1. Autenticar com sessão em `csrf/session-login/` (receber cookie de sessão).
2. Enviar `POST` para endpoint vulnerável sem header `X-CSRFToken`.
3. Confirmar que o email é alterado mesmo sem token CSRF.
4. Repetir no endpoint seguro, também sem `X-CSRFToken`.
5. Confirmar bloqueio com `403 Forbidden`.

## Impacto

- Alteração de dados sensíveis sem consentimento do usuário
- Execução de ações autenticadas por terceiros (via site malicioso)
- Comprometimento de integridade da conta

## Como corrigir

- Exigir CSRF token em toda rota mutável baseada em sessão/cookie
- Manter `CsrfViewMiddleware` ativo
- Evitar `csrf_exempt` em rotas de negócio

## Exemplo real (request/response)

### 1) Vulnerável sem CSRF token

```http
POST /api/csrf/vuln/change-email/ HTTP/1.1
Host: 127.0.0.1:8000
Cookie: sessionid=<cookie_da_sessao>
Content-Type: application/json

{"email":"attacker@evil.local"}
```

Resposta esperada:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"detail":"Email alterado no endpoint vulnerável.","warning":"Endpoint sem validação CSRF (vulnerável)."}
```

### 2) Seguro sem CSRF token

```http
POST /api/csrf/secure/change-email/ HTTP/1.1
Host: 127.0.0.1:8000
Cookie: sessionid=<cookie_da_sessao>
Content-Type: application/json

{"email":"attacker@evil.local"}
```

Resposta esperada:

```http
HTTP/1.1 403 Forbidden
```
