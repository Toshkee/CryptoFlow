"""
Django settings for core project.
"""

from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os
import warnings

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

load_dotenv()

# -------------------------------------------------------------------
# PATHS
# -------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------------------------------------------------------
# DEBUG / SECRET KEY
# -------------------------------------------------------------------
# Secure by default: production unless DEBUG is explicitly turned on.
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# SECRET_KEY must come from the environment. We deliberately do NOT ship a
# hardcoded production fallback (that key would be public in git history).
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        # Local dev convenience only — clearly labeled, never used in prod.
        SECRET_KEY = "django-insecure-dev-only-key-do-not-use-in-production"
        warnings.warn(
            "SECRET_KEY not set; using an insecure development key. "
            "Set SECRET_KEY in the environment for any real deployment.",
            RuntimeWarning,
        )
    else:
        raise ImproperlyConfigured(
            "SECRET_KEY environment variable is required when DEBUG=False."
        )

# -------------------------------------------------------------------
# HOSTS / CORS / CSRF
# -------------------------------------------------------------------
HEROKU_APP_NAME = os.getenv("HEROKU_APP_NAME")  # e.g. "crypto-flow-8b8fe5dcb0bc"
DEPLOYED_FRONTEND_URL = os.getenv("DEPLOYED_FRONTEND_URL")
DEPLOYED_BACKEND_URL = os.getenv("DEPLOYED_BACKEND_URL")

# Allowed hosts
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "crypto-flow-8b8fe5dcb0bc.herokuapp.com",  # your Heroku app
]

if HEROKU_APP_NAME:
    host = f"{HEROKU_APP_NAME}.herokuapp.com"
    if host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

# Extend ALLOWED_HOSTS from a comma-separated env var (e.g. a custom domain)
# without editing code on every new deploy target.
for host in os.getenv("ALLOWED_HOSTS", "").split(","):
    host = host.strip()
    if host and host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",                    # local frontend
    "https://cryptofloww.netlify.app",          # deployed frontend
]

if DEPLOYED_FRONTEND_URL and DEPLOYED_FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(DEPLOYED_FRONTEND_URL)

# Extend CORS_ALLOWED_ORIGINS from a comma-separated env var.
for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(","):
    origin = origin.strip()
    if origin and origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(origin)

# CSRF trusted origins (must include scheme)
CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://crypto-flow-8b8fe5dcb0bc.herokuapp.com",
]

if DEPLOYED_BACKEND_URL and DEPLOYED_BACKEND_URL not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(DEPLOYED_BACKEND_URL)

CORS_ALLOW_CREDENTIALS = True

# -------------------------------------------------------------------
# APPS
# -------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",

    "accounts",
    "markets",
    "wallet",
    "trading",
    "users.apps.UsersConfig",
    "futures",
]

# -------------------------------------------------------------------
# MIDDLEWARE
# -------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # static files in prod
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# -------------------------------------------------------------------
# DATABASE
# -------------------------------------------------------------------
# Production (Heroku/etc.) sets DATABASE_URL -> parsed by dj-database-url with
# persistent connections and SSL required (when not DEBUG). Local dev with no
# DATABASE_URL falls back to SQLite so the app stays runnable with zero setup.
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# -------------------------------------------------------------------
# CACHE
# -------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# -------------------------------------------------------------------
# PASSWORD VALIDATION
# -------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# -------------------------------------------------------------------
# I18N
# -------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# -------------------------------------------------------------------
# STATIC FILES
# -------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

if not DEBUG:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -------------------------------------------------------------------
# REST FRAMEWORK / JWT
# -------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Baseline abuse protection on every endpoint; tighter scoped rates are
    # applied per-view (login/signup/market) in the views themselves.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "240/min",
        "login": "10/min",
        "signup": "5/min",
        "market": "120/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# OpenAPI schema / Swagger docs (served at /api/schema/ and /api/docs/).
SPECTACULAR_SETTINGS = {
    "TITLE": "CryptoFlow API",
    "VERSION": "1.0.0",
}

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "BLACKLIST_AFTER_ROTATION": True,
}

# -------------------------------------------------------------------
# PRODUCTION SECURITY (only when DEBUG is off)
# -------------------------------------------------------------------
# Guarded so local dev keeps working over plain http; in production these
# force HTTPS, enable HSTS, and lock cookies to secure connections.
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000          # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Trust the platform proxy's X-Forwarded-Proto so SSL redirect/HSTS work
    # behind Heroku's load balancer.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_CONTENT_TYPE_NOSNIFF = True