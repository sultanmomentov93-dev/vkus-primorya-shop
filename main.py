import os
import json
import hmac
import hashlib
import logging
import sqlite3
from urllib.parse import parse_qsl
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("vkus-primorya")

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "").strip()
DB_PATH = os.getenv("DB_PATH", "shop.db")
ALLOW_BROWSER_DEMO = os.getenv("ALLOW_BROWSER_DEMO", "false").lower() == "true"

PRODUCTS = {
    "asia": ("Азия", "Клубника", 50),
    "aprica": ("Априка", "Клубника", 50),
    "clery": ("Клери", "Клубника", 50),
    "fleur": ("Флёр", "Клубника", 50),
    "murano": ("Мурано", "Клубника", 100),
    "g7": ("G-7", "Клубника", 80),
    "majestic": ("Маджестик", "Малина", 350),
    "margarita": ("Маргарита", "Малина", 350),
    "mapema": ("Мапема", "Малина", 350),
    "violet": ("Вайолет", "Малина", 350),
    "duke": ("Дюк", "Голубика", 500),
    "bluecrop": ("Блюкроп", "Голубика", 500),
    "bonus": ("Бонус", "Голубика", 500),
    "legacy": ("Легаси", "Голубика", 500),
}

app = FastAPI(title="Вкус Приморья Mini App")
app.mount("/static", StaticFiles(directory="static"), name="static")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            telegram_user_id TEXT,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            delivery_method TEXT NOT NULL,
            address TEXT NOT NULL,
            items_json TEXT NOT NULL,
            total INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Новый'
        )
    """)
    conn.commit()
    return conn


def validate_telegram_init_data(init_data: str):
    if not BOT_TOKEN:
        raise HTTPException(503, "На сервере не настроен BOT_TOKEN")
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = pairs.pop("hash")
        auth_date = int(pairs.get("auth_date", "0"))
    except Exception:
        raise HTTPException(401, "Не удалось проверить данные Telegram")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(
        b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256
    ).digest()
    calculated = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise HTTPException(401, "Проверка Telegram не пройдена")
    now = int(datetime.now(timezone.utc).timestamp())
    if auth_date > now + 60 or now - auth_date > 86400:
        raise HTTPException(401, "Данные Telegram устарели")
    user = json.loads(pairs.get("user", "{}"))
    return user


class OrderItem(BaseModel):
    id: str
    quantity: int = Field(ge=1, le=999)


class OrderRequest(BaseModel):
    init_data: str = ""
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=40)
    delivery_method: str
    address: str = Field(min_length=3, max_length=500)
    items: list[OrderItem]


@app.on_event("startup")
def startup():
    db().close()


@app.get("/")
def index():
    return FileResponse("static/index.html")


@app.get("/api/products")
def products():
    return [
        {"id": pid, "name": name, "category": category, "price": price}
        for pid, (name, category, price) in PRODUCTS.items()
    ]


@app.post("/api/orders")
async def create_order(payload: OrderRequest):
    if payload.delivery_method not in ("Почта России", "СДЭК"):
        raise HTTPException(400, "Выберите Почту России или СДЭК")
    if not payload.items:
        raise HTTPException(400, "Корзина пуста")

    if payload.init_data:
        user = validate_telegram_init_data(payload.init_data)
        telegram_user_id = str(user.get("id", ""))
    elif ALLOW_BROWSER_DEMO:
        telegram_user_id = "browser-demo"
    else:
        raise HTTPException(401, "Откройте магазин через Telegram")

    clean_items = []
    total = 0
    for item in payload.items:
        if item.id not in PRODUCTS:
            raise HTTPException(400, "В корзине есть неизвестный товар")
        name, category, price = PRODUCTS[item.id]
        line_total = price * item.quantity
        total += line_total
        clean_items.append({
            "id": item.id, "name": name, "category": category,
            "quantity": item.quantity, "price": price, "line_total": line_total,
        })

    conn = db()
    cur = conn.execute(
        """INSERT INTO orders
        (created_at,telegram_user_id,customer_name,phone,delivery_method,
         address,items_json,total,status)
        VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            datetime.now().astimezone().isoformat(timespec="seconds"),
            telegram_user_id, payload.customer_name.strip(), payload.phone.strip(),
            payload.delivery_method, payload.address.strip(),
            json.dumps(clean_items, ensure_ascii=False), total, "Новый",
        ),
    )
    order_id = cur.lastrowid
    conn.commit()
    conn.close()

    message_lines = [
        f"📦 <b>НОВЫЙ ЗАКАЗ №{order_id}</b>",
        "",
        f"👤 Имя: {payload.customer_name}",
        f"📱 Телефон: {payload.phone}",
        f"🚚 Доставка: {payload.delivery_method}",
        f"📍 Адрес / пункт выдачи: {payload.address}",
        "",
        "🌱 <b>Товары:</b>",
    ]
    for item in clean_items:
        message_lines.append(
            f"• {item['name']} — {item['quantity']} × {item['price']} ₽ = "
            f"{item['line_total']} ₽"
        )
    message_lines += ["", f"💰 <b>Итого: {total} ₽</b>", f"Статус: Новый"]
    sent_to_group = False

    if BOT_TOKEN and ADMIN_CHAT_ID:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": ADMIN_CHAT_ID,
                        "text": "\n".join(message_lines),
                        "parse_mode": "HTML",
                    },
                )
                response.raise_for_status()
                result = response.json()
                sent_to_group = bool(result.get("ok"))
                if not sent_to_group:
                    log.error("Telegram API returned error: %s", result)
        except Exception:
            log.exception("Order saved, but Telegram notification failed")

    return {
        "ok": True,
        "order_id": order_id,
        "total": total,
        "notification_sent": sent_to_group,
    }


@app.get("/health")
def health():
    return {"ok": True}
