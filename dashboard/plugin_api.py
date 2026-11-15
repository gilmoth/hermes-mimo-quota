"""Only reads the dedicated MiMo quota key and Xiaomi's fixed AMS quota endpoint.

No model calls, conversation access, credential discovery, shell or redirects.
The module never returns provider bodies/errors or credential values to clients.
"""
import copy
import http.client
import json
import threading
import time
from datetime import datetime, timezone

from fastapi import APIRouter
from agent.secret_scope import get_secret

router = APIRouter()
_lock = threading.Lock()
_cache = None
_attempt = None
_error = None
HOST = "token-plan-ams.xiaomimimo.com"
PATH = "/v1/platform/token_plan"
CACHE_SECONDS = 60


def normalize(raw):
    if not isinstance(raw, dict) or raw.get("object") != "token_plan":
        raise ValueError("Respuesta inesperada de MiMo.")
    quota = raw.get("quota", {})
    numbers = [quota.get(k) for k in ("total_credits", "used_credits", "remaining_credits")]
    if any(type(x) is not int or x < 0 for x in numbers):
        raise ValueError("La cuota recibida no es válida.")
    total, used, remaining = numbers
    if total <= 0 or used > total or remaining != total - used:
        raise ValueError("La cuota recibida no es coherente.")
    period = raw.get("period", {})
    start = datetime.strptime(period["start_at"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    end = datetime.strptime(period["end_at"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    if end <= start:
        raise ValueError("Periodo de MiMo no válido.")
    plan = raw.get("plan_code")
    if not isinstance(plan, str) or len(plan) > 64:
        raise ValueError("Plan no válido.")
    return {
        "plan": plan, "total": total, "used": used, "remaining": remaining,
        "percent": 100 * used / total,
        "start_at": start.isoformat(), "end_at": end.isoformat(),
        "auto_renew": raw.get("auto_renew") is True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "MiMo TokenPlan · API oficial AMS", "unit": "credits",
    }


def fetch_quota():
    key = get_secret("MIMO_QUOTA_API_KEY")
    if not isinstance(key, str) or not key.strip().startswith("tp-"):
        raise ValueError("Falta la clave dedicada MIMO_QUOTA_API_KEY en el Mac.")
    connection = http.client.HTTPSConnection(HOST, timeout=15)
    try:
        connection.request("GET", PATH, headers={"api-key": key.strip(), "Accept": "application/json"})
        response = connection.getresponse()
        if response.status != 200:
            # Deliberately do not expose the response body or follow redirects.
            raise ValueError(f"MiMo ha respondido HTTP {response.status}. Revisa la clave o vuelve a intentarlo.")
        body = response.read(65537)
        if len(body) > 65536:
            raise ValueError("Respuesta de MiMo demasiado grande.")
        return normalize(json.loads(body))
    finally:
        connection.close()


@router.get("/quota")
def quota():
    # A synchronous FastAPI route runs in a worker thread, never on the chat loop.
    global _cache, _attempt, _error
    with _lock:
        now = time.monotonic()
        if _attempt is None or now - _attempt >= CACHE_SECONDS:
            _attempt = now
            try:
                _cache = fetch_quota()
                _error = None
            except ValueError as error:
                # Only our fixed diagnostics may leave this function.
                text = str(error)
                _error = text if text.startswith(("MiMo ha respondido HTTP ", "Falta la clave dedicada ")) else "MiMo devolvió datos que no se pudieron validar."
            except Exception:
                _error = "No se pudo consultar MiMo. Comprueba la conexión y vuelve a intentarlo."
        return {
            "ok": _cache is not None,
            "stale": _error is not None,
            "error": _error,
            "data": copy.deepcopy(_cache),
            "cache_seconds": CACHE_SECONDS,
        }
