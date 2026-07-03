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
        // GET kérés a védett végpontra, a tokennel a fejlécben
        const response = await fetch('/api/portfolio-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            // 1. Bemutatkozás betöltése
            document.getElementById('intro-box').innerHTML = `
                <h3 style="color: #00ff88;">Rólam</h3>
                <p style="font-size: 1.1em; color: #b3b3b3;">${data.introduction}</p>
            `;

            // 2. Készségek listázása
            let skillsHtml = '<h3 style="color: #00ff88;">Szakmai Készségek</h3><ul>';
            data.skills.forEach(skill => {
                skillsHtml += `<li>${skill}</li>`;
            });
            skillsHtml += '</ul>';
            document.getElementById('skills-box').innerHTML = skillsHtml;

            // 3. Tapasztalatok kártyás megjelenítése
            let expHtml = '<h3 style="color: #00ff88;">Szakmai Tapasztalat</h3>';
            data.experience.forEach(job => {
                expHtml += `
                    <div class="card">
                        <h4>${job.role} @ ${job.company}</h4>
                        <span class="date">${job.date}</span>
                        <p>${job.desc}</p>
                    </div>
                `;
            });

            // Ellenőrizzük, hogy létezik-e az exp-box, ha nem, létrehozzuk
            let expBox = document.getElementById('exp-box');
            if (!expBox) {
                expBox = document.createElement('section');
                expBox.id = 'exp-box';
                document.getElementById('skills-box').after(expBox);
            }
            expBox.innerHTML = expHtml;

            // IOT Állapot lekérdezése az adatok betöltése után
            fetchIotStatus();

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

// IOT ESZKÖZÖK VEZÉRLÉSE
// Állapot lekérdezése bejelentkezés után
async function fetchIotStatus() {
    const token = sessionStorage.getItem('jwt_token');
    const statusText = document.getElementById('iot-status');

    try {
        const response = await fetch('/api/iot/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            // Kapcsolók beállítása a valós fizikai állapotra
            document.getElementById('toggle-bulb1').checked = data.bulb1;
            document.getElementById('toggle-bulb2').checked = data.bulb2;
            document.getElementById('toggle-switch').checked = data.switch;

            statusText.innerText = "Rendszer online. Kapcsolat a Tuya felhővel aktív.";
            statusText.style.color = "#00ff88";
        } else {
            statusText.innerText = "Nem sikerült lekérdezni az eszközök állapotát.";
            statusText.style.color = "#ff4444";
        }
    } catch (error) {
        statusText.innerText = "Hálózati hiba az állapot lekérdezésekor.";
        statusText.style.color = "#ff4444";
    }
}

// Kapcsoló kattintásának kezelése
async function toggleDevice(device, checkboxElement) {
    const token = sessionStorage.getItem('jwt_token');
    const statusText = document.getElementById('iot-status');

    // Határozzuk meg a parancsot a checkbox állapota alapján
    const action = checkboxElement.checked ? 'on' : 'off';

    // Átmenetileg letiltjuk a gombot, amíg a kérés fut
    checkboxElement.disabled = true;
    statusText.style.color = "#ffdd00";
    statusText.innerText = "Parancs szinkronizálása a felhővel...";

    try {
        const response = await fetch(`/api/iot/${device}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            statusText.style.color = "#00ff88";
            statusText.innerText = "Siker: Eszköz állapota frissítve!";
        } else {
            // Ha hiba van (pl. Rate Limit), visszaállítjuk a kapcsolót az eredeti állapotába
            checkboxElement.checked = !checkboxElement.checked;
            statusText.style.color = "#ff4444";

            if (response.status === 429) {
                statusText.innerText = "Védelmi rendszer: Túl sok próbálkozás! Kérlek várj egy percet.";
            } else {
                statusText.innerText = "Hiba történt a vezérlés során.";
            }
        }
    } catch (error) {
        checkboxElement.checked = !checkboxElement.checked;
        statusText.style.color = "#ff4444";
        statusText.innerText = "Hálózati hiba történt.";
    } finally {
        // Újra engedélyezzük a kattintást
        checkboxElement.disabled = false;
    }
}