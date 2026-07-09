"""
Hűtőmágnes -- OurGroceries proxy

Kicsi FastAPI szolgáltatás, ami a mar bevalt `ourgroceries` Python csomagot
hasznalja arra, hogy a Hűtőmágnes appbol osszesitett bevasarlolista-tetelek
bekeruljenek egy dedikalt OurGroceries listaba. A hitelesito adatok (OG_USERNAME,
OG_PASSWORD) es a megosztott API-kulcs (API_TOKEN) kizarolag kornyezeti
valtozokent elnek a Render szolgaltatason -- soha nem kerulnek az APK-ba.
"""

import os

import aiohttp
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from ourgroceries import OurGroceries
from ourgroceries.exceptions import InvalidLoginException

OG_USERNAME = os.environ.get("OG_USERNAME")
OG_PASSWORD = os.environ.get("OG_PASSWORD")
API_TOKEN = os.environ.get("API_TOKEN")
OG_LIST_NAME = os.environ.get("OG_LIST_NAME", "Havi menü")

app = FastAPI()

_og_client = None
_list_id_cache = None


class SyncRequest(BaseModel):
    items: list[str]


async def get_client():
    global _og_client
    if _og_client is None:
        if not OG_USERNAME or not OG_PASSWORD:
            raise HTTPException(500, "A szerver nincs konfigurálva: hiányzik az OG_USERNAME/OG_PASSWORD.")
        candidate = OurGroceries(OG_USERNAME, OG_PASSWORD)
        try:
            await candidate.login()
        except InvalidLoginException:
            raise HTTPException(502, "Nem sikerült bejelentkezni az OurGroceries fiókba -- ellenőrizd az OG_USERNAME/OG_PASSWORD értékeket.")
        _og_client = candidate
    return _og_client


async def get_target_list_id():
    global _list_id_cache
    if _list_id_cache:
        return _list_id_cache

    og = await get_client()
    lists = await og.get_my_lists()
    for lst in lists.get("shoppingLists", []):
        if lst.get("name") == OG_LIST_NAME:
            _list_id_cache = lst["id"]
            return _list_id_cache

    await og.create_list(OG_LIST_NAME)
    lists = await og.get_my_lists()
    for lst in lists.get("shoppingLists", []):
        if lst.get("name") == OG_LIST_NAME:
            _list_id_cache = lst["id"]
            return _list_id_cache

    raise HTTPException(500, f"Nem sikerült létrehozni vagy megtalálni a(z) „{OG_LIST_NAME}” listát.")


def check_auth(x_api_key: str | None):
    if not API_TOKEN:
        raise HTTPException(500, "A szerver nincs konfigurálva: hiányzik az API_TOKEN.")
    if x_api_key != API_TOKEN:
        raise HTTPException(401, "Érvénytelen API-kulcs.")


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/debug")
async def debug(x_api_key: str | None = Header(default=None)):
    check_auth(x_api_key)
    og = await get_client()

    info = {
        "has_session_key": bool(getattr(og, "_session_key", None)),
        "team_id": getattr(og, "_team_id", None),
    }

    cookies = {"ourgroceries-auth": og._session_key}
    payload = {"command": "getOverview", "teamId": og._team_id}
    async with aiohttp.ClientSession(cookies=cookies) as session:
        async with session.post("https://www.ourgroceries.com/your-lists/", json=payload) as resp:
            info["raw_status"] = resp.status
            info["raw_content_type"] = resp.content_type
            text = await resp.text()
            info["raw_body_preview"] = text[:500]

    return info


@app.post("/sync")
async def sync(req: SyncRequest, x_api_key: str | None = Header(default=None)):
    check_auth(x_api_key)

    if not req.items:
        return {"success": True, "added": 0}

    global _og_client
    og = await get_client()

    try:
        list_id = await get_target_list_id()
        added = 0
        for item in req.items:
            await og.add_item_to_list(list_id, item)
            added += 1
        return {"success": True, "added": added}
    except HTTPException:
        raise
    except Exception as exc:
        # A munkamenet lejárhatott, vagy az OurGroceries oldalán változott valami --
        # legközelebbi hívásra újra bejelentkezünk.
        _og_client = None
        raise HTTPException(502, f"Hiba az OurGroceries-szel való kommunikáció közben: {exc}")
