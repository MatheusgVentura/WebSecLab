from django.contrib.auth.models import User
from django.db import connection
from django.contrib.auth import authenticate, login
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.utils.html import escape
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
import jwt
import time
import json
import traceback
import logging
import os
from uuid import uuid4
from pathlib import Path
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Comment
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck(request):
    return Response({"status": "ok"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get("username")
    password = request.data.get("password")
    email = request.data.get("email", "")

    if not username or not password:
        return Response(
            {"detail": "username e password são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"detail": "Usuário já existe."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )

    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "detail": "Usuário criado com sucesso.",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def vulnerable_sqli_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {"detail": "username e password são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Vulnerável de propósito: concatenação direta de input na query.
    query = (
        "SELECT id, username FROM auth_user "
        f"WHERE username = '{username}' AND password = '{password}'"
    )

    with connection.cursor() as cursor:
        cursor.execute(query)
        row = cursor.fetchone()

    if not row:
        return Response(
            {"authenticated": False, "detail": "Credenciais inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    access_token = ""
    refresh_token = ""
    try:
        user_obj = User.objects.get(id=row[0])
        login(request, user_obj)
        refresh = RefreshToken.for_user(user_obj)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
    except User.DoesNotExist:
        pass

    return Response(
        {
            "authenticated": True,
            "detail": "Login aceito pela versão vulnerável.",
            "user": {"id": row[0], "username": row[1]},
            "access": access_token,
            "refresh": refresh_token,
            "warning": "Endpoint intencionalmente vulnerável a SQL Injection.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def secure_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {"detail": "username e password são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Versão segura: valida credenciais via autenticação padrão do Django.
    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {"authenticated": False, "detail": "Credenciais inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)
    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "authenticated": True,
            "detail": "Login aceito pela versão segura.",
            "user": {"id": user.id, "username": user.username},
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vulnerable_idor_user_lookup(request):
    user_id = request.query_params.get("id")
    if not user_id:
        return Response(
            {"detail": "Parâmetro 'id' é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Usuário não encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Vulnerável de propósito: não valida ownership/autorização do recurso.
    return Response(
        {
            "detail": "Dados retornados sem validação de ownership (IDOR).",
            "requested_by_user_id": request.user.id,
            "user": {
                "id": target_user.id,
                "username": target_user.username,
                "email": target_user.email,
            },
            "warning": "Endpoint intencionalmente vulnerável a IDOR.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def secure_user_lookup(request):
    user_id = request.query_params.get("id")
    if not user_id:
        return Response(
            {"detail": "Parâmetro 'id' é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        requested_id = int(user_id)
    except (TypeError, ValueError):
        return Response(
            {"detail": "Parâmetro 'id' inválido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Versão segura: usuário só pode acessar o próprio recurso.
    if requested_id != request.user.id:
        return Response(
            {"detail": "Acesso negado ao recurso solicitado."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(
        {
            "detail": "Dados retornados com validação de ownership.",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def create_comment(request):
    author_name = request.data.get("author_name", "anonymous")
    content = request.data.get("content", "")
    if not content:
        return Response(
            {"detail": "Campo 'content' é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment = Comment.objects.create(author_name=author_name, content=content)
    return Response(
        {
            "detail": "Comentário salvo.",
            "comment": {
                "id": comment.id,
                "author_name": comment.author_name,
                "content": comment.content,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def reflected_xss_vulnerable(request):
    q = request.query_params.get("q", "")
    html = f"""
    <html><body>
      <h2>Busca vulnerável</h2>
      <p>Resultado para: {q}</p>
    </body></html>
    """
    return HttpResponse(html)


@api_view(["GET"])
@permission_classes([AllowAny])
def reflected_xss_secure(request):
    q = request.query_params.get("q", "")
    html = f"""
    <html><body>
      <h2>Busca segura</h2>
      <p>Resultado para: {escape(q)}</p>
    </body></html>
    """
    return HttpResponse(html)


@api_view(["GET"])
@permission_classes([AllowAny])
def stored_xss_vulnerable(request):
    comments = Comment.objects.order_by("-created_at")[:20]
    rows = "".join(
        f"<li><strong>{c.author_name}</strong>: {c.content}</li>" for c in comments
    )
    html = f"""
    <html><body>
      <h2>Comentários (vulnerável)</h2>
      <ul>{rows}</ul>
    </body></html>
    """
    return HttpResponse(html)


@api_view(["GET"])
@permission_classes([AllowAny])
def stored_xss_secure(request):
    comments = Comment.objects.order_by("-created_at")[:20]
    rows = "".join(
        f"<li><strong>{escape(c.author_name)}</strong>: {escape(c.content)}</li>"
        for c in comments
    )
    html = f"""
    <html><body>
      <h2>Comentários (seguro)</h2>
      <ul>{rows}</ul>
    </body></html>
    """
    return HttpResponse(html)


@api_view(["GET"])
@permission_classes([AllowAny])
def vulnerable_jwt_profile(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return Response(
            {"detail": "Bearer token não enviado."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        # Vulnerável de propósito: não valida assinatura nem expiração.
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False},
            algorithms=["HS256", "none"],
        )
    except Exception as exc:
        return Response(
            {"detail": f"Token inválido no parse: {exc}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_id = payload.get("user_id")
    user_data = None
    if user_id:
        try:
            db_user = User.objects.get(id=user_id)
            user_data = {
                "id": db_user.id,
                "username": db_user.username,
                "email": db_user.email,
            }
        except User.DoesNotExist:
            user_data = {"id": user_id, "detail": "Usuário do claim não existe."}

    return Response(
        {
            "detail": "Token aceito pela versão vulnerável.",
            "warning": "Assinatura e expiração não são validadas.",
            "token_payload": payload,
            "resolved_user": user_data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def secure_jwt_profile(request):
    return Response(
        {
            "detail": "Token validado corretamente pela versão segura.",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def vulnerable_bruteforce_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")
    if not username or not password:
        return Response(
            {"detail": "username e password são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {
                "authenticated": False,
                "detail": "Credenciais inválidas.",
                "warning": "Sem rate limit: endpoint vulnerável a brute force.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(
        {
            "authenticated": True,
            "detail": "Login aceito no endpoint vulnerável.",
            "user": {"id": user.id, "username": user.username},
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def secure_bruteforce_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")
    if not username or not password:
        return Response(
            {"detail": "username e password são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client_ip = request.META.get("REMOTE_ADDR", "unknown")
    key = f"bf:{client_ip}:{username}"
    state = cache.get(key, {"fails": 0, "blocked_until": 0})
    now_ts = time.time()

    if state["blocked_until"] > now_ts:
        retry_after = int(state["blocked_until"] - now_ts)
        return Response(
            {
                "detail": "Muitas tentativas. Tente novamente mais tarde.",
                "retry_after_seconds": retry_after,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user = authenticate(username=username, password=password)
    if not user:
        state["fails"] += 1
        if state["fails"] >= 5:
            state["blocked_until"] = now_ts + 60
            state["fails"] = 0
        cache.set(key, state, timeout=120)
        return Response(
            {"authenticated": False, "detail": "Credenciais inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    cache.delete(key)
    return Response(
        {
            "authenticated": True,
            "detail": "Login aceito no endpoint seguro.",
            "user": {"id": user.id, "username": user.username},
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def vulnerable_file_upload(request):
    upload = request.FILES.get("file")
    if not upload:
        return Response(
            {"detail": "Arquivo não enviado no campo 'file'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Vulnerável de propósito: aceita qualquer extensão/MIME e preserva nome original.
    save_path = default_storage.save(f"uploads/vuln/{upload.name}", upload)
    return Response(
        {
            "detail": "Upload realizado no endpoint vulnerável.",
            "warning": "Sem validação de tipo/extensão.",
            "file_name": upload.name,
            "stored_path": save_path,
            "file_url": f"{settings.MEDIA_URL}{save_path}",
            "content_type": upload.content_type,
            "size": upload.size,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def secure_file_upload(request):
    upload = request.FILES.get("file")
    if not upload:
        return Response(
            {"detail": "Arquivo não enviado no campo 'file'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed_ext = {".png", ".jpg", ".jpeg", ".pdf", ".txt"}
    allowed_mime = {
        "image/png",
        "image/jpeg",
        "application/pdf",
        "text/plain",
    }
    max_size = 2 * 1024 * 1024  # 2 MB

    ext = Path(upload.name).suffix.lower()
    if ext not in allowed_ext:
        return Response(
            {"detail": "Extensão não permitida."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if upload.content_type not in allowed_mime:
        return Response(
            {"detail": "Tipo MIME não permitido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if upload.size > max_size:
        return Response(
            {"detail": "Arquivo excede o limite de 2MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    safe_name = f"{uuid4().hex}{ext}"
    save_path = default_storage.save(f"uploads/secure/{safe_name}", upload)
    return Response(
        {
            "detail": "Upload realizado no endpoint seguro.",
            "file_name": safe_name,
            "stored_path": save_path,
            "file_url": f"{settings.MEDIA_URL}{save_path}",
            "content_type": upload.content_type,
            "size": upload.size,
        },
        status=status.HTTP_201_CREATED,
    )


@csrf_exempt
def csrf_session_login(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Método não permitido."}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"detail": "JSON inválido."}, status=400)

    username = data.get("username", "")
    password = data.get("password", "")
    user = authenticate(request, username=username, password=password)
    if not user:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)

    login(request, user)
    return JsonResponse(
        {
            "detail": "Sessão autenticada criada.",
            "user": {"id": user.id, "username": user.username},
        },
        status=200,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def lab_mode(request):
    """
    Retorna o modo atual do laboratório configurado via variável de ambiente.
    Padrão é 'vulnerable' se não estiver definido.
    """
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    return Response({"lab_mode": mode}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def misconfig_cors_vuln(request):
    response = Response(
        {
            "detail": "CORS mal configurado permite leitura deste dado",
            "user_id": 1,
            "secret_data": "SuperSecret123"
        },
        status=status.HTTP_200_OK
    )
    
    # Má configuração: reflete o Origin indiscriminadamente
    origin = request.headers.get("Origin")
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
    
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def misconfig_cors_secure(request):
    response = Response(
        {
            "detail": "Acesso seguro. CORS restrito.",
            "user_id": 1
        },
        status=status.HTTP_200_OK
    )
    
    # Configuração Segura: Whitelist
    allowed_origins = ["https://frontend-confiavel.com"]
    origin = request.headers.get("Origin")
    
    if origin in allowed_origins:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def misconfig_error_vuln(request):
    try:
        # Simulando uma falha interna do sistema
        resultado = 1 / 0
    except Exception as e:
        # Vazamento explícito do erro e do stacktrace simulando DEBUG=True
        return Response(
            {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "stacktrace": traceback.format_exc(),
                "db_path": str(settings.DATABASES.get("default", {}).get("NAME", "unknown"))
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def misconfig_error_secure(request):
    try:
        resultado = 1 / 0
    except Exception as e:
        # Prática correta: Registra o erro no servidor para a equipe investigar
        logger.error(f"Erro interno: {str(e)}")
        # Retorna erro genérico e opaco para o usuário/atacante
        return Response(
            {"detail": "Ocorreu um erro interno no servidor. Nossa equipe foi notificada."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================================
# ROTAS UNIFICADAS (BLACK-BOX LAB)
# O Frontend consome estas rotas, sem saber se estão seguras ou não.
# =====================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def api_login(request):
    """Login unificado (Alvo de SQLi e Brute Force)"""
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    if mode == "secure":
        return secure_login(request._request)
    return vulnerable_sqli_login(request._request)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def api_user_lookup(request):
    """Busca de usuário unificada (Alvo de IDOR)"""
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    if mode == "secure":
        return secure_user_lookup(request._request)
    return vulnerable_idor_user_lookup(request._request)

@api_view(["POST"])
@permission_classes([AllowAny])
def api_file_upload(request):
    """Upload unificado (Alvo de File Upload Inseguro)"""
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    if mode == "secure":
        return secure_file_upload(request._request)
    return vulnerable_file_upload(request._request)

@api_view(["GET"])
@permission_classes([AllowAny])
def api_reflected_xss(request):
    """Busca unificada (Alvo de Reflected XSS)"""
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    if mode == "secure":
        return reflected_xss_secure(request._request)
    return reflected_xss_vulnerable(request._request)

@csrf_exempt
def api_csrf_change_email(request):
    """Alteração de Email unificada (Alvo de CSRF)"""
    mode = os.environ.get("LAB_MODE", getattr(settings, "LAB_MODE", "vulnerable"))
    if mode == "secure":
        return csrf_secure_change_email(request)
    return csrf_vulnerable_change_email(request)


@ensure_csrf_cookie
def csrf_get_token(request):
    return JsonResponse(
        {"detail": "Cookie CSRF gerado. Use X-CSRFToken no endpoint seguro."},
        status=200,
    )


@csrf_exempt
def csrf_vulnerable_change_email(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Método não permitido."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Usuário não autenticado via sessão."}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"detail": "JSON inválido."}, status=400)

    new_email = data.get("email", "")
    if not new_email:
        return JsonResponse({"detail": "Campo 'email' é obrigatório."}, status=400)

    request.user.email = new_email
    request.user.save(update_fields=["email"])
    return JsonResponse(
        {
            "detail": "Email alterado no endpoint vulnerável.",
            "warning": "Endpoint sem validação CSRF (vulnerável).",
            "email": request.user.email,
        },
        status=200,
    )


@csrf_protect
def csrf_secure_change_email(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Método não permitido."}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Usuário não autenticado via sessão."}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"detail": "JSON inválido."}, status=400)

    new_email = data.get("email", "")
    if not new_email:
        return JsonResponse({"detail": "Campo 'email' é obrigatório."}, status=400)

    request.user.email = new_email
    request.user.save(update_fields=["email"])
    return JsonResponse(
        {
            "detail": "Email alterado no endpoint seguro com CSRF.",
            "email": request.user.email,
        },
        status=200,
    )
