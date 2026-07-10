# 🚀 Smart Home Portfolio & Secure CV API

Egy saját fejlesztésű, elosztott architektúrájú full-stack webes alkalmazás. A projekt egy interaktív okosotthon (Tuya IoT) vezérlőpanelt, valamint egy JWT alapú, titkosított önéletrajz-megjelenítőt tartalmaz. A rendszer Oracle Cloud (Linux VPS) infrastruktúrán fut, Nginx proxy-val és Gunicorn háttérszolgáltatással.

## 🛠️ Technológiai Stack

* **Backend:** Python 3, Flask, Gunicorn
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3, Chart.js
* **Adatbázis:** PostgreSQL (Render Cloud)
* **IoT Integráció:** Tuya OpenAPI
* **Infrastruktúra:** Oracle Cloud (Ubuntu Linux), Nginx, Systemd
* **Biztonság:** JSON Web Token (JWT), Flask-Limiter (Rate Limiting), Let's Encrypt (SSL/TLS)

## ✨ Fő Funkciók

1.  **Védett Önéletrajz (CV) API:** A személyes adatok és szakmai tapasztalatok PostgreSQL adatbázisban (JSON formátumban) vannak tárolva. A lekérdezésük kizárólag sikeres bejelentkezés (JWT token) után lehetséges.
2.  **Élő Okosotthon Vezérlés:** A felületen keresztül valós időben vezérelhetők a fizikai (Tuya alapú) okoseszközök (lámpák, kapcsolók).
3.  **Kliens- és Szerveroldali Védelem:** Beépített Rate Limiting a brute-force támadások és a hálózati "spammelés" (Race Condition) elkerülésére (kliens oldali gomb-fagyasztás és backend oldali limitálás).
4.  **Auto-Revert Biztonsági Mechanizmus:** A felkapcsolt IoT eszközöket a szerver egy háttérszálon futó időzítővel (Threading Timer) 2 perc után automatikusan lekapcsolja.
5.  **Folyamatos Adatgyűjtés:** Egy háttérben futó daemon 15 percenként logolja az élő hőmérséklet- és páratartalom-adatokat az adatbázisba, amit a frontend egy Chart.js grafikonon vizualizál a pontos magyar időzónára (CEST/CET) konvertálva.

## ⚙️ Helyi Fejlesztési Környezet Telepítése (Local Setup)

Ha lokálisan szeretnéd futtatni a projektet, kövesd az alábbi lépéseket:

1. **A repó klónozása:**
   ```bash
   git clone [https://github.com/regulip/portfolio-app.git](https://github.com/FELHASZNÁLÓNÉV/portfolio-app.git)
   cd portfolio-app
   
2. Virtuális környezet és függőségek (Linux/Mac):

Bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
(Windows esetén a py -m venv venv és a .\venv\Scripts\activate parancsok használatosak).

3. Környezeti változók (.env):
A futtatáshoz a gyökérkönyvtárban létre kell hozni egy .env fájlt az alábbi struktúrával:

Kódrészlet
FLASK_SECRET_KEY=sajat_titkos_kulcs
PORTFOLIO_PASSWORD=bejelentkezo_jelszo
DATABASE_URL=postgresql://user:password@host/db
TUYA_API_KEY=tuya_kulcs
TUYA_API_SECRET=tuya_secret
TUYA_THERMOMETER_ID=szenzor_id
TUYA_BULB_1_ID=lampa1_id
TUYA_BULB_2_ID=lampa2_id
TUYA_SWITCH_ID=kapcsolo_id

4. Indítás:
Az adatok betöltése után a fejlesztői szerver a python app.py paranccsal indítható el a http://127.0.0.1:5000 címen.


