// --- V2 BEJELENTKEZÉS (GLASSMORPHISM) ---
async function attemptGlassLogin() {
    const password = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('jwt_token', data.token);
            errorMsg.style.display = 'none';

            const overlay = document.getElementById('login-overlay');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';

            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);

            const mainContent = document.getElementById('main-content');
            mainContent.classList.remove('blurred-content');

            loadPortfolioDataV2();

        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Hálózati hiba:", error);
    }
}

// // --- AUTOMATIKUS BEJELENTKEZÉS LINKBŐL ÉS ENTER FIGYELÉS ---
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-input');

    // 1. Enter gomb figyelése (ha valaki manuálisan írja be)
    if(passwordInput) {
        passwordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                attemptGlassLogin();
            }
        });
    }

    // 2. Automatikus "Magic Link" bejelentkezés
    const urlParams = new URLSearchParams(window.location.search);
    const autoKey = urlParams.get('key'); // Keresi a "?key=..." részt a linkben

    if (autoKey) {
        // Ha van kulcs a linkben, beteszi a rejtett mezőbe...
        if(passwordInput) passwordInput.value = autoKey;

        // ...és azonnal rányom a belépés gombra a háttérben
        attemptGlassLogin();

        // Eltüntetjük a jelszót a címsorból a belépés után!
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

async function loadPortfolioDataV2() {
    await fetchPersonalData();
    await fetchGitHubProjects();
    initIoTModule();
}

// --- 1. MODUL: SZÖVEGES ADATOK BETÖLTÉSE ---
async function fetchPersonalData() {
    const token = sessionStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch('/api/portfolio-data', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // 1. BEMUTATKOZÁS
            const aboutCard = document.getElementById('about-me');
            aboutCard.innerHTML = `
                <h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem; text-align: center;">Bemutatkozás</h2>
                <p style="line-height: 1.8; font-size: 1.1rem; text-align: justify; color: var(--text-main);">
                    ${data.personal_info.introduction}
                </p>
            `;

            // 2. SULI
            let eduHTML = `<h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem;">Tanulmányaim</h2>`;
            data.education.forEach(edu => {
                eduHTML += `
                    <div style="margin-bottom: 25px; padding-left: 15px; border-left: 2px solid rgba(var(--accent-rgb), 0.4);">
                        <h3 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.15rem; font-weight: 700;">${edu.institution}</h3>
                        <p style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4;">${edu.degree}</p>
                        <p style="color: var(--accent); margin: 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${edu.period}</p>
                    </div>
                `;
            });
            document.getElementById('education').innerHTML = eduHTML;

            // 3. MUNKA
            let expHTML = `<h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem;">Munkatapasztalataim</h2>`;
            data.experience.forEach(job => {
                expHTML += `
                    <div style="margin-bottom: 25px; padding-left: 15px; border-left: 2px solid rgba(var(--accent-rgb), 0.4);">
                        <h3 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.15rem; font-weight: 700;">${job.company}</h3>
                        <p style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4;">${job.role}</p>
                        <p style="color: var(--accent); margin: 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${job.period}</p>
                    </div>
                `;
            });
            document.getElementById('experience').innerHTML = expHTML;

            // 4. KÉSZSÉGEK & HOBBIK
            let skillsHTML = `
                <h2 style="margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem; text-align: center;">
                    <span style="color: #ff4444;">Tanfolyamok</span>,
                    <span style="color: #ff8c00;">készségek</span> &
                    <span style="color: #4da6ff;">hobbik</span>
                </h2>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            `;

            if(data.certifications) data.certifications.forEach(item => skillsHTML += generateSkillBadge(item, 'cert'));
            if(data.skills) data.skills.forEach(item => skillsHTML += generateSkillBadge(item, 'skill'));
            if(data.hobbies) data.hobbies.forEach(item => skillsHTML += generateSkillBadge(item, 'hobby'));

            skillsHTML += `</div>`;
            document.getElementById('skills').innerHTML = skillsHTML;

            // 5. LÁBLÉC
            const footerCard = document.getElementById('dynamic-footer');
            if (footerCard && data.personal_info) {
                footerCard.innerHTML = `
                    <h3 style="color: var(--accent); margin-top: 0; margin-bottom: 25px; font-size: 1.2rem; letter-spacing: 2px; text-transform: uppercase;">Kapcsolat</h3>
                    <div style="display: flex; flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 30px; font-size: 1rem; color: var(--text-muted);">
                        <span style="margin: 0;">📍 ${data.personal_info.location || 'Nincs megadva cím'}</span>
                        <span style="margin: 0;">📧 ${data.personal_info.email || 'Nincs megadva e-mail'}</span>
                        <span style="margin: 0;">📞 ${data.personal_info.phone || 'Nincs megadva telefon'}</span>
                    </div>
                    <p style="margin-top: 40px; margin-bottom: 0; color: #666; font-size: 0.85rem;">© ${new Date().getFullYear()} Reguli Patrik. Minden jog fenntartva.</p>
                `;
            }

            // 6. PROFILKÉP BETÖLTÉSE (Mobilbarát beállítással)
            const profilePicContainer = document.getElementById('dynamic-profile-pic');
            if (profilePicContainer && data.personal_info && data.personal_info.profile_image) {
                profilePicContainer.innerHTML = `
                    <style>
                        .morphing-blob-pic {
                            width: 260px;
                            height: 260px;
                            background-size: cover;
                            background-position: center;
                            border: 3px solid var(--accent);
                            box-shadow: 0 0 25px rgba(var(--accent-rgb), 0.3);
                            animation: profileMorph 8s ease-in-out infinite;
                            transition: all 0.5s ease;
                        }
                        .morphing-blob-pic:hover {
                            transform: scale(1.05);
                            box-shadow: 0 0 35px rgba(var(--accent-rgb), 0.5);
                        }
                        @keyframes profileMorph {
                            0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                            100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                        }
                        /* MOBIL NÉZET A KÉPNEK */
                        @media (max-width: 768px) {
                            .morphing-blob-pic {
                                width: 160px !important;
                                height: 160px !important;
                            }
                        }
                    </style>
                    <div id="blob-image-target" class="morphing-blob-pic"></div>
                `;

                const imgTarget = document.getElementById('blob-image-target');
                if (imgTarget) {
                    imgTarget.style.backgroundImage = `url('${data.personal_info.profile_image}')`;
                }
            }

        }
    } catch (error) {
        console.error('Hálózat/API hiba az adatok betöltésekor:', error);
    }
}

