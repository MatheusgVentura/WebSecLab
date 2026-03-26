# 🛡️ WebSecLab

**WebSecLab** é um laboratório de segurança ofensiva e defensiva de código aberto, projetado para treinar e demonstrar na prática as vulnerabilidades do [OWASP Top 10](https://owasp.org/www-project-top-ten/). Cada vulnerabilidade é implementada em **dois modos**: *vulnerável* (para você atacar) e *seguro* (para ver a correção em ação).

> ⚠️ **Aviso Legal:** Este projeto contém vulnerabilidades **intencionais** para fins educacionais. Execute **apenas** em ambiente local controlado. Nunca reproduza as técnicas aqui estudadas em sistemas sem autorização explícita.

---

## 📋 Índice

- [Arquitetura](#-arquitetura)
- [Vulnerabilidades implementadas](#-vulnerabilidades-implementadas)
- [Como funciona o LAB\_MODE](#️-como-funciona-o-lab_mode)
- [Setup rápido](#-setup-rápido)
- [Referência de endpoints](#-referência-de-endpoints)
- [Documentação por vulnerabilidade](#-documentação-por-vulnerabilidade)
- [Stack de tecnologias](#-stack-de-tecnologias)

---

## 🏗️ Arquitetura

O projeto é uma SPA + API REST clássica, dividida em dois diretórios independentes:

```
WebSecLab/
├── backend/          # API Django + DRF (Python)
│   ├── accounts/     # App principal: models, views, tests
│   ├── app/          # Configurações Django (settings, urls, wsgi)
│   ├── middlewares/  # Middlewares customizados do lab
│   ├── models/       # Modelos de dados do lab
│   ├── services/     # Lógica de negócio (SQL bruto, JWT, upload, etc.)
│   ├── .env.example  # Template de variáveis de ambiente
│   ├── manage.py
│   └── requirements.txt
├── frontend/         # React + Vite + Tailwind CSS v4
│   └── src/
│       ├── pages/    # Login, Register, Profile, Search, Upload
│       ├── App.jsx   # Roteamento principal
│       └── main.jsx
└── docs/             # Documentação técnica por vulnerabilidade
```

**Backend:** Django 6 · Django REST Framework · SimpleJWT · SQLite  
**Frontend:** React 19 · Vite 8 · Tailwind CSS v4 · React Router 7

---

## 🧨 Vulnerabilidades implementadas

O lab cobre **8 ciclos** completos — cada um com endpoint vulnerável, endpoint seguro, exploração documentada e testes automatizados.

| # | Vulnerabilidade | Endpoint Vulnerável | Endpoint Seguro |
|---|-----------------|---------------------|-----------------|
| 1 | **SQL Injection** (Login Bypass) | `POST /api/v1/login/` (LAB_MODE=vulnerable) | `POST /api/v1/login/` (LAB_MODE=secure) |
| 2 | **IDOR** (Insecure Direct Object Reference) | `GET /api/users/vuln/?id=X` | `GET /api/users/secure/?id=X` |
| 3 | **XSS Reflected** | `GET /api/xss/reflected/vuln/?q=` | `GET /api/xss/reflected/secure/?q=` |
| 3b | **XSS Stored** | `POST /api/xss/stored/vuln/` | `POST /api/xss/stored/secure/` |
| 4 | **Broken Auth / JWT** | `GET /api/auth/jwt/vuln/profile/` | `GET /api/auth/jwt/secure/profile/` |
| 5 | **Brute Force** (sem rate limit) | `POST /api/auth/bruteforce/vuln/login/` | `POST /api/auth/bruteforce/secure/login/` |
| 6 | **Insecure File Upload** | `POST /api/upload/vuln/` | `POST /api/upload/secure/` |
| 7 | **CSRF** (Cross-Site Request Forgery) | `POST /api/csrf/vuln/change-email/` | `POST /api/csrf/secure/change-email/` |
| 8 | **Security Misconfiguration** (CORS, stacktrace) | `GET /api/misconfig/cors/vuln/` | `GET /api/misconfig/cors/secure/` |

---

## ⚙️ Como funciona o LAB_MODE

A variável de ambiente `LAB_MODE` controla o comportamento de todas as rotas unificadas `/api/v1/`:

| Valor | Comportamento |
|-------|---------------|
| `vulnerable` **(padrão)** | O backend executa lógica insegura propositalmente — confia cegamente nos inputs, usa SQL concatenado, aceita qualquer arquivo, etc. |
| `secure` | O backend ativa validações, queries parametrizadas, MIME-type check, tokens CSRF, rate limiting e sanitização de output. |

**Verificar modo ativo:**
```
GET /api/lab/mode
```

**Alternar o modo:**
```bash
# PowerShell (Windows)
$env:LAB_MODE="secure"

# Bash (Linux/macOS)
export LAB_MODE="secure"
```

---

## 🚀 Setup rápido

### Pré-requisitos

- Python 3.10+
- Node.js 18+

### 1. Backend (API Django)

```bash
cd backend

# Criar e ativar o ambiente virtual
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e defina DJANGO_SECRET_KEY com uma chave nova:
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Criar o banco de dados
python manage.py makemigrations
python manage.py migrate

# Subir a API (porta 8000)
python manage.py runserver
```

### 2. Frontend (React)

Em um **novo terminal**:

```bash
cd frontend

# Instalar dependências Node
npm install

# Iniciar servidor de desenvolvimento (porta 5173)
npm run dev
```

Acesse **http://localhost:5173** no navegador.

> **Dica para Burp Suite / OWASP ZAP:**  
> Inicie o frontend com `npm run dev -- --host 127.0.0.1` e acesse `http://127.0.0.1:5173` no browser do proxy para evitar problemas de resolução de host.

---

## 📁 Telas do Frontend

| Página | Rota | Vulnerabilidade explorada |
|--------|------|---------------------------|
| **Login** | `/` | SQL Injection — tente `admin' --` no campo username |
| **Register** | `/register` | Criação de usuários de teste |
| **Profile** | `/profile` | IDOR (troca de ID) + CSRF (mudança de e-mail) |
| **Search** | `/search` | Reflected XSS — tente `<img src=x onerror=alert(1)>` |
| **Upload** | `/upload` | Insecure File Upload — suba um `.php` ou `.exe` |

---

## 📚 Vulnerabilidades detalhadas

### 1. SQL Injection (Login Bypass)

**A falha:** No modo vulnerável, a query de login é montada por concatenação de string direta:
```python
# Modo vulnerável
f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
```

**Exploração rápida:**
- Username: `admin' --` + qualquer senha → acesso como admin sem saber a senha
- Username: `' OR 1=1 --` + qualquer senha → acesso como o primeiro usuário do banco

**A correção:** No modo seguro, usa queries parametrizadas/ORM que tratam o input como dado, não como código.

---

### 2. IDOR (Insecure Direct Object Reference)

**A falha:** O endpoint vulnerável verifica apenas se o token JWT é válido, mas **não verifica se o ID solicitado pertence ao usuário autenticado**.

**Exploração:**
```http
GET /api/users/vuln/?id=2
Authorization: Bearer <token_do_usuario_1>
```
→ Retorna os dados privados do usuário 2.

**A correção:** O endpoint seguro compara `request.user.id == id_solicitado` antes de retornar.

---

### 3. XSS (Cross-Site Scripting)

**A falha:** O backend reflete o parâmetro `q` sem escape e o frontend usa `dangerouslySetInnerHTML` para renderizar a resposta.

**Exploração:**
```
GET /api/xss/reflected/vuln/?q=<img src=x onerror=alert('XSS')>
```

**A correção:** O backend escapa a string com `html.escape()` antes de devolvê-la.

---

### 4. Broken Auth / JWT

**A falha:** O endpoint vulnerável aceita tokens JWT expirados ou assinados com chave arbitrária sem validação adequada.

**Exploração:** Forge um token JWT com `alg: none` ou simplesmente use um token expirado.

**A correção:** O endpoint seguro usa `rest_framework_simplejwt` com validação completa de assinatura e expiração.

---

### 5. Brute Force (sem Rate Limiting)

**A falha:** Nenhum limite de tentativas de login no modo vulnerável — é possível rodar um dicionário de senhas sem bloqueio.

**Exploração:** Use Burp Intruder ou `hydra` com lista de senhas contra `/api/auth/bruteforce/vuln/login/`.

**A correção:** O modo seguro retorna `HTTP 429 Too Many Requests` após 5 tentativas falhas consecutivas.

---

### 6. Insecure File Upload

**A falha:** O servidor aceita qualquer tipo de arquivo sem verificar extensão nem MIME type real (via `python-magic`).

**Exploração:** Faça upload de `shell.php` → o servidor hospeda e retorna a URL pública do arquivo.

**A correção:** O modo seguro valida extensão por whitelist (`jpg, png, pdf, txt`) e verifica o MIME type real do binário.

---

### 7. CSRF (Cross-Site Request Forgery)

**A falha:** O endpoint de troca de e-mail confia apenas no cookie de sessão, sem exigir token CSRF.

**Exploração:**
```html
<!-- Página maliciosa em outro domínio -->
<form action="http://localhost:8000/api/csrf/vuln/change-email/" method="POST">
  <input name="email" value="hacker@evil.com">
</form>
<script>document.forms[0].submit()</script>
```

**A correção:** O modo seguro exige o header `X-CSRFToken` válido em toda requisição de mutação.

---

### 8. Security Misconfiguration

**A falha:** CORS permissivo (`Access-Control-Allow-Origin: *`) e vazamento de stacktrace completo em erros 500.

**Exploração:**
- Requisição cross-origin de qualquer domínio é aceita.
- Uma requisição malformada retorna o traceback Python completo, expondo estrutura de pastas, versão do framework e nomes de funções internas.

**A correção:** CORS restrito a origens explícitas, erros 500 retornam mensagem genérica sem informações internas.

---

## 🧪 Testes automatizados

O projeto inclui uma suíte de testes de segurança em `backend/accounts/tests.py`:

```bash
cd backend
python manage.py test accounts
```

**Cobertura atual (7 testes):**
- ✅ SQL Injection bloqueado no modo seguro
- ✅ IDOR bloqueado no modo seguro
- ✅ XSS escapado no modo seguro
- ✅ JWT expirado rejeitado no modo seguro
- ✅ Brute force bloqueado com 429 no modo seguro
- ✅ Upload de arquivo inválido bloqueado no modo seguro
- ✅ CSRF bloqueado no modo seguro

---

## 🔧 Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste os valores:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DJANGO_SECRET_KEY` | Chave secreta Django — **gere uma nova** | fallback inseguro |
| `DJANGO_DEBUG` | Ativa o modo debug (`True`/`False`) | `False` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos (separados por vírgula) | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Origins CORS permitidas (separadas por vírgula) | `http://localhost:5173` |
| `LAB_MODE` | Modo do laboratório (`vulnerable`/`secure`) | `vulnerable` |

**Gerar uma SECRET_KEY nova:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 📖 Documentação por vulnerabilidade

Cada vulnerabilidade tem seu próprio arquivo em `/docs` com: descrição, payload de exploração, evidências de request/response e como corrigir.

| Arquivo | Conteúdo |
|---------|----------|
| [`docs/sql-injection-login.md`](docs/sql-injection-login.md) | SQL Injection no login |
| [`docs/idor.md`](docs/idor.md) | IDOR na consulta de usuários |
| [`docs/xss.md`](docs/xss.md) | XSS Reflected e Stored |
| [`docs/broken-auth-jwt.md`](docs/broken-auth-jwt.md) | JWT mal validado |
| [`docs/brute-force.md`](docs/brute-force.md) | Brute Force sem rate limit |
| [`docs/file-upload-inseguro.md`](docs/file-upload-inseguro.md) | Upload sem validação |
| [`docs/csrf.md`](docs/csrf.md) | CSRF na troca de e-mail |
| [`docs/security-misconfig.md`](docs/security-misconfig.md) | CORS e vazamento de stacktrace |

---

## 🛠️ Stack de tecnologias

**Backend**
- [Django 6](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
- [SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/) para autenticação JWT
- [django-cors-headers](https://github.com/adamchainz/django-cors-headers) para CORS
- [python-dotenv](https://github.com/theskumar/python-dotenv) para variáveis de ambiente
- SQLite (banco de dados de desenvolvimento)

**Frontend**
- [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router 7](https://reactrouter.com/)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Abrir issues relatando bugs ou sugerindo novas vulnerabilidades
- Submeter PRs com novos ciclos de ataque/defesa
- Melhorar a documentação em `/docs`

---

*As técnicas aqui estudadas são baseadas em ambientes construídos estritamente para fins educacionais e acadêmicos. Não reproduza em sistemas sem consentimento explícito.*
