const AUTH = { user: "admin", pass: "admin123" };

let appData = {
    yape: { total: 0, history: [] },
    efectivo: { total: 0, history: [] }
};

// --- CONEXIÓN EN TIEMPO REAL ---
function conectarNube() {
    const dbRef = window.fb.ref(window.db, 'movimientos');
    
    window.fb.onValue(dbRef, (snapshot) => {
        appData.yape = { total: 0, history: [] };
        appData.efectivo = { total: 0, history: [] };
        
        const data = snapshot.val();
        if (data) {
            // Procesar datos y calcular totales
            Object.values(data).forEach(mov => {
                if (mov.tipoModulo === 'yape') {
                    appData.yape.history.unshift(mov); // Lo más nuevo arriba
                    appData.yape.total += (mov.op === 'in' ? mov.monto : -mov.monto);
                } else {
                    appData.efectivo.history.unshift(mov);
                    appData.efectivo.total += (mov.op === 'in' ? mov.monto : -mov.monto);
                }
            });
        }
        
        const btnActivo = document.querySelector('.nav-btn.active');
        const moduloActual = btnActivo ? btnActivo.id.replace('btn-', '') : 'resumen';
        showModule(moduloActual);
    });
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === AUTH.user && p === AUTH.pass) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-dashboard').classList.remove('hidden');
        conectarNube();
    } else {
        document.getElementById('error-msg').innerText = "Usuario o contraseña incorrectos";
    }
}

async function registrar(tipo) {
    const montoInput = document.getElementById('val-monto');
    const descInput = document.getElementById('val-desc');
    const monto = parseFloat(montoInput.value);
    const desc = descInput.value;
    const op = document.getElementById('val-tipo').value;

    if (!monto || !desc) return alert("Por favor, completa todos los campos");

    try {
        const dbRef = window.fb.ref(window.db, 'movimientos');
        await window.fb.push(dbRef, {
            desc: desc,
            monto: monto,
            op: op,
            tipoModulo: tipo,
            fecha: new Date().toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        });
        
        montoInput.value = "";
        descInput.value = "";
        alert("✅ Guardado en la nube");
    } catch (e) {
        alert("❌ Error al guardar");
    }
}

function showModule(type) {
    const content = document.getElementById('content-module');
    if (!content) return;
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (document.getElementById(`btn-${type}`)) {
        document.getElementById(`btn-${type}`).classList.add('active');
    }

    if (type === 'resumen') {
        const total = appData.yape.total + appData.efectivo.total;
        content.innerHTML = `
            <h1>Resumen General (Nube)</h1>
            <div class="balance-card">
                <p style="color: var(--text-muted)">Balance Total</p>
                <div class="amount-big">S/ ${total.toFixed(2)}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="balance-card" style="border-left: 5px solid var(--yape)">
                    <p>Total Yape</p>
                    <h3>S/ ${appData.yape.total.toFixed(2)}</h3>
                </div>
                <div class="balance-card" style="border-left: 5px solid var(--cash)">
                    <p>Total Efectivo</p>
                    <h3>S/ ${appData.efectivo.total.toFixed(2)}</h3>
                </div>
            </div>
            <div class="chart-container" style="margin-top:20px; background:var(--bg-card); padding:20px; border-radius:16px;">
                <canvas id="balanceChart"></canvas>
            </div>
        `;
        initChart();
    } else {
        const data = appData[type];
        const color = type === 'yape' ? 'var(--yape)' : 'var(--cash)';
        content.innerHTML = `
            <h1>Gestión: ${type.toUpperCase()}</h1>
            <div class="balance-card" style="border-top: 5px solid ${color}">
                <p>Saldo Actual</p>
                <div class="amount-big" style="color: ${color}">S/ ${data.total.toFixed(2)}</div>
            </div>
            <div class="balance-card">
                <h3>Nueva Operación</h3>
                <div class="form-group">
                    <input type="number" id="val-monto" placeholder="Monto S/">
                    <input type="text" id="val-desc" placeholder="Concepto">
                    <select id="val-tipo">
                        <option value="in">Entrada (+)</option>
                        <option value="out">Salida (-)</option>
                    </select>
                    <button class="btn-save" onclick="registrar('${type}')">Guardar</button>
                </div>
            </div>
            <div class="balance-card">
                <h3>Historial</h3>
                <div id="historial-lista">${renderHistorial(data.history)}</div>
            </div>
        `;
    }
}

function renderHistorial(lista) {
    if (lista.length === 0) return '<p>Sin movimientos</p>';
    return lista.map(h => `
        <div class="history-item">
            <div><strong>${h.desc}</strong><br><small style="color:var(--text-muted)">${h.fecha}</small></div>
            <span class="${h.op === 'in' ? 'type-in' : 'type-out'}">
                ${h.op === 'in' ? '+' : '-'} S/ ${h.monto.toFixed(2)}
            </span>
        </div>
    `).join('');
}

function initChart() {
    const canvas = document.getElementById('balanceChart');
    if (!canvas) return;
    new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Yape', 'Efectivo'],
            datasets: [{
                data: [appData.yape.total, appData.efectivo.total],
                backgroundColor: ['#52c447', '#3a7a34'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { labels: { color: '#e0e4e0' }, position: 'bottom' } } }
    });
}