function generateSkillBadge(skillName, type) {
    let bgColor, borderColor;
    if (type === 'skill') { bgColor = 'rgba(255, 140, 0, 0.15)'; borderColor = '#ff8c00'; }
    else if (type === 'cert') { bgColor = 'rgba(255, 68, 68, 0.15)'; borderColor = '#ff4444'; }
    else if (type === 'hobby') { bgColor = 'rgba(77, 166, 255, 0.15)'; borderColor = '#4da6ff'; }

    return `<span style="background: ${bgColor}; padding: 8px 18px; border-radius: 20px; border: 1px solid ${borderColor}; font-weight: bold; color: var(--text-main); font-size: 0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${skillName}</span>`;
}

// --- 2. MODUL: GITHUB ÉS EGYÉB PROJEKTEK (Mobil-optimalizált slider) ---
async function fetchGitHubProjects() {
    try {
        const response = await fetch('https://api.github.com/users/regulip/repos?sort=updated');
        if (response.ok) {
            const repos = await response.json();
            const projectsCard = document.getElementById('github-projects');
            if (!projectsCard) return;

            let html = `
                <style>
                    .slider-container::-webkit-scrollbar { display: none; }
                    /* Mobilon eltűntetjük a nyilakat, mert lehet ujjal húzni */
                    @media (max-width: 768px) {
                        .slider-btn { display: none !important; }
                        .slider-container { width: 100% !important; padding: 10px 0 !important; }
                    }
                </style>

                <h2 style="text-align: center; color: var(--accent); margin-bottom: 20px; width: 100%;">GITHUB PROJEKTEK</h2>
                <div style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 40px;">

                    <button class="slider-btn" onclick="document.getElementById('github-repo-container').scrollBy({left: -300, behavior: 'smooth'})"
                            style="position: absolute; left: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10094;
                    </button>

                    <div id="github-repo-container" class="slider-container" style="display: flex; flex-direction: row; gap: 20px; width: 90%; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; padding: 15px 5px;">
            `;

            repos.slice(0, 6).forEach(repo => {
                html += `
                    <a href="${repo.html_url}" target="_blank" style="text-decoration: none; color: inherit; flex: 0 0 210px;">
                        <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid var(--glass-border); padding: 20px; border-radius: 20px; transition: transform 0.3s ease, background 0.3s ease; height: 190px; display: flex; flex-direction: column; justify-content: space-between;"
                             onmouseover="this.style.background='rgba(var(--accent-rgb), 0.1)'; this.style.transform='translateY(-10px)';"
                             onmouseout="this.style.background='rgba(0, 0, 0, 0.15)'; this.style.transform='translateY(0)';">

                            <div>
                                <h3 style="margin: 0 0 10px 0; color: var(--text-main); font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${repo.name}</h3>
                                <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                                    ${repo.description || 'Nincs megadva leírás ehhez a projekthez.'}
                                </p>
                            </div>
                            <span style="display: inline-block; margin-top: 10px; font-size: 0.8rem; color: var(--accent); border: 1px solid var(--accent); padding: 4px 12px; border-radius: 12px; align-self: flex-start; background: rgba(var(--accent-rgb), 0.05);">
                                ${repo.language || 'Kód'}
                            </span>
                        </div>
                    </a>
                `;
            });

            html += `
                    </div>
                    <button class="slider-btn" onclick="document.getElementById('github-repo-container').scrollBy({left: 300, behavior: 'smooth'})"
                            style="position: absolute; right: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10095;
                    </button>
                </div>
            `;

            const otherProjects = [
                { name: "Mozi Jegyfoglaló Webapp", description: "Egyetemi projekt: teljes körű mozijegy-foglaló rendszer terminálos és grafikus felülettel, adatbázissal.", language: "Python / Flask", url: "#" },
                { name: "Étrend-kiegészítő Webáruház", description: "Shopify alapú e-commerce platform üzleti koncepciója, logisztikai rendszer integrációval.", language: "Shopify / E-commerce", url: "#" },
                { name: "IoT Okosotthon Dashboard", description: "Egyedi okosotthon vezérlőfelület, amely közvetlenül kommunikál a Tuya API-val és a szenzorokkal.", language: "JavaScript / IoT", url: "#" }
            ];

            html += `
                <h2 style="text-align: center; color: var(--accent); margin-bottom: 20px; width: 100%;">EGYÉB PROJEKTEK</h2>
                <div style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center;">
                    <button class="slider-btn" onclick="document.getElementById('other-repo-container').scrollBy({left: -300, behavior: 'smooth'})"
                            style="position: absolute; left: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10094;
                    </button>
                    <div id="other-repo-container" class="slider-container" style="display: flex; flex-direction: row; gap: 20px; width: 90%; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; padding: 15px 5px;">
            `;

            otherProjects.forEach(proj => {
                html += `
                    <a href="${proj.url}" target="_blank" style="text-decoration: none; color: inherit; flex: 0 0 260px;">
                        <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid var(--glass-border); padding: 20px; border-radius: 20px; transition: transform 0.3s ease, background 0.3s ease; height: 220px; display: flex; flex-direction: column; justify-content: space-between;"
                             onmouseover="this.style.background='rgba(var(--accent-rgb), 0.1)'; this.style.transform='translateY(-10px)';"
                             onmouseout="this.style.background='rgba(0, 0, 0, 0.15)'; this.style.transform='translateY(0)';">
                            <div>
                                <h3 style="margin: 0 0 10px 0; color: var(--text-main); font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${proj.name}</h3>
                                <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                                    ${proj.description}
                                </p>
                            </div>
                            <span style="display: inline-block; margin-top: 10px; font-size: 0.8rem; color: var(--accent); border: 1px solid var(--accent); padding: 4px 12px; border-radius: 12px; align-self: flex-start; background: rgba(var(--accent-rgb), 0.05);">
                                ${proj.language}
                            </span>
                        </div>
                    </a>
                `;
            });

            html += `
                    </div>
                    <button class="slider-btn" onclick="document.getElementById('other-repo-container').scrollBy({left: 300, behavior: 'smooth'})"
                            style="position: absolute; right: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10095;
                    </button>
                </div>
            `;
            projectsCard.innerHTML = html;
        }
    } catch (error) {
        console.error('Hiba a projektek betöltésekor:', error);
    }
}


