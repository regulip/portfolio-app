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
            // 1. Token mentése
            sessionStorage.setItem('jwt_token', data.token);
            errorMsg.style.display = 'none';

            // 2. A Zsilip (Overlay) elegáns eltüntetése
            const overlay = document.getElementById('login-overlay');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';

            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);

            // 3. A védőréteg (blur) levétele a főoldalról
            const mainContent = document.getElementById('main-content');
            mainContent.classList.remove('blurred-content');

            // 4. A TARTALOM BETÖLTÉSÉNEK MEGHÍVÁSA
            loadPortfolioDataV2();

        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Hálózati hiba:", error);
    }
}

// Enter gomb figyelése a jelszó mezőn
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-input');
    if(passwordInput) {
        passwordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                attemptGlassLogin();
            }
        });
    }
});

// --- A "KARMESTER" FÜGGVÉNY (Ez hívja meg a különböző modulokat) ---
async function loadPortfolioDataV2() {
    // 1. Szöveges adatok betöltése
    await fetchPersonalData();

    // 2. Ide jön majd a GitHub
    await fetchGitHubProjects();

    // 3. Ide jön majd az IoT és a Chart.js (ennek a kódját később hozzuk át)
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

            // 1. BEMUTATKOZÁS szekció feltöltése
            const aboutCard = document.getElementById('about-me');
            aboutCard.innerHTML = `
                <h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem; text-align: center;">Bemutatkozás</h2>
                <p style="line-height: 1.5; font-size: 0.95rem; text-align: justify; color: var(--text-main);">
                    ${data.personal_info.introduction}
                </p>
            `;

            // 2. SULI szekció feltöltése (Listázás)
            let eduHTML = `<h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem;">Tanulmányaim</h2>`;
            data.education.forEach(edu => {
                eduHTML += `
                    <div style="margin-bottom: 25px; padding-left: 15px; border-left: 2px solid rgba(255, 140, 0, 0.4);">
                        <h3 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.15rem; font-weight: 700;">${edu.institution}</h3>
                        <p style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4;">${edu.degree}</p>
                        <p style="color: var(--accent); margin: 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${edu.period}</p>
                    </div>
                `;
            });
            document.getElementById('education').innerHTML = eduHTML;

            // 3. MUNKA szekció feltöltése (Listázás)
            let expHTML = `<h2 style="color: var(--accent); margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem;">Munkatapasztalataim</h2>`;
            data.experience.forEach(job => {
                expHTML += `
                    <div style="margin-bottom: 25px; padding-left: 15px; border-left: 2px solid rgba(255, 140, 0, 0.4);">
                        <h3 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.15rem; font-weight: 700;">${job.company}</h3>
                        <p style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4;">${job.role}</p>
                        <p style="color: var(--accent); margin: 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${job.period}</p>
                    </div>
                `;
            });
            document.getElementById('experience').innerHTML = expHTML;

            // 4. KÉSZSÉGEK & HOBBIK (Badge-ek összevonása)
            const allSkillsAndHobbies = [
                ...data.skills,
                ...data.certifications,
                ...data.hobbies
            ];

            let skillsHTML = `
                <h2 style="margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.3rem; text-align: center;">
                    <span style="color: #ff4444;">Tanfolyamok</span>,
                    <span style="color: var(--accent);">készségek</span> &
                    <span style="color: #4da6ff;">hobbik</span>
                </h2>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            `;

            if(data.certifications) {
                data.certifications.forEach(item => skillsHTML += generateSkillBadge(item, 'cert'));
            }
            if(data.skills) {
                data.skills.forEach(item => skillsHTML += generateSkillBadge(item, 'skill'));
            }
            if(data.hobbies) {
                data.hobbies.forEach(item => skillsHTML += generateSkillBadge(item, 'hobby'));
            }

            skillsHTML += `</div>`;
            document.getElementById('skills').innerHTML = skillsHTML;

            // 5. LÁBLÉC SZEKCIÓ FELTÖLTÉSE A DB ADATOKKAL
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

            // 6. PROFILKÉP BETÖLTÉSE "GUMIS" ANIMÁCIÓVAL (Most már jó helyen, a try-ban, a data változóval!)
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
                            box-shadow: 0 0 25px rgba(255, 140, 0, 0.3);
                            animation: profileMorph 8s ease-in-out infinite;
                            transition: all 0.5s ease;
                        }
                        .morphing-blob-pic:hover {
                            transform: scale(1.05);
                            box-shadow: 0 0 35px rgba(255, 140, 0, 0.5);
                        }
                        @keyframes profileMorph {
                            0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                            100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
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

// Segédfüggvény a szép "kapszula" stílusú gombokhoz (Színkódolt verzió)
function generateSkillBadge(skillName, type) {
    let bgColor, borderColor;

    // Színek meghatározása a típus alapján
    if (type === 'skill') {
        bgColor = 'rgba(255, 140, 0, 0.15)'; // Narancs
        borderColor = 'var(--accent)';
    } else if (type === 'cert') {
        bgColor = 'rgba(255, 68, 68, 0.15)'; // Piros
        borderColor = '#ff4444';
    } else if (type === 'hobby') {
        bgColor = 'rgba(77, 166, 255, 0.15)'; // Kék
        borderColor = '#4da6ff';
    }

    return `<span style="background: ${bgColor}; padding: 8px 18px; border-radius: 20px; border: 1px solid ${borderColor}; font-weight: bold; color: var(--text-main); font-size: 0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${skillName}</span>`;
}

// --- 2. MODUL: GITHUB ÉS EGYÉB PROJEKTEK BETÖLTÉSE (Dupla Vízszintes Slider) ---
async function fetchGitHubProjects() {
    try {
        const response = await fetch('https://api.github.com/users/regulip/repos?sort=updated');

        if (response.ok) {
            const repos = await response.json();

            const projectsCard = document.getElementById('github-projects');
            if (!projectsCard) return;

            // Közös stílus a görgetősávok elrejtésére
            let html = `
                <style>
                    .slider-container::-webkit-scrollbar { display: none; }
                </style>

                <h2 style="text-align: center; color: var(--accent); margin-bottom: 20px; width: 100%;">GITHUB PROJEKTEK</h2>

                <div style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 40px;">

                    <button onclick="document.getElementById('github-repo-container').scrollBy({left: -300, behavior: 'smooth'})"
                            style="position: absolute; left: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10094;
                    </button>

                    <div id="github-repo-container" class="slider-container" style="display: flex; flex-direction: row; gap: 20px; width: 90%; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; padding: 15px 5px;">
            `;

            // GitHub kártyák legenerálása
            repos.slice(0, 6).forEach(repo => {
                html += `
                    <a href="${repo.html_url}" target="_blank" style="text-decoration: none; color: inherit; flex: 0 0 210px;">
                        <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid var(--glass-border); padding: 20px; border-radius: 20px; transition: transform 0.3s ease, background 0.3s ease; height: 180px; display: flex; flex-direction: column; justify-content: space-between;"
                             onmouseover="this.style.background='rgba(255, 140, 0, 0.1)'; this.style.transform='translateY(-10px)';"
                             onmouseout="this.style.background='rgba(0, 0, 0, 0.15)'; this.style.transform='translateY(0)';">

                            <div>
                                <h3 style="margin: 0 0 10px 0; color: var(--text-main); font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${repo.name}</h3>
                                <p style="margin: 0; color: var(--text-muted); font-size: 0.8rem; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                                    ${repo.description || 'Nincs megadva leírás ehhez a projekthez.'}
                                </p>
                            </div>

                            <span style="display: inline-block; margin-top: 10px; font-size: 0.8rem; color: var(--accent); border: 1px solid var(--accent); padding: 4px 12px; border-radius: 12px; align-self: flex-start; background: rgba(255, 140, 0, 0.05);">
                                ${repo.language || 'Kód'}
                            </span>
                        </div>
                    </a>
                `;
            });

            html += `
                    </div>

                    <button onclick="document.getElementById('github-repo-container').scrollBy({left: 300, behavior: 'smooth'})"
                            style="position: absolute; right: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10095;
                    </button>
                </div>
            `;

            // // Helyőrző adatok az egyéb projektekhez
            const otherProjects = [
                {
                    name: "Mozi Jegyfoglaló Webapp",
                    description: "Egyetemi projekt: teljes körű mozijegy-foglaló rendszer terminálos és grafikus felülettel, adatbázissal.",
                    language: "Python / Flask",
                    url: "#"
                },
                {
                    name: "Étrend-kiegészítő Webáruház",
                    description: "Shopify alapú e-commerce platform üzleti koncepciója, logisztikai rendszer integrációval.",
                    language: "Shopify / E-commerce",
                    url: "#"
                },
                {
                    name: "IoT Okosotthon Dashboard",
                    description: "Egyedi okosotthon vezérlőfelület, amely közvetlenül kommunikál a Tuya API-val és a szenzorokkal.",
                    language: "JavaScript / IoT",
                    url: "#"
                }
            ];

            html += `
                <h2 style="text-align: center; color: var(--accent); margin-bottom: 20px; width: 100%;">EGYÉB PROJEKTEK</h2>

                <div style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center;">

                    <button onclick="document.getElementById('other-repo-container').scrollBy({left: -300, behavior: 'smooth'})"
                            style="position: absolute; left: -25px; z-index: 10; background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; color: black; font-size: 2.5rem; cursor: pointer; transition: all 0.3s ease; padding: 0;"
                            onmouseover="this.style.color='var(--accent)'; this.style.transform='scale(1.2)';"
                            onmouseout="this.style.color='black'; this.style.transform='scale(1)';">
                        &#10094;
                    </button>

                    <div id="other-repo-container" class="slider-container" style="display: flex; flex-direction: row; gap: 20px; width: 90%; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; padding: 15px 5px;">
            `;

            // Egyéb projektek kártyáinak legenerálása
            otherProjects.forEach(proj => {
                html += `
                    <a href="${proj.url}" target="_blank" style="text-decoration: none; color: inherit; flex: 0 0 260px;">
                        <div style="background: rgba(0, 0, 0, 0.15); border: 1px solid var(--glass-border); padding: 20px; border-radius: 20px; transition: transform 0.3s ease, background 0.3s ease; height: 220px; display: flex; flex-direction: column; justify-content: space-between;"
                             onmouseover="this.style.background='rgba(255, 140, 0, 0.1)'; this.style.transform='translateY(-10px)';"
                             onmouseout="this.style.background='rgba(0, 0, 0, 0.15)'; this.style.transform='translateY(0)';">

                            <div>
                                <h3 style="margin: 0 0 10px 0; color: var(--text-main); font-size: 1.0rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${proj.name}</h3>
                                <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                                    ${proj.description}
                                </p>
                            </div>

                            <span style="display: inline-block; margin-top: 10px; font-size: 0.8rem; color: var(--accent); border: 1px solid var(--accent); padding: 4px 12px; border-radius: 12px; align-self: flex-start; background: rgba(255, 140, 0, 0.05);">
                                ${proj.language}
                            </span>
                        </div>
                    </a>
                `;
            });

            html += `
                    </div>

                    <button onclick="document.getElementById('other-repo-container').scrollBy({left: 300, behavior: 'smooth'})"
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
          .iot-main-layout {
            display: grid;
             /* 3 egyenlő szélességű oszlopot hozunk létre */
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            width: 95%;
            max-width: 1000px;
            margin: 0 auto;
            }
    .iot-2x2-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; }
    .iot-charts-col { display: flex; flex-direction: column; gap: 10px; }

    /* A diagram doboza marad az eredeti sötét szín: rgba(0, 0, 0, 0.15) */
             .chart-box {
                padding: 10px;
                position: relative; /* Hogy a feliratot lehessen pozícionálni */
                overflow: hidden;
            }

            /* A grafikon feliratát (Hőmérséklet) kényszerítsük felülre */
            .chart-title {
                font-size: 0.75rem;
                color: #666;
                margin-bottom: 5px;
                display: block;
            }
    /* A gombok (grid-cell) is megkapták UGYANAZT a sötétebb színt, mint a diagramok! */
          .grid-cell, .chart-box {
            background: rgba(255, 255, 255, 0.7);
            border-radius: 15px;
            height: 180px; /* Fix magasság mindennek */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
    .iot-btn { cursor: pointer; color: var(--text-main); font-weight: bold; user-select: none; }
    .iot-btn:hover { background: rgba(255, 255, 255, 0.1); transform: scale(1.02); }
    .iot-btn.on { background: rgba(255, 140, 0, 0.15); border-color: var(--accent); color: var(--accent); box-shadow: 0 0 15px rgba(255, 140, 0, 0.2); }

    /* A weather-cell-ből kivettem a backgroundot, mert most már az alap grid-cell is pont ilyen sötét */
    .weather-cell { box-shadow: inset 0 0 20px rgba(0,0,0,0.1); cursor: default; }
    .weather-icon { font-size: 2.2rem; margin-bottom: 5px; }
    .weather-temp { font-size: 1.5rem; font-weight: bold; color: var(--text-main); line-height: 1; }

    /* A konzol kapott egy 'box-sizing: border-box;'-t, így most már 100%-ig egyvonalban lesz a fenti rács széleivel */
        .iot-console {
            box-sizing: border-box;
            width: 95%; /* Legyen ugyanakkora széles, mint a grid */
            max-width: 1000px;
            margin: 20px auto 0 auto; /* Térköz a grid alatt */
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--glass-border);
            border-left: 4px solid var(--accent);
            padding: 10px 15px;
            border-radius: 10px;
            font-family: monospace;
            color: #ffffff;
            font-size: 0.85rem;
        }
    @media (max-width: 900px) { .iot-main-layout { grid-template-columns: 1fr; } }
</style>

        <h2 style="text-align: center; color: var(--accent); margin-bottom: 5px; font-size: 1.5rem;">OTTHON VEZÉRLÉS</h2>

        <p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 0; margin-bottom: 25px; font-style: italic;">
            Mert egy sima PDF önéletrajz unalmas. Kattints bátran, ezekkel tényleg a lakásban kapcsolgatod a villanyt!
        </p>

        <div class="iot-main-layout">
            <div class="iot-2x2-grid">
                <div id="btn-bulb1" onclick="toggleDevice('bulb1')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">💡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Lámpa 1</span>
                </div>
                <div id="btn-bulb2" onclick="toggleDevice('bulb2')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">💡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Lámpa 2</span>
                </div>
                <div id="btn-switch" onclick="toggleDevice('switch')" class="grid-cell iot-btn off">
                    <span style="font-size: 1.5rem;">⚡</span><span style="font-size: 0.75rem; margin-top: 5px; text-transform: uppercase;">Főkapcsoló</span>
                </div>
                <div class="grid-cell weather-cell">
                    <div class="weather-icon" id="room-icon">🌡️</div>
                    <div class="weather-temp" id="room-temp">--°C</div>
                    <div style="color: var(--text-muted); font-size: 0.65rem; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Szoba klíma</div>
                </div>
            </div>

            <div class="iot-charts-col">
                    <div class="chart-box">
                            <div class="chart-title" style="color: var(--accent);">Hőmérséklet (°C)</div>
                            <canvas id="tempChart" style="max-height: 120px;"></canvas>
                        </div>
                        <div class="chart-box">
                            <div class="chart-title" style="color: #4da6ff;">Páratartalom (%)</div>
                            <canvas id="humChart" style="max-height: 120px;"></canvas>
                        </div>
            </div>
        </div>

        <div id="iot-console" class="iot-console">> Rendszer inicializálva. Várakozás a parancsokra...</div>
    `;

    await fetchAndDrawChart();
    await fetchIoTStatus();
}

// Konzol üzenet segédfüggvény (Az alapértelmezett szín mostantól fehér)
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
            logIoTMessage("Rendszer online. Kapcsolat a Tuya felhővel aktív."); // Fehér lesz
        } else {
            logIoTMessage("Nem sikerült lekérdezni az eszközök állapotát.", "#ff4444"); // Piros lesz
        }
    } catch (error) {
        logIoTMessage("Hálózati hiba az állapot lekérdezésekor.", "#ff4444"); // Piros lesz
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
    logIoTMessage("Parancs szinkronizálása a felhővel..."); // Fehér lesz
    updateButtonState(device, action === 'on');

    try {
        const response = await fetch(`/api/iot/${device}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            if (action === 'on') {
                logIoTMessage("Siker: Eszköz felkapcsolva! (Biztonsági okokból 2 perc múlva automatikusan lekapcsol)"); // Fehér lesz
                setTimeout(() => {
                    if (!isLockedOut) {
                        logIoTMessage("Automatikus lekapcsolás szinkronizálása a felhővel..."); // Fehér lesz
                    }
                    fetchIoTStatus();
                }, 122000);
            } else {
                logIoTMessage("Siker: Eszköz lekapcsolva!"); // Fehér lesz
            }
        } else {
            updateButtonState(device, isCurrentlyOn);
            if (response.status === 429) {
                logIoTMessage("Védelmi rendszer: Túl sok gyors kattintás! Kérlek, várj egy picit.", "#ff4444"); // PIROS
            } else {
                logIoTMessage("Hiba történt a vezérlés során.", "#ff4444"); // PIROS
            }
        }
    } catch (error) {
        updateButtonState(device, isCurrentlyOn);
        logIoTMessage("Hálózati hiba történt.", "#ff4444"); // PIROS
    } finally {
        setTimeout(() => {
            if (!isLockedOut) { btn.style.pointerEvents = 'auto'; }
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

    logIoTMessage("Védelmi Rendszer: Elérted a limitet! A gombok 5 percre letiltva.", "#ff4444"); // PIROS

    setTimeout(() => {
        isLockedOut = false;
        turnOnCount = 0;

        buttons.forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.style.pointerEvents = 'auto'; el.style.opacity = '1'; }
        });

        logIoTMessage("Zár feloldva. A kapcsolók újra használhatók."); // Fehér lesz
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
                layout: { padding: { top: 15, bottom: 0, left: 0, right: 0 } },
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
                    data: { labels: data.labels, datasets: [{ data: data.temperatures, borderColor: '#ff8c00', backgroundColor: 'rgba(255, 140, 0, 0.1)', tension: 0.4, fill: true, pointRadius: 0 }] },
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
