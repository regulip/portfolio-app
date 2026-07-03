import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    # 1. Beolvassuk a helyi JSON fájlt
    with open('portfolio.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 2. Csatlakozunk a felhős Render adatbázishoz
    conn = psycopg2.connect(DATABASE_URL)
    c = conn.cursor()

    # 3. Létrehozzuk a táblát, ha még nem létezne
    c.execute('''CREATE TABLE IF NOT EXISTS portfolio_data (
                    id SERIAL PRIMARY KEY,
                    content JSON
                )''')

    # 4. Töröljük a régi adatokat (hogy ne duplikálódjon), és feltöltjük az újat
    c.execute("TRUNCATE TABLE portfolio_data")
    c.execute("INSERT INTO portfolio_data (content) VALUES (%s)", (json.dumps(data),))

    conn.commit()
    c.close()
    conn.close()
    print("🚀 Siker! A portfólió adatok hibátlanul átkerültek a felhős adatbázisba!")

except Exception as e:
    print(f"Hiba történt a feltöltés során: {e}")