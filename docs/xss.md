# XSS (Stored e Reflected) - Ciclo 3

## Nome

Cross-Site Scripting (XSS) em renderização de conteúdo sem escaping.

## Descrição

Foram implementados dois cenários de XSS:

- **Reflected XSS**: o parâmetro `q` é refletido diretamente no HTML da resposta.
- **Stored XSS**: comentários salvos no banco são renderizados sem sanitização.

Nos endpoints vulneráveis, o conteúdo é inserido no HTML sem `escape`, permitindo execução de JavaScript no navegador da vítima.

## Endpoints afetados

- Reflected vulnerável: `GET /api/xss/reflected/vuln/?q=<payload>`
- Reflected seguro: `GET /api/xss/reflected/secure/?q=<payload>`
- Stored vulnerável: `GET /api/xss/stored/vuln/`
- Stored seguro: `GET /api/xss/stored/secure/`
- Criação de comentário: `POST /api/comments/`

## Como explorar

### Reflected XSS

1. Abrir endpoint vulnerável com payload no parâmetro `q`.
2. Confirmar execução do script no navegador.

Payload exemplo:

```html
<script>alert('xss-reflected')</script>
```

### Stored XSS

1. Enviar comentário com payload malicioso em `content`.
2. Abrir listagem vulnerável de comentários.
3. Confirmar execução do script ao renderizar a página.

Payload exemplo:

```html
<script>alert('xss-stored')</script>
```

## Impacto

- Execução de JavaScript no contexto da aplicação
- Roubo de sessão/token (quando aplicável)
- Defacement de páginas
- Redirecionamento para phishing/malware
- Ações em nome da vítima (dependendo do contexto)

## Como corrigir

- Escapar output HTML em todos os pontos de renderização de input do usuário.
- Validar/sanitizar conteúdo quando necessário.
- Preferir templates/mecanismos seguros por padrão.
- Adicionar defesa em profundidade com headers como CSP (futuro ciclo de hardening).

No projeto, a mitigação foi aplicada com `django.utils.html.escape` nos endpoints seguros.

## Exemplo real (request/response)

### 1) Reflected XSS vulnerável

Request:

```http
GET /api/xss/reflected/vuln/?q=<script>alert('xss-reflected')</script> HTTP/1.1
Host: 127.0.0.1:8000
```

Response (trecho):

```html
<p>Resultado para: <script>alert('xss-reflected')</script></p>
```

### 2) Reflected XSS seguro

Request:

```http
GET /api/xss/reflected/secure/?q=<script>alert('xss-reflected')</script> HTTP/1.1
Host: 127.0.0.1:8000
```

Response (trecho):

```html
<p>Resultado para: &lt;script&gt;alert(&#x27;xss-reflected&#x27;)&lt;/script&gt;</p>
```

### 3) Stored XSS (inserção)

Request:

```http
POST /api/comments/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{"author_name":"attacker","content":"<script>alert('xss-stored')</script>"}
```

### 4) Stored XSS vulnerável (renderização)

Request:

```http
GET /api/xss/stored/vuln/ HTTP/1.1
Host: 127.0.0.1:8000
```

Response (trecho):

```html
<li><strong>attacker</strong>: <script>alert('xss-stored')</script></li>
```

### 5) Stored XSS seguro (renderização)

Request:

```http
GET /api/xss/stored/secure/ HTTP/1.1
Host: 127.0.0.1:8000
```

Response (trecho):

```html
<li><strong>attacker</strong>: &lt;script&gt;alert(&#x27;xss-stored&#x27;)&lt;/script&gt;</li>
```

## Evidências recomendadas para anexar

- Captura do alerta/script executando no endpoint vulnerável
- Captura da mesma entrada aparecendo escapada no endpoint seguro
- Request/response no Burp para os dois cenários (reflected e stored)
