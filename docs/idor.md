# IDOR - Insecure Direct Object Reference (Ciclo 2)

## Nome

IDOR em consulta de usuário por identificador (`id`).

## Descrição

O endpoint vulnerável permite que um usuário autenticado consulte dados de outro usuário apenas alterando o parâmetro `id` na URL, sem validação de ownership/autorização do recurso.

Isso caracteriza IDOR: o objeto direto (registro de usuário) é acessível por referência previsível (`id`) sem verificação adequada.

## Endpoints afetados

- Vulnerável: `GET /api/users/vuln/?id=<id>`
- Seguro (correção): `GET /api/users/secure/?id=<id>`

## Pré-requisitos

- Dois usuários válidos (ex.: `user1` e `user2`)
- Token JWT de `user1` no header:
  - `Authorization: Bearer <access_token_user1>`

## Como explorar

1. Autenticar como `user1` e obter token JWT.
2. Enviar `GET /api/users/vuln/?id=<id_user2>` com token de `user1`.
3. Confirmar que a API retorna os dados de `user2` (acesso indevido).

## Impacto

- Exposição de dados sensíveis de outros usuários
- Quebra de isolamento entre contas
- Violação de confidencialidade e privacidade
- Base para ataques encadeados (enumeração e coleta de dados)

## Como corrigir

- Validar ownership em todo acesso a recurso por ID.
- Em rotas de perfil, ignorar `id` externo e usar `request.user.id`, ou bloquear quando `id != request.user.id`.
- Retornar `403 Forbidden` quando o usuário tentar acessar recurso de terceiros.

No projeto, a correção foi aplicada no endpoint:
- `GET /api/users/secure/?id=<id>`

## Exemplo real (request/response)

### 1) Endpoint vulnerável (esperado: acesso indevido)

Request:

```http
GET /api/users/vuln/?id=2 HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <token_do_user1>
```

Response (exemplo):

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "detail": "Dados retornados sem validação de ownership (IDOR).",
  "requested_by_user_id": 1,
  "user": {
    "id": 2,
    "username": "user2",
    "email": "user2@lab.local"
  },
  "warning": "Endpoint intencionalmente vulnerável a IDOR."
}
```

### 2) Endpoint seguro com mesmo cenário (esperado: bloqueio)

Request:

```http
GET /api/users/secure/?id=2 HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <token_do_user1>
```

Response (exemplo):

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"detail": "Acesso negado ao recurso solicitado."}
```

## Evidências recomendadas para anexar

- Requisição/resposta do endpoint vulnerável com `id` de terceiro
- Requisição/resposta do endpoint seguro com o mesmo `id`
- Evidência do token utilizado (`user1`) para provar falta de ownership no vulnerável
