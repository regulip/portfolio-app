import os
import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import jwt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# --- 1. BEÁLLÍTÁSOK ÉS KÖRNYEZETI VÁLTOZÓK ---
load_dotenv()

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)