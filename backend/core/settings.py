"""
Django settings for core project.
"""

from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

# -------------------------------------------------------------------
# PATHS
# -------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------------------------------------------------------
# DEBUG / SECRET KEY
# -------------------------------------------------------------------
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-5)5a+=x9&fu)cglcl07nkvjbox=s(vbx#^d!a)ca-@5&2%^#*s",
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

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",                    # local frontend
    "https://cryptofloww.netlify.app",          # deployed frontend
]

if DEPLOYED_FRONTEND_URL and DEPLOYED_FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(DEPLOYED_FRONTEND_URL)

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
}

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "BLACKLIST_AFTER_ROTATION": True,
}