// --- 3. MODUL: IOT ÉS OKOSOTTHON INTEGRÁCIÓ ---
let turnOnCount = 0;
let isLockedOut = false;
let tempChartInstance = null;
let humChartInstance = null;

async function initIoTModule() {
    const iotCard = document.getElementById('iot-dashboard');
    if (!iotCard) return;

    iotCard.innerHTML = `
        <style>
            .iot-main-layout { display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; width: 85%; max-width: 900px; margin: 0 auto 15px auto; }
            .iot-2x2-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; }
            .iot-charts-col { display: flex; flex-direction: column; gap: 10px; }

            .chart-box { flex: 1; background: rgba(0, 0, 0, 0.15); border: 1px solid var(--glass-border); border-radius: 15px; padding: 10px; position: relative; display: flex; flex-direction: column; justify-content: center; min-height: 120px; }
            .grid-cell { background: rgba(0, 0, 0, 0.15); border: 2px solid var(--glass-border); border-radius: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; backdrop-filter: blur(5px); transition: all 0.3s ease; aspect-ratio: 1; }

            .iot-btn { cursor: pointer; color: var(--text-main); font-weight: bold; user-select: none; }
            .iot-btn:hover { background: rgba(255, 255, 255, 0.1); transform: scale(1.02); }
            .iot-btn.on { background: rgba(var(--accent-rgb), 0.15); border-color: var(--accent); color: var(--accent); box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.2); }

            .weather-cell { box-shadow: inset 0 0 20px rgba(0,0,0,0.1); cursor: default; }
            .weather-icon { font-size: 2.2rem; margin-bottom: 5px; }
            .weather-temp { font-size: 1.5rem; font-weight: bold; color: var(--text-main); line-height: 1; }

            .iot-console { box-sizing: border-box; width: 85%; max-width: 900px; margin: 0 auto; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--glass-border); border-left: 4px solid var(--accent); padding: 8px 15px; border-radius: 10px; font-family: monospace; color: #ffffff; font-size: 0.85rem; }

            /* MOBIL-OPTIMALIZÁLÁS AZ IOT MODULHOZ */
            @media (max-width: 900px) {
                .iot-main-layout { grid-template-columns: 1fr; width: 100%; }
                .iot-console { width: 100%; font-size: 0.75rem; }
            }
        </style>

        <h2 style="text-align: center; color: var(--accent); margin-bottom: 5px; font-size: 1.5rem;">OTTHON VEZÉRLÉS</h2>
        <p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 0; margin-bottom: 25px; font-style: italic;">
            Mert egy sima PDF önéletrajz unalmas. Kattints bátran, ezekkel tényleg a lakásban kapcsolgatod a villanyt!
        </p>

        <div class="iot-main-layout">
            <div class="iot-2x2-grid">
                <div id="btn-bulb1" onclick="toggleDevice('bulb1')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">💡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Nappali hangulatfény</span>
                </div>
                <div id="btn-bulb2" onclick="toggleDevice('bulb2')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">💡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Hálószoba lámpa</span>
                </div>
                <div id="btn-switch" onclick="toggleDevice('switch')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">💡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Nappali lámpa</span>
                </div>
                <div class="grid-cell weather-cell">
                    <div class="weather-icon" id="room-icon">🌡️</div>
                    <div class="weather-temp" id="room-temp">--°C</div>
                    <div style="color: var(--text-muted); font-size: 0.65rem; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Szoba klíma</div>
                </div>
            </div>

            <div class="iot-charts-col">
                <div class="chart-box">
                    <div style="position: absolute; top: 10px; left: 15px; font-size: 0.75rem; color: var(--accent);">Hőmérséklet (°C)</div>
                    <canvas id="tempChart"></canvas>
                </div>
                <div class="chart-box">
                    <div style="position: absolute; top: 10px; left: 15px; font-size: 0.75rem; color: #4da6ff;">Páratartalom (%)</div>
                    <canvas id="humChart"></canvas>
                </div>
            </div>
        </div>

        <div id="iot-console" class="iot-console">> Rendszer inicializálva. Várakozás a parancsokra...</div>
    `;

    await fetchAndDrawChart();
    await fetchIoTStatus();
}

