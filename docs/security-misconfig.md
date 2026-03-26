# Security Misconfiguration - Ciclo 8

## Nome

Configuração Incorreta de Segurança (CORS Permissivo e Vazamento de Informações).

## Descrição

A má configuração de segurança ocorre quando a aplicação não está adequadamente protegida no nível de arquitetura, servidores web ou frameworks. Neste laboratório, simulamos duas ocorrências comuns:

1. **CORS Muito Permissivo:** O backend aceita requisições cross-origin de *qualquer* site e reflete o cabeçalho `Origin` junto com `Access-Control-Allow-Credentials: true`.
2. **Vazamento de Informações / Stacktrace:** Erros não tratados resultam na exibição de detalhes internos (como *stack trace* do Python/Django, versões e caminhos do sistema de arquivos), simulando um ambiente com `DEBUG=True` em produção.

A versão segura aplica limites rigorosos no CORS (whitelist) e lida com exceções retornando mensagens genéricas (`500 Internal Server Error`).

## Endpoints afetados

- Vulneráveis: 
  - `GET /api/misconfig/cors/vuln/`
  - `GET /api/misconfig/error/vuln/`
- Seguros: 
  - `GET /api/misconfig/cors/secure/`
  - `GET /api/misconfig/error/secure/`

## Como explorar

### Cenário 1: CORS Permissivo

1. Interceptar a requisição para o endpoint de CORS vulnerável no Burp Suite.
2. Adicionar o cabeçalho: `Origin: https://site-malicioso.com`.
3. Observar a resposta da API devolvendo:
   - `Access-Control-Allow-Origin: https://site-malicioso.com`
   - `Access-Control-Allow-Credentials: true`
4. Isso prova que um atacante em `site-malicioso.com` conseguiria ler as respostas sensíveis desta API usando requisições AJAX do navegador da vítima.

### Cenário 2: Vazamento de Informação

1. Fazer uma requisição `GET` para o endpoint de erro vulnerável.
2. Inspecionar o corpo da resposta (`500`).
3. Confirmar a presença de nomes de variáveis internas, blocos de código ou caminhos de diretório (ex: `/var/www/html/...`).

## Impacto

- **CORS:** Quebra de isolamento do navegador (Same-Origin Policy), permitindo roubo de dados sensíveis e tomada de contas.
- **Vazamento:** Revelação de superfície de ataque, tecnologias utilizadas, o que facilita ataques direcionados e RCEs (Remote Code Execution).

## Como corrigir

- **CORS:** Utilizar bibliotecas padronizadas (como `django-cors-headers`) e configurar `CORS_ALLOWED_ORIGINS` contendo estritamente os domínios necessários.
- **Erros:** Nunca habilitar `DEBUG=True` em produção. Implementar *middlewares* globais de tratamento de erro para garantir que qualquer exceção resulte em uma resposta genérica para o usuário e um log detalhado armazenado de forma segura no servidor.

## Exemplo real (request/response)

### Vazamento de Stacktrace (Vulnerável)

Request:

```http
GET /api/misconfig/error/vuln/ HTTP/1.1
Host: 127.0.0.1:8000
```

Response (exemplo encurtado):

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error_type": "ZeroDivisionError",
  "error_message": "division by zero",
  "stacktrace": "Traceback (most recent call last):\n  File \"/home/user/WebSecLab/views.py\", line 15, in error_vuln_view\n    resultado = 1 / 0\nZeroDivisionError: division by zero\n",
  "db_path": "/var/lib/sqlite/db.sqlite3"
}
```

## Evidências recomendadas para anexar

- Print do Burp Repeater mostrando o cabeçalho `Origin` forjado sendo refletido.
- Print da resposta vulnerável vazando o erro interno.