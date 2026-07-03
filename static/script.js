// BEJELENTKEZÉS LOGIKÁJA
async function attemptLogin() {
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');

    try {
        // POST kérés küldése a Python szervernek
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (response.ok) {
            // SIKER: Token elmentése a böngésző munkamenetébe (bezárásig él)
            sessionStorage.setItem('jwt_token', data.token);

            // UI váltás: Belépő panel elrejtése, Portfólió megjelenítése
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('portfolio-section').style.display = 'block';

            // Hibajelzés eltüntetése
            errorMsg.style.display = 'none';

            // Titkos adatok lekérése a szerverről!
            loadPortfolioData();
        } else {
            // HIBA (pl. rossz jelszó, vagy Rate Limit tiltás)
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Hálózati hiba:", error);
    }
}

// VÉDETT ADATOK LEKÉRÉSE ÉS MEGJELENÍTÉSE
async function loadPortfolioData() {
    const token = sessionStorage.getItem('jwt_token');

    // Ha nincs token (nem lépett be), nem is próbálkozunk
    if (!token) return;

    try {
        // GET kérés a védett végpontra, a tokennel a fejlécben (Authorization: Bearer <token>)
        const response = await fetch('/api/portfolio-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            // HTML tartalom feltöltése az adatokkal
            document.getElementById('intro-box').innerHTML = `<h3>Bemutatkozás</h3><p>${data.introduction}</p>`;
            document.getElementById('skills-box').innerHTML = `<h3>Készségek</h3><p>${data.skills.join(', ')}</p>`;
        } else {
            // Ha a token lejárt (20 perc eltelt), automatikus kijelentkeztetés
            alert("A munkamenet lejárt. Kérjük, jelentkezz be újra!");
            logout();
        }
    } catch (error) {
        console.error("Hiba az adatok lekérésekor:", error);
    }
}

// KIJELENTKEZÉS
function logout() {
    // Token törlése a memóriából
    sessionStorage.removeItem('jwt_token');

    // UI visszaállítása az eredeti állapotra
    document.getElementById('password-input').value = '';
    document.getElementById('portfolio-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}