function logIoTMessage(message, color = "#ffffff") {
    const consoleEl = document.getElementById('iot-console');
    if (consoleEl) {
        const time = new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
        consoleEl.innerHTML = `<span style="color: ${color};">> [${time}] ${message}</span>`;
    }
}

function updateButtonState(device, isOn) {
    const btn = document.getElementById(`btn-${device}`);
    if(btn) {
        if(isOn) { btn.classList.add('on'); btn.classList.remove('off'); }
        else { btn.classList.add('off'); btn.classList.remove('on'); }
    }
}

async function fetchIoTStatus() {
    const token = sessionStorage.getItem('jwt_token');
    try {
        const response = await fetch('/api/iot/status', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            updateButtonState('bulb1', data.bulb1);
            updateButtonState('bulb2', data.bulb2);
            updateButtonState('switch', data.switch);
            logIoTMessage("Rendszer online. Kapcsolat a Tuya felhővel aktív.");
        } else {
            logIoTMessage("Nem sikerült lekérdezni az eszközök állapotát.", "#ff4444");
        }
    } catch (error) {
        logIoTMessage("Hálózati hiba az állapot lekérdezésekor.", "#ff4444");
    }
}

async function toggleDevice(device) {
    if (isLockedOut) return;

    const btn = document.getElementById(`btn-${device}`);
    const isCurrentlyOn = btn.classList.contains('on');
    const action = !isCurrentlyOn ? 'on' : 'off';
    const token = sessionStorage.getItem('jwt_token');

    if (action === 'on') {
        turnOnCount++;
        if (turnOnCount >= 4) {
            triggerLockout();
            return;
        }
    }

    btn.style.pointerEvents = 'none';
    logIoTMessage("Parancs szinkronizálása a felhővel...");
    updateButtonState(device, action === 'on');

    try {
        const response = await fetch(`/api/iot/${device}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            if (action === 'on') {
                logIoTMessage("Siker: Eszköz felkapcsolva! (Biztonsági okokból 2 perc múlva automatikusan lekapcsol)");
                setTimeout(() => {
                    if (!isLockedOut) logIoTMessage("Automatikus lekapcsolás szinkronizálása a felhővel...");
                    fetchIoTStatus();
                }, 122000);
            } else {
                logIoTMessage("Siker: Eszköz lekapcsolva!");
            }
        } else {
            updateButtonState(device, isCurrentlyOn);
            if (response.status === 429) logIoTMessage("Védelmi rendszer: Túl sok gyors kattintás! Kérlek, várj egy picit.", "#ff4444");
            else logIoTMessage("Hiba történt a vezérlés során.", "#ff4444");
        }
    } catch (error) {
        updateButtonState(device, isCurrentlyOn);
        logIoTMessage("Hálózati hiba történt.", "#ff4444");
    } finally {
        setTimeout(() => {
            if (!isLockedOut) btn.style.pointerEvents = 'auto';
        }, 1500);
    }
}

function triggerLockout() {
    isLockedOut = true;
    fetchIoTStatus();
    const buttons = ['btn-bulb1', 'btn-bulb2', 'btn-switch'];
    buttons.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.style.pointerEvents = 'none'; el.style.opacity = '0.4'; }
    });
    logIoTMessage("Védelmi Rendszer: Elérted a limitet! A gombok 5 percre letiltva.", "#ff4444");

    setTimeout(() => {
        isLockedOut = false;
        turnOnCount = 0;
        buttons.forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.style.pointerEvents = 'auto'; el.style.opacity = '1'; }
        });
        logIoTMessage("Zár feloldva. A kapcsolók újra használhatók.");
    }, 300000);
}

async function fetchAndDrawChart() {
    const token = sessionStorage.getItem('jwt_token');
    try {
        const response = await fetch('/api/temperature', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            if (data.temperatures && data.temperatures.length > 0) {
                const currentTemp = data.temperatures[data.temperatures.length - 1];
                document.getElementById('room-temp').innerText = currentTemp + '°C';
                let icon = '🌡️';
                if (currentTemp < 20) icon = '❄️'; else if (currentTemp >= 26) icon = '🔥';
                document.getElementById('room-icon').innerText = icon;
            }

            const ctxTemp = document.getElementById('tempChart').getContext('2d');
            const ctxHum = document.getElementById('humChart').getContext('2d');

            const commonOptions = {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 30, bottom: 0, left: 0, right: 0 } },
                scales: {
                    x: { display: false },
                    y: { ticks: { color: '#888', font: {size: 10} }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { display: false } }
            };

            if (tempChartInstance) {
                tempChartInstance.data.labels = data.labels;
                tempChartInstance.data.datasets[0].data = data.temperatures;
                tempChartInstance.update();
            } else {
                tempChartInstance = new Chart(ctxTemp, {
                    type: 'line',
                    data: { labels: data.labels, datasets: [{ data: data.temperatures, borderColor: '#cc0000', backgroundColor: 'rgba(var(--accent-rgb), 0.1)', tension: 0.4, fill: true, pointRadius: 0 }] },
                    options: commonOptions
                });
            }

            if (humChartInstance) {
                humChartInstance.data.labels = data.labels;
                humChartInstance.data.datasets[0].data = data.humidities;
                humChartInstance.update();
            } else {
                humChartInstance = new Chart(ctxHum, {
                    type: 'line',
                    data: { labels: data.labels, datasets: [{ data: data.humidities, borderColor: '#4da6ff', backgroundColor: 'rgba(77, 166, 255, 0.1)', tension: 0.4, fill: true, pointRadius: 0 }] },
                    options: commonOptions
                });
            }
        }
    } catch (error) {
        console.error("Hiba a grafikon adatainak lekérésekor:", error);
    }
}