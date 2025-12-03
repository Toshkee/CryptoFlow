import requests
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

API_KEY = "CG-bp8DjBHE4gh2M37pUe9PM99w"

HEADERS = {
    "x-cg-api-key": API_KEY   # <-- CORRECT HEADER NAME
}

# ----------------------------
# GET TOP 100 COINS
# ----------------------------
@api_view(["GET"])
def top_100(request):
    cache_key = "top100"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    url = f"{COINGECKO_BASE}/coins/markets"
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 100,
        "page": 1,
        "sparkline": "true",
        "price_change_percentage": "24h"
    }

    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()

        cache.set(cache_key, data, 60)
        return Response(data)

    except Exception as e:
        print("COINGECKO ERROR (top100):", e)
        return Response(
            {"error": "CoinGecko unavailable"},
            status=503
        )

# ----------------------------
# GET COIN DETAIL + PRICE HISTORY
# ----------------------------
@api_view(["GET"])
def market_detail(request, coin_id):
    cache_key = f"coin_detail_{coin_id}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    try:
        info_url = f"{COINGECKO_BASE}/coins/{coin_id}?localization=false&sparkline=false"
        info_res = requests.get(info_url, headers=HEADERS, timeout=10)
        info_res.raise_for_status()

        chart_url = (
            f"{COINGECKO_BASE}/coins/{coin_id}/market_chart"
            "?vs_currency=usd&days=7"
        )
        chart_res = requests.get(chart_url, headers=HEADERS, timeout=10)
        chart_res.raise_for_status()

    except Exception as e:
        print("COINGECKO ERROR (detail):", e)
        return Response({"error": "Coin data unavailable"}, status=503)

    data = {
        "info": info_res.json(),
        "chart": chart_res.json(),
    }

    cache.set(cache_key, data, 30)
    return Response(data)