from django.test import TestCase, override_settings
from django.conf import settings


class SecurityConfigTest(TestCase):
    """
    REAL-01 / REAL-02 / REAL-03 — Verify that critical settings are driven
    by environment variables and not hardcoded.
    """

    def test_secret_key_is_not_the_old_hardcoded_value(self):
        """REAL-01: SECRET_KEY must not be the original hardcoded insecure key."""
        old_key = 'django-insecure-s&b1i6si*cfc))uqihu68g9cnm%xpnf66iv!ep+3ztzxb*2dbd'
        self.assertNotEqual(
            settings.SECRET_KEY,
            old_key,
            msg="SECRET_KEY still matches the original hardcoded value — load it from .env",
        )

    def test_secret_key_is_not_empty(self):
        """SECRET_KEY must be a non-empty string."""
        self.assertTrue(
            bool(settings.SECRET_KEY),
            msg="SECRET_KEY is empty",
        )

    def test_allowed_hosts_is_not_empty(self):
        """REAL-03: ALLOWED_HOSTS must not be an empty list."""
        self.assertTrue(
            len(settings.ALLOWED_HOSTS) > 0,
            msg="ALLOWED_HOSTS is an empty list — set DJANGO_ALLOWED_HOSTS in .env",
        )


class CORSHeadersTest(TestCase):
    """
    REAL-04 — Verify that CORS is managed by django-cors-headers, not ad-hoc view code.
    """

    @override_settings(
        CORS_ALLOWED_ORIGINS=['http://localhost:5173'],
        CORS_ALLOW_CREDENTIALS=True,
    )
    def test_allowed_origin_receives_cors_header(self):
        """Requests from an allowed origin get Access-Control-Allow-Origin."""
        response = self.client.get(
            '/api/health/',
            HTTP_ORIGIN='http://localhost:5173',
        )
        self.assertEqual(
            response.get('Access-Control-Allow-Origin'),
            'http://localhost:5173',
            msg="Expected CORS header for allowed origin http://localhost:5173",
        )

    @override_settings(
        CORS_ALLOWED_ORIGINS=['http://localhost:5173'],
    )
    def test_unknown_origin_does_not_receive_cors_header(self):
        """Requests from an unknown origin must NOT get Access-Control-Allow-Origin."""
        response = self.client.get(
            '/api/health/',
            HTTP_ORIGIN='http://evil.example.com',
        )
        self.assertIsNone(
            response.get('Access-Control-Allow-Origin'),
            msg="CORS header must NOT be set for unknown origin http://evil.example.com",
        )


class SecurityHeadersTest(TestCase):
    """
    REAL-06 — Verify that Django sends the expected HTTP security headers.
    """

    def test_x_content_type_options_header(self):
        """REAL-06: X-Content-Type-Options: nosniff must be present."""
        response = self.client.get('/api/health/')
        self.assertEqual(
            response.get('X-Content-Type-Options'),
            'nosniff',
            msg="Missing X-Content-Type-Options: nosniff — set SECURE_CONTENT_TYPE_NOSNIFF=True",
        )

    def test_x_frame_options_header(self):
        """X-Frame-Options: DENY must be present (clickjacking protection)."""
        response = self.client.get('/api/health/')
        self.assertEqual(
            response.get('X-Frame-Options'),
            'DENY',
            msg="Missing X-Frame-Options: DENY — check XFrameOptionsMiddleware and X_FRAME_OPTIONS setting",
        )
