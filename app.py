import os
import datetime
import time
import threading
from functools import wraps
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import jwt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from tuya_connector import TuyaOpenAPI
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from zoneinfo import ZoneInfo


# --- 1. BEÁLLÍTÁSOK ÉS KÖRNYEZETI VÁLTOZÓK ---
load_dotenv()

TUYA_API_KEY = os.getenv("TUYA_API_KEY")
TUYA_API_SECRET = os.getenv("TUYA_API_SECRET")
TUYA_ENDPOINT = "https://openapi.tuyaeu.com"
TUYA_THERMOMETER_ID = os.getenv("TUYA_THERMOMETER_ID")
DATABASE_URL = os.getenv("DATABASE_URL")

openapi = None
if TUYA_API_KEY:
    openapi = TuyaOpenAPI(TUYA_ENDPOINT, TUYA_API_KEY, TUYA_API_SECRET)
    openapi.connect()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'alap-fejlesztoi-kulcs')

# Globális szótár az aktív időzítők nyilvántartására
active_timers = {}

# --- 2. BIZTONSÁG: RATE LIMITER ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)


# --- 3. JWT TOKEN ELLENŐRZŐ DEKORÁTOR ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'A token hiányzik! Pírd be a jelszót.'}), 401
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'A munkamenet (token) lejárt! Kérlek, jelentkezz be újra.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Érvénytelen token!'}), 401
        return f(*args, **kwargs)

    return decorated


# --- 4. POSTGRESQL ADATBÁZIS ÉS HÁTTÉR FOLYAMAT ---
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Hiba az adatbázis csatlakozáskor: {e}")
        return None


def init_db():
    conn = get_db_connection()
    if conn:
        c = conn.cursor()
        # Az eredeti tábla a klímaadatoknak
        c.execute('''CREATE TABLE IF NOT EXISTS readings (
                        id SERIAL PRIMARY KEY,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        temperature REAL,
                        humidity REAL
                    )''')
        # ÚJ TÁBLA a portfólió adatoknak (JSON formátumban)
        c.execute('''CREATE TABLE IF NOT EXISTS portfolio_data (
                        id SERIAL PRIMARY KEY,
                        content JSON
                    )''')
        conn.commit()
        c.close()
        conn.close()


def background_logger():
    while True:
        if openapi and TUYA_THERMOMETER_ID and DATABASE_URL:
            try:
                resp = openapi.get(f"/v1.0/iot-03/devices/{TUYA_THERMOMETER_ID}/status")
                if resp.get('success'):
                    temp, hum = None, None
                    for item in resp.get('result', []):
                        if item['code'] == 'va_temperature':
                            temp = item['value'] / 10.0
                        elif item['code'] == 'va_humidity':
                            hum = item['value']

                    if temp is not None and hum is not None:
                        conn = get_db_connection()
                        if conn:
                            c = conn.cursor()

                            # 1. Az új mérés beillesztése
                            c.execute("INSERT INTO readings (temperature, humidity) VALUES (%s, %s)", (temp, hum))

                            # 2. Adatbázis takarítás: Csak a legutolsó 30 mérés megtartása
                            # Ez a parancs töröl minden sort, aminek az azonosítója NINCS benne a legújabb 30-ban
                            c.execute(
                                "DELETE FROM readings WHERE id NOT IN (SELECT id FROM readings ORDER BY id DESC LIMIT 30)")

                            conn.commit()
                            c.close()
                            conn.close()
                            print(f"[Log - Postgres] Adat mentve, régi adatok takarítva: {temp}°C, {hum}%")
            except Exception as e:
                print(f"[Hiba] A hőmérséklet lekérése/mentése sikertelen: {e}")

        # 15 percenként mér (900 mp)
        time.sleep(900)

init_db()
threading.Thread(target=background_logger, daemon=True).start()


