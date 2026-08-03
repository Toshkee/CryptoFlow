"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import logging

from django.contrib import admin
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.urls import path, include

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

logger = logging.getLogger(__name__)


def health(request):
    """Unauthenticated liveness probe for load balancers / uptime checks.

    Plain Django view (not DRF) so it bypasses auth and throttling entirely.
    Deliberately does NOT touch the database: this is Render's healthCheckPath,
    so a dead database must not make deploys fail or the instance get recycled.
    Use /api/health/db/ to check whether the app can actually serve requests.
    """
    return JsonResponse({"status": "ok"})


def health_db(request):
    """Readiness probe: is the database actually reachable?

    Every real endpoint queries the database, so when this fails the demo is
    down even though /api/health/ still says "ok" (that is exactly how a
    30-day-expired Render free Postgres went unnoticed). 503 so uptime checks
    and the keep-warm workflow go red instead of silently reporting green.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        # Logged (not returned) so we never leak connection details publicly.
        logger.exception("Database health check failed")
        return JsonResponse(
            {"status": "error", "database": "unavailable"}, status=503
        )
    return JsonResponse({"status": "ok", "database": "ok"})


API_ROOT_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CryptoFlow API</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #0a0b0d; color: #e6e8eb;
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { padding: 48px 24px; max-width: 34rem; }
  h1 { font: 400 2.5rem/1.1 Georgia, "Times New Roman", serif; letter-spacing: -0.01em; margin: 0; }
  h1 em { font-style: normal; color: #7c5cff; }
  p { color: #8b919a; margin: 12px 0 28px; }
  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid #24272e; }
  li { border-bottom: 1px solid #24272e; }
  a { display: flex; justify-content: space-between; gap: 24px; padding: 14px 4px;
      color: #e6e8eb; text-decoration: none; }
  a:hover { color: #fff; background: #111317; }
  a code { font: 0.875rem ui-monospace, "SF Mono", monospace; color: #8b919a; }
  footer { margin-top: 28px; font-size: 0.8rem; color: #5b616b; }
</style>
</head>
<body>
<main>
  <h1>CryptoFlow <em>API</em></h1>
  <p>The backend for the CryptoFlow paper-trading terminal. The app itself lives on the frontend &mdash; this host only serves the API.</p>
  <ul>
    <li><a href="/api/docs/">Interactive docs <code>/api/docs/</code></a></li>
    <li><a href="/api/schema/">OpenAPI schema <code>/api/schema/</code></a></li>
    <li><a href="/api/health/">Health check <code>/api/health/</code></a></li>
    <li><a href="/api/health/db/">Database check <code>/api/health/db/</code></a></li>
    <li><a href="/admin/">Admin <code>/admin/</code></a></li>
  </ul>
  <footer>Paper money only. Nothing here is financial advice.</footer>
</main>
</body>
</html>"""


def api_root(request):
    """Friendly landing page for the bare API host (instead of a 404)."""
    return HttpResponse(API_ROOT_HTML)


urlpatterns = [
    path("", api_root),
    path("admin/", admin.site.urls),

    path("api/health/", health),
    path("api/health/db/", health_db),

    # OpenAPI schema + interactive Swagger docs.
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),

    path("api/accounts/", include("accounts.urls")),
    path("api/markets/", include("markets.urls")),
    path("api/futures/", include("futures.urls")),
]