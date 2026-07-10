"""
Hűtőmágnes -- OurGroceries proxy

Kicsi FastAPI szolgáltatás. A bejelentkezéshez (munkamenet-cookie + csapat-azonosító
megszerzéséhez) a bevált `ourgroceries` Python csomagot használja, a tényleges
lista-lekérdezést/-írást viszont közvetlen HTTP-hívással végzi -- ez utóbbi a
könyvtár saját get_my_lists()/add_item_to_list() metódusainál megbízhatóbbnak
bizonyult ezen a hosztingon (lásd git history a /debug diagnosztikáért).

A hitelesito adatok (OG_USERNAME, OG_PASSWORD) es a megosztott API-kulcs (API_TOKEN)
kizarolag kornyezeti valtozokent elnek a Render szolgaltatason -- soha nem
kerulnek az APK-ba.
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
OG_LIST_NAME = os.environ.get("OG_LIST_NAME") or "Havi menü"

YOUR_LISTS_URL = "https://www.ourgroceries.com/your-lists/"

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


async def og_post(command, other_payload=None):
    """Nyers hívás a /your-lists/ végpontra, a könyvtár session_key/team_id-jével."""
    og = await get_client()
    cookies = {"ourgroceries-auth": og._session_key}
    payload = {"command": command}
    if og._team_id:
        payload["teamId"] = og._team_id
    if other_payload:
        payload.update(other_payload)

    async with aiohttp.ClientSession(cookies=cookies) as session:
        async with session.post(YOUR_LISTS_URL, json=payload) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise RuntimeError(
                    f"OurGroceries HTTP {resp.status} for payload={payload!r}: "
                    f"body={text[:300]!r} headers={dict(resp.headers)!r}"
                )
            return await resp.json(content_type=None)


async def get_target_list_id():
    global _list_id_cache
    if _list_id_cache:
        return _list_id_cache

    lists = await og_post("getOverview")
    for lst in lists.get("shoppingLists", []):
        if lst.get("name") == OG_LIST_NAME:
            _list_id_cache = lst["id"]
            return _list_id_cache

    await og_post("createList", {"name": OG_LIST_NAME, "listType": "SHOPPING"})
    lists = await og_post("getOverview")
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


@app.post("/sync")
async def sync(req: SyncRequest, x_api_key: str | None = Header(default=None)):
    check_auth(x_api_key)

    if not req.items:
        return {"success": True, "added": 0}

    global _og_client
    try:
        list_id = await get_target_list_id()
        added = 0
        for item in req.items:
            await og_post("insertItem", {"listId": list_id, "value": item})
            added += 1
        return {"success": True, "added": added}
    except HTTPException:
        raise
    except Exception as exc:
        # A munkamenet lejárhatott, vagy az OurGroceries oldalán változott valami --
        # legközelebbi hívásra újra bejelentkezünk.
        _og_client = None
        raise HTTPException(502, f"Hiba az OurGroceries-szel való kommunikáció közben: {exc}")
