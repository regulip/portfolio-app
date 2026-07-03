import os
import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import jwt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
from tuya_connector import TuyaOpenAPI

# --- 1. BEÁLLÍTÁSOK ÉS KÖRNYEZETI VÁLTOZÓK ---
load_dotenv()

GOVEE_API_KEY = os.getenv("GOVEE_API_KEY")
GOVEE_DEVICE_MAC = os.getenv("GOVEE_DEVICE_MAC")
GOVEE_DEVICE_MODEL = os.getenv("GOVEE_DEVICE_MODEL")

TUYA_API_KEY = os.getenv("TUYA_API_KEY")
TUYA_API_SECRET = os.getenv("TUYA_API_SECRET")
TUYA_ENDPOINT = "https://openapi.tuyaeu.com"

openapi = None
if TUYA_API_KEY:
    openapi = TuyaOpenAPI(TUYA_ENDPOINT, TUYA_API_KEY, TUYA_API_SECRET)
    openapi.connect()

app = Flask(__name__)
# Titkos kulcs a JWT tokenek aláírásához (ezt is a .env-ből húzzuk be)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'alap-fejlesztoi-kulcs')

# --- 2. BIZTONSÁG: RATE LIMITER (Spam és Brute-Force védelem) ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"  # Fejlesztés alatt memóriában tároljuk a kérések számát
)


# --- 3. BIZTONSÁG: JWT TOKEN ELLENŐRZŐ DEKORÁTOR ---
# Ezt a "címkét" (@token_required) tesszük majd rá azokra a végpontokra,
# amiket csak sikeres bejelentkezés után szabad elérni (pl. okosotthon vezérlés, portfólió adatok)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'message': 'A token hiányzik! Pírd be a jelszót.'}), 401

        try:
            # A "Bearer " szó levágása, ha a frontend úgy küldi
            if token.startswith('Bearer '):
                token = token.split(' ')[1]

            # Token dekódolása és ellenőrzése
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'A munkamenet (token) lejárt! Kérlek, jelentkezz be újra.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Érvénytelen token!'}), 401

        return f(*args, **kwargs)

    return decorated


# --- 4. VÉGPONTOK (API ROUTES) ---

@app.route('/')
def index():
    """ A főoldal kiszolgálása. Ez csak a bejelentkező formot (SPA vázat) tölti be. """
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")  # Maximum 5 próbálkozás percenként egy IP címről!
def login():
    """ Hitelesítési végpont: Itt kapja meg a JS a 20 perces tokent, ha jó a jelszó. """
    data = request.get_json()

    # A helyes jelszót a szerver a .env fájlból olvassa ki (pl. PORTFOLIO_PASSWORD=HireMe2026)
    correct_password = os.getenv('PORTFOLIO_PASSWORD')

    if not data or not data.get('password'):
        return jsonify({'message': 'Jelszó megadása kötelező!'}), 400

    if data.get('password') == correct_password:
        # Sikeres belépés: Token generálása pontosan 20 perces lejárattal
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
    """
    Védett végpont! A böngésző csak érvényes tokennel kapja meg az adataidat.
    """
    portfolio_content = {
        "introduction": "A Gábor Dénes Egyetem mérnökinformatikus hallgatójaként jelenleg az 5. félévemet kezdem. Célom, hogy a tanulmányaim és a saját fejlesztésű projektjeim (Python, IoT) mellett vállalati környezetben is gyakorlati tapasztalatot szerezzek. Korábbi diszpécseri és távközlési munkáim során erős problémamegoldó rutint építettem fel, amelyet most egy IT fókuszú csapatban szeretnék kamatoztatni.",
        "skills": [
            "Szoftverfejlesztés: Python, C#, C++",
            "Webes technológiák & API: Flask, REST API, JavaScript (Fetch API), HTML/CSS",
            "Architektúra: Git, GitHub, aszinkron és többszálú programozás (Threading)",
            "Hálózat & Adatbázis: SQLite, CCNA szintű elméleti és gyakorlati ismeretek",
            "Rendszerüzemeltetés: Hardveres diagnosztika, DDU illesztőprogram-kezelés"
        ],
        "experience": [
            {"role": "Főgyűjtőtisztító", "company": "FCSM", "date": "2026. jún. - Jelenleg", "desc": "Fizikai és infrastrukturális karbantartás, folyamatos munkavégzés az egyetemi tanulmányok mellett."},
            {"role": "Forgalomirányító diszpécser", "company": "BKV Zrt.", "date": "2026. jan. - 2026. jún.", "desc": "Menetrendi forgalom biztosítása, incidensek higgadt, gyors kezelése."},
            {"role": "Értékesítő / Tech Support", "company": "Vodafone Partner", "date": "2023. jún. - 2025. nov.", "desc": "Ügyfélproblémák analízise, technikai segítségnyújtás, hardveres diagnosztika."}
        ]
    }
    return jsonify(portfolio_content)


# --- VÉDETT IOT VÉGPONT ---
@app.route('/api/iot/status', methods=['GET'])
@token_required
def get_iot_status():
    """ Lekérdezi a felhőből a 3 eszköz valós, fizikai állapotát """
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
@limiter.limit("3 per minute")
def control_iot(device_name, action):
    """ Billenő kapcsoló parancsának végrehajtása """
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
        openapi.post(f'/v1.0/iot-03/devices/{device_id}/commands', commands)
        return jsonify({"status": "success", "device": device_name, "action": action})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)