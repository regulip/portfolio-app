// BEJELENTKEZÉS LOGIKÁJA
async function attemptLogin() {
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
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('portfolio-section').style.display = 'block';
            errorMsg.style.display = 'none';
            loadPortfolioData();
        } else {
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
    if (!token) return;

    try {
        const response = await fetch('/api/portfolio-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            document.getElementById('intro-box').innerHTML = `
                <h3 style="color: #00ff88;">Rólam</h3>
                <p style="font-size: 1.1em; color: #b3b3b3;">${data.introduction}</p>
            `;

            let skillsHtml = '<h3 style="color: #00ff88;">Szakmai Készségek</h3><ul>';
            data.skills.forEach(skill => {
                skillsHtml += `<li>${skill}</li>`;
            });
            skillsHtml += '</ul>';
            document.getElementById('skills-box').innerHTML = skillsHtml;

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

            let expBox = document.getElementById('exp-box');
            if (!expBox) {
                expBox = document.createElement('section');
                expBox.id = 'exp-box';
                document.getElementById('skills-box').after(expBox);
            }
            expBox.innerHTML = expHtml;

            // IOT és Grafikon szinkronizálása (első betöltés)
            fetchIotStatus();
            fetchAndDrawChart();

            // --- Automatikus frissítés a háttérben ---
            setInterval(fetchAndDrawChart, 60000);
            setInterval(fetchIotStatus, 60000);

        } else {
            alert("A munkamenet lejárt. Kérjük, jelentkezz be újra!");
            logout();
        }
    } catch (error) {
        console.error("Hiba az adatok lekérésekor:", error);
    }
}

// KIJELENTKEZÉS
function logout() {
    sessionStorage.removeItem('jwt_token');
    document.getElementById('password-input').value = '';
    document.getElementById('portfolio-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}

// IOT ESZKÖZÖK VEZÉRLÉSE
async function fetchIotStatus() {
    const token = sessionStorage.getItem('jwt_token');
    const statusText = document.getElementById('iot-status');

    try {
        const response = await fetch('/api/iot/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
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

async function toggleDevice(device, checkboxElement) {
    const token = sessionStorage.getItem('jwt_token');
    const statusText = document.getElementById('iot-status');
    const action = checkboxElement.checked ? 'on' : 'off';

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

            // Csak akkor jelezzük a visszaállást és indítjuk az oldali szinkront, ha felkapcsolták
            if (action === 'on') {
                statusText.innerText = `Siker: Eszköz felkapcsolva! (Biztonsági okokból 5 perc múlva automatikusan lekapcsol)`;

                setTimeout(() => {
                    const currentStatus = document.getElementById('iot-status');
                    currentStatus.style.color = "#ffdd00";
                    currentStatus.innerText = "Automatikus lekapcsolás szinkronizálása a felhővel...";
                    fetchIotStatus();
                }, 302000); // 5 perc + 2 sec ráhagyás
            } else {
                statusText.innerText = `Siker: Eszköz lekapcsolva!`;
            }

        } else {
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
        checkboxElement.disabled = false;
    }
}

// GRAFIKON LOGIKA
let portfolioChart = null;

async function fetchAndDrawChart() {
    const token = sessionStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch('/api/temperature', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const ctx = document.getElementById('tempChart').getContext('2d');

            if (portfolioChart) {
                portfolioChart.destroy();
            }

            portfolioChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Hőmérséklet (°C)',
                            data: data.temperatures,
                            borderColor: '#ff4444',
                            backgroundColor: 'rgba(255, 68, 68, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Páratartalom (%)',
                            data: data.humidities,
                            borderColor: '#00ff88',
                            backgroundColor: 'rgba(0, 255, 136, 0.2)',
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', grid: {color: '#444'} },
                        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } },
                        x: { grid: {color: '#444'} }
                    },
                    plugins: {
                        legend: { labels: { color: '#fff' } }
                    }
                }
            });
        }
    } catch (error) {
        console.error("Hiba a grafikon adatainak lekérésekor:", error);
    }
}