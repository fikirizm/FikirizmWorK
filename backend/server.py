from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging

from routes import router
from seed import seed
from deps import client
from storage import init_storage

app = FastAPI(title="Fikirizm Cloud API")

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fikirizm")


@app.on_event("startup")
async def startup():
    try:
        await seed()
        logger.info("Seed tamamlandı")
    except Exception as e:
        logger.error(f"Seed hatası: {e}")
    try:
        init_storage()
        logger.info("Obje depolama hazır")
    except Exception as e:
        logger.error(f"Depolama başlatma hatası: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
