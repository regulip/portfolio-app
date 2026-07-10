import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    # Csatlakozás az adatbázishoz
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True  # Ez kötelező az adatbázis szintű módosításokhoz
    c = conn.cursor()

    # Kinyerjük az adatbázis pontos nevét a hosszú URL-ből
    db_name = urlparse(DATABASE_URL).path.lstrip('/')

    # Átállítjuk az adatbázis alapértelmezett időzónáját Budapestre
    c.execute(f'ALTER DATABASE "{db_name}" SET timezone TO \'Europe/Budapest\';')

    print("✅ Siker! Az adatbázis időzónája átállítva: Europe/Budapest")

    c.close()
    conn.close()
except Exception as e:
    print(f"Hiba történt: {e}")