# Brute Force no Login - Ciclo 5

## Nome

Ausência de controle de tentativas de autenticação (brute force).

## Descrição

O endpoint vulnerável permite tentativas ilimitadas de login sem qualquer bloqueio ou atraso. Um atacante pode automatizar milhares de tentativas até acertar credenciais válidas.

A versão segura aplica controle simples por IP + username, com bloqueio temporário após múltiplas falhas.

## Endpoints afetados

- Vulnerável: `POST /api/auth/bruteforce/vuln/login/`
- Seguro: `POST /api/auth/bruteforce/secure/login/`

## Como explorar

1. Escolher um usuário existente.
2. Enviar várias tentativas consecutivas com senha incorreta no endpoint vulnerável.
3. Confirmar que ele sempre responde `401` sem bloqueio/rate limit.
4. Repetir no endpoint seguro.
5. Confirmar retorno `429 Too Many Requests` após sequência de falhas.

## Impacto

- Aumento de chance de comprometimento por tentativa e erro
- Risco elevado quando usuários usam senhas fracas/reutilizadas
- Carga excessiva no backend durante ataques automatizados

## Como corrigir

- Implementar rate limiting por IP e/ou usuário
- Bloqueio temporário progressivo após falhas consecutivas
- Adicionar monitoramento e alerta para padrão de abuso

No projeto, o endpoint seguro aplica bloqueio por 60 segundos após 5 falhas consecutivas.

## Exemplo real (request/response)

Request (repetida diversas vezes):

```http
POST /api/auth/bruteforce/vuln/login/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{"username":"user1","password":"senha_errada"}
```

Response vulnerável (exemplo):

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"authenticated":false,"detail":"Credenciais inválidas.","warning":"Sem rate limit: endpoint vulnerável a brute force."}
```

Response seguro após várias falhas (exemplo):

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{"detail":"Muitas tentativas. Tente novamente mais tarde.","retry_after_seconds":58}
```
