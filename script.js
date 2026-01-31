// Credenciales Solicitadas
const AUTH = { user: "admin", pass: "admin123" };

// Datos del Sistema (Se sincronizarán con la nube)
let appData = {
    yape: { total: 0, history: [] },
    efectivo: { total: 0, history: [] }
};

// --- CONEXIÓN CON LA NUBE ---
// Esta función escucha los cambios en Google Cloud en tiempo real
function conectarNube() {
    const q = window.fb.query(window.fb.collection(window.db, "movimientos"), window.fb.orderBy("fecha", "desc"));
    
    window.fb.onSnapshot(q, (snapshot) => {
        // Reiniciamos datos locales
        appData.yape = { total: 0, history: [] };
        appData.efectivo = { total: 0, history: [] };

        snapshot.forEach((doc) => {
            const data = doc.data();
            const mov = { id: doc.id, ...data, fecha: data.fecha?.toDate().toLocaleDateString() || "Reciente" };
            
            // Clasificar y calcular totales
            if (data.tipoModulo === 'yape') {
                appData.yape.history.push(mov);
                appData.yape.total += (data.op === 'in' ? data.monto : -data.monto);
            } else {
                appData.efectivo.history.push(mov);
                appData.efectivo.total += (data.op === 'in' ? data.monto : -data.monto);
            }
        });

        // Refrescar la pantalla actual
        const moduloActual = document.querySelector('.nav-btn.active')?.id.replace('btn-', '') || 'resumen';
        showModule(moduloActual);
    });
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === AUTH.user && p === AUTH.pass) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-dashboard').classList.remove('hidden');
        conectarNube(); // Iniciamos la conexión al entrar
    } else {
        document.getElementById('error-msg').innerText = "Usuario o contraseña incorrectos";
    }
}

async function registrar(tipo) {
    const monto = parseFloat(document.getElementById('val-monto').value);
    const desc = document.getElementById('val-desc').value;
    const op = document.getElementById('val-tipo').value;

    if (!monto || !desc) return alert("Completa todos los datos");

    try {
        // GUARDAR EN LA NUBE (Google Cloud)
        await window.fb.addDoc(window.fb.collection(window.db, "movimientos"), {
            desc,
            monto,
            op,
            tipoModulo: tipo,
            fecha: window.fb.serverTimestamp()
        });
        
        alert("¡Guardado en la nube con éxito!");
    } catch (e) {
        console.error("Error al guardar: ", e);
        alert("Error de conexión");
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
            <div class="chart-container">
                <canvas id="balanceChart"></canvas>
            </div>
        `;
        initChart();
    } else {
        const data = appData[type];
        const color = type === 'yape' ? 'var(--yape)' : 'var(--cash)';
        
        content.innerHTML = `
            <h1>Panel: ${type.toUpperCase()}</h1>
            <div class="balance-card" style="border-top: 5px solid ${color}">
                <p>Saldo Disponible</p>
                <div class="amount-big" style="color: ${color}">S/ ${data.total.toFixed(2)}</div>
            </div>

            <div class="balance-card">
                <h3><i class="fas fa-plus-circle"></i> Nueva Operación</h3>
                <div class="form-group">
                    <input type="number" id="val-monto" placeholder="Monto S/">
                    <input type="text" id="val-desc" placeholder="Concepto">
                    <select id="val-tipo">
                        <option value="in">Entrada (+)</option>
                        <option value="out">Salida (-)</option>
                    </select>
                    <button class="btn-save" onclick="registrar('${type}')">Añadir a la Nube</button>
                </div>
            </div>

            <div class="balance-card">
                <h3><i class="fas fa-history"></i> Historial en Tiempo Real</h3>
                <div id="historial-lista">
                    ${data.history.length === 0 ? '<p>Sin movimientos registrados</p>' : renderHistorial(data.history, type)}
                </div>
            </div>
        `;
    }
}

function renderHistorial(lista, tipoModulo) {
    return lista.map((h) => `
        <div class="history-item">
            <div>
                <strong>${h.desc}</strong><br>
                <small>${h.fecha}</small>
            </div>
            <div class="history-actions">
                <span class="${h.op === 'in' ? 'type-in' : 'type-out'}">
                    ${h.op === 'in' ? '+' : '-'} S/ ${h.monto.toFixed(2)}
                </span>
            </div>
        </div>
    `).join('');
}

function initChart() {
    const canvas = document.getElementById('balanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Yape', 'Efectivo'],
            datasets: [{
                data: [appData.yape.total, appData.efectivo.total],
                backgroundColor: ['#478a3e', '#2d5a3c'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}