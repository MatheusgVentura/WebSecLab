# File Upload Inseguro - Ciclo 6

## Nome

Upload de arquivo sem validação de extensão, MIME e tamanho.

## Descrição

O endpoint vulnerável aceita qualquer arquivo enviado pelo cliente, preserva nome original e salva sem validações de segurança.

A versão segura aplica controles mínimos:
- whitelist de extensões;
- whitelist de MIME;
- limite de tamanho;
- renomeação com nome aleatório.

## Endpoints afetados

- Vulnerável: `POST /api/upload/vuln/`
- Seguro: `POST /api/upload/secure/`

## Como explorar

1. Enviar arquivo potencialmente perigoso (`.php`, `.exe`, `.js`, etc.) no endpoint vulnerável.
2. Confirmar que o upload é aceito (`201`) e URL de arquivo é retornada.
3. Repetir no endpoint seguro.
4. Confirmar bloqueio (`400`) para tipos não permitidos.

## Impacto

- Upload de conteúdo malicioso
- Possível execução/entrega de arquivos perigosos
- Armazenamento de payload para ataques secundários
- Risco de abuso de storage

## Como corrigir

- Validar extensão e MIME com whitelist
- Limitar tamanho máximo do arquivo
- Renomear arquivo no servidor para evitar colisão/path tricks
- Armazenar fora de diretórios executáveis (hardening adicional)

No projeto, o endpoint seguro permite apenas:
- Extensões: `.png`, `.jpg`, `.jpeg`, `.pdf`, `.txt`
- MIME: `image/png`, `image/jpeg`, `application/pdf`, `text/plain`
- Tamanho máximo: `2MB`

## Exemplo real (request/response)

Request vulnerável (multipart):

```http
POST /api/upload/vuln/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: application/x-php

<?php echo "pwned"; ?>
------X--
```

Response vulnerável (exemplo):

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "detail": "Upload realizado no endpoint vulnerável.",
  "warning": "Sem validação de tipo/extensão.",
  "file_name": "shell.php"
}
```

Response segura (exemplo):

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"detail":"Extensão não permitida."}
```
