# 🚀 Interaktív IoT Portfólió & Okosotthon Vezérlő

Ez a projekt egy interaktív, webes portfólió alkalmazás, amely túlmutat a hagyományos statikus önéletrajzokon. A rendszer egy egyedi, beépített **IoT (Internet of Things)** modullal rendelkezik, amelyen keresztül a látogatók valós időben vezérelhetik egy budapesti lakás világítását, és élőben követhetik annak klímaadatait.

A projekt célja, hogy gyakorlati példán keresztül mutassa be a Python (Flask) backend, a REST API integrációk, és az adatbázis-kezelés terén szerzett mérnöki tapasztalatokat.

## ✨ Főbb funkciók

*   **🔒 Biztonságos hozzáférés (JWT):** A portfólió tartalma és az IoT vezérlés egy jelszóval védett kapu mögött található. A belépést JWT (JSON Web Token) alapú munkamenet-kezelés és Rate Limiter (brute-force elleni védelem) biztosítja.
*   **💡 Élő Hardver Vezérlés (Tuya API):** A weboldalról közvetlenül kapcsolhatók fizikai okoseszközök (főkapcsoló, olvasólámpa, hangulatfény). 
*   **⏱️ Auto-Revert Biztonsági Rendszer:** A távolról bekapcsolt eszközöket a szerver egy háttérben futó időzítő (Threading) segítségével 5 perc után automatikusan lekapcsolja.
*   **📊 Élő Klíma Grafikon:** Egy háttérfolyamat 15 percenként méri a hőmérsékletet és páratartalmat, amit egy felhős PostgreSQL adatbázisban tárol rotációs elven (csak az utolsó 30 mérést megtartva). Ezt a frontend egy reszponzív, dupla-tengelyes Chart.js grafikonon jeleníti meg.

## 🛠️ Használt Technológiák (Tech Stack)

*   **Backend:** Python 3, Flask, JWT, Flask-Limiter, Threading
*   **Adatbázis:** PostgreSQL (Render Cloud), Psycopg2
*   **IoT Integráció:** Tuya Cloud Open API (`tuya-connector-python`)
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API), Chart.js
*   **Üzemeltetés / Deployment:** Gunicorn, Render, Git

## 👨‍💻 Fejlesztő
**Reguli Patrik**  
*Mérnökinformatikus hallgató - Gábor Dénes Egyetem*

Készült a folyamatos szakmai fejlődés és a modern felhős/IoT technológiák gyakorlati alkalmazása céljából.