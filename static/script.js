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
                // A CSS-ben megírt .card dizájnt használjuk
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