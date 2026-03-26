# Broken Authentication/JWT - Ciclo 4

## Nome

Validação fraca de JWT (assinatura/expiração) em endpoint de perfil.

## Descrição

O endpoint vulnerável aceita token JWT sem verificar assinatura e sem verificar expiração. Isso permite que tokens forjados ou expirados sejam aceitos, quebrando a autenticação.

A versão segura usa autenticação padrão do DRF + SimpleJWT, validando assinatura, expiração e estrutura do token.

## Endpoints afetados

- Vulnerável: `GET /api/auth/jwt/vuln/profile/`
- Seguro: `GET /api/auth/jwt/secure/profile/`

## Como explorar

1. Obter um JWT válido (opcional, para base de comparação).
2. Forjar/editar token alterando claims (`user_id`, `exp`) ou usar token expirado.
3. Enviar no endpoint vulnerável com `Authorization: Bearer <token>`.
4. Confirmar aceitação indevida.
5. Repetir no endpoint seguro e confirmar bloqueio (`401`).

## Impacto

- Bypass de autenticação
- Impersonação de usuário por manipulação de `user_id`
- Acesso a dados/ações sem credenciais válidas
- Quebra total de confiança no mecanismo de sessão/token

## Como corrigir

- Sempre validar assinatura e expiração do JWT.
- Rejeitar tokens alterados, expirados ou com algoritmo inválido.
- Centralizar autenticação no middleware/classe segura (`JWTAuthentication`).

No projeto:
- A versão vulnerável decodifica token com `verify_signature=False` e `verify_exp=False`.
- A versão segura exige `IsAuthenticated` com validação padrão do SimpleJWT.

## Exemplo real (request/response)

### 1) Endpoint vulnerável aceita token malformado/forjado

Request:

```http
GET /api/auth/jwt/vuln/profile/ HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <token_manipulado_ou_expirado>
```

Response (exemplo):

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "detail": "Token aceito pela versão vulnerável.",
  "warning": "Assinatura e expiração não são validadas.",
  "token_payload": {"user_id": 2, "exp": 1}
}
```

### 2) Endpoint seguro bloqueia token inválido

Request:

```http
GET /api/auth/jwt/secure/profile/ HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <token_manipulado_ou_expirado>
```

Response (exemplo):

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"detail":"Given token not valid for any token type","code":"token_not_valid"}
```

## Evidências recomendadas para anexar

- Requisição/resposta do endpoint vulnerável aceitando token inválido
- Requisição/resposta do endpoint seguro bloqueando o mesmo token
- Captura no Burp Repeater comparando os dois endpoints