# --- 5. VÉGPONTOK (API ROUTES) ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    correct_password = os.getenv('PORTFOLIO_PASSWORD')

    if not data or not data.get('password'):
        return jsonify({'message': 'Jelszó megadása kötelező!'}), 400

    if data.get('password') == correct_password:
        expiration_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=20)
        token = jwt.encode(
            {'user': 'guest_hr', 'exp': expiration_time},
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        return jsonify({'status': 'success', 'token': token})

    return jsonify({'message': 'Helytelen jelszó!'}), 401


@app.route('/api/portfolio-data', methods=['GET'])
@token_required

def get_portfolio_data():
    # Megnézzük a .env fájlban, mit állítottunk be
    use_local = os.getenv('USE_LOCAL_JSON', 'True') == 'True'

    if use_local:
        # LOKÁLIS MÓD: JSON fájlból dolgozunk
        try:
            with open('portfolio.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data), 200
        except Exception as e:
            return jsonify({"message": f"Hiba a JSON fájl betöltésekor: {e}"}), 500
    else:
        # ÉLES MÓD: Adatbázisból dolgozunk
        try:
            conn = get_db_connection()
            if not conn:
                return jsonify({"message": "Nincs DB kapcsolat"}), 500

            c = conn.cursor(cursor_factory=RealDictCursor)
            c.execute("SELECT content FROM portfolio_data ORDER BY id DESC LIMIT 1")
            row = c.fetchone()
            c.close()
            conn.close()

            if row and row['content']:
                # Ha az adatbázisban a content egy string, akkor json.loads(row['content']) kellhet!
                return jsonify(row['content']), 200
            else:
                return jsonify({"message": "Nincs adat az adatbázisban!"}), 404
        except Exception as e:
            return jsonify({"message": f"Hiba az adatbázis lekérdezésekor: {e}"}), 500

@app.route('/api/temperature', methods=['GET'])
@token_required
def get_temperature_data():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "error", "message": "Nincs DB kapcsolat"}), 500

        c = conn.cursor(cursor_factory=RealDictCursor)
        c.execute("SELECT timestamp, temperature, humidity FROM readings ORDER BY id DESC LIMIT 20")
        rows = c.fetchall()
        c.close()
        conn.close()

        rows.reverse()

        data = {
            "labels": [
                row['timestamp'].replace(tzinfo=datetime.timezone.utc).astimezone(ZoneInfo("Europe/Budapest")).strftime(
                    '%H:%M') for row in rows],
            "temperatures": [row['temperature'] for row in rows],
            "humidities": [row['humidity'] for row in rows]
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


def revert_iot_state(device_name, revert_action):
    global active_timers
    if not openapi:
        return

    device_map = {
        'bulb1': os.getenv("TUYA_BULB_1_ID"),
        'bulb2': os.getenv("TUYA_BULB_2_ID"),
        'switch': os.getenv("TUYA_SWITCH_ID")
    }

    device_id = device_map.get(device_name)
    if not device_id:
        return

    is_on = True if revert_action == 'on' else False
    command_code = 'switch_led' if 'bulb' in device_name else 'switch_1'
    commands = {'commands': [{'code': command_code, 'value': is_on}]}

    try:
        openapi.post(f'/v1.0/iot-03/devices/{device_id}/commands', commands)
        print(f"[Auto-Revert] {device_name} sikeresen visszaállítva erre: {revert_action}")
        # Töröljük a lefutott stoppert a szótárból
        if device_name in active_timers:
            del active_timers[device_name]
    except Exception as e:
        print(f"[Hiba az Auto-Revert során]: {e}")


@app.route('/api/iot/status', methods=['GET'])
@token_required
def get_iot_status():
    status_data = {"bulb1": False, "bulb2": False, "switch": False}
    device_map = {
        'bulb1': os.getenv("TUYA_BULB_1_ID"),
        'bulb2': os.getenv("TUYA_BULB_2_ID"),
        'switch': os.getenv("TUYA_SWITCH_ID")
    }

    if not openapi:
        return jsonify(status_data)

    for name, dev_id in device_map.items():
        if dev_id:
            try:
                resp = openapi.get(f"/v1.0/iot-03/devices/{dev_id}/status")
                if resp.get('success'):
                    for item in resp.get('result', []):
                        if item['code'] in ['switch_led', 'switch_1']:
                            status_data[name] = item['value']
            except Exception as e:
                print(f"Hiba {name} lekérésekor: {e}")

    return jsonify(status_data)


@app.route('/api/iot/<device_name>/<action>', methods=['POST'])
@token_required
@limiter.limit("3 per minute", exempt_when=lambda: request.view_args.get('action') == 'off')
def control_iot(device_name, action):
    global active_timers

    if action not in ['on', 'off']:
        return jsonify({"status": "error", "message": "Érvénytelen parancs"}), 400

    device_map = {
        'bulb1': os.getenv("TUYA_BULB_1_ID"),
        'bulb2': os.getenv("TUYA_BULB_2_ID"),
        'switch': os.getenv("TUYA_SWITCH_ID")
    }

    device_id = device_map.get(device_name)
    if not device_id or not openapi:
        return jsonify({"status": "error", "message": "Eszköz nem található a .env-ben!"}), 404

    is_on = True if action == 'on' else False
    command_code = 'switch_led' if 'bulb' in device_name else 'switch_1'
    commands = {'commands': [{'code': command_code, 'value': is_on}]}

    try:
        # 1. Eredeti parancs végrehajtása
        openapi.post(f'/v1.0/iot-03/devices/{device_id}/commands', commands)

        # 2. Ha volt már folyamatban lévő időzítő ehhez a lámpához, azonnal leállítjuk!
        if device_name in active_timers:
            active_timers[device_name].cancel()

        # 3. CSAK akkor indítunk 5 perces KIKAPCSOLÓ biztonsági stoppert, ha FELKAPCSOLTÁK a lámpát
        if action == 'on':
            timer = threading.Timer(120.0, revert_iot_state, args=[device_name, 'off'])
            timer.daemon = True
            timer.start()
            active_timers[device_name] = timer

        return jsonify({"status": "success", "device": device_name, "action": action})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)