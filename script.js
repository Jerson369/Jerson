// Credenciales Solicitadas
const AUTH = { user: "admin", pass: "admin123" };

// Datos del Sistema (Cargados desde LocalStorage)
let appData = JSON.parse(localStorage.getItem('sistema_financiero_data')) || {
    yape: { total: 0, history: [] },
    efectivo: { total: 0, history: [] }
};

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === AUTH.user && p === AUTH.pass) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-dashboard').classList.remove('hidden');
        showModule('resumen');
    } else {
        document.getElementById('error-msg').innerText = "Usuario o contraseña incorrectos";
    }
}

function showModule(type) {
    const content = document.getElementById('content-module');
    
    // UI: Activar botón en el menú
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (document.getElementById(`btn-${type}`)) {
        document.getElementById(`btn-${type}`).classList.add('active');
    }

    if (type === 'resumen') {
        const total = appData.yape.total + appData.efectivo.total;
        content.innerHTML = `
            <h1>Resumen General</h1>
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
                    <button class="btn-save" onclick="registrar('${type}')">Añadir</button>
                </div>
            </div>

            <div class="balance-card">
                <h3><i class="fas fa-history"></i> Historial de Movimientos</h3>
                <div id="historial-lista">
                    ${data.history.length === 0 ? '<p>Sin movimientos registrados</p>' : renderHistorial(data.history, type)}
                </div>
            </div>
        `;
    }
}

function registrar(tipo) {
    const monto = parseFloat(document.getElementById('val-monto').value);
    const desc = document.getElementById('val-desc').value;
    const op = document.getElementById('val-tipo').value;

    if (!monto || !desc) return alert("Completa todos los datos");

    if (op === 'in') appData[tipo].total += monto;
    else appData[tipo].total -= monto;

    appData[tipo].history.unshift({ desc, monto, op, fecha: new Date().toLocaleDateString() });
    guardarYRefrescar(tipo);
}

function renderHistorial(lista, tipoModulo) {
    return lista.map((h, index) => `
        <div class="history-item">
            <div>
                <strong>${h.desc}</strong><br>
                <small>${h.fecha}</small>
            </div>
            <div class="history-actions">
                <span class="${h.op === 'in' ? 'type-in' : 'type-out'}">
                    ${h.op === 'in' ? '+' : '-'} S/ ${h.monto.toFixed(2)}
                </span>
                <div class="admin-btns">
                    <button class="btn-edit" onclick="editarRegistro('${tipoModulo}', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="eliminarRegistro('${tipoModulo}', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function eliminarRegistro(tipo, index) {
    if (confirm("¿Eliminar este registro permanentemente?")) {
        const reg = appData[tipo].history[index];
        if (reg.op === 'in') appData[tipo].total -= reg.monto;
        else appData[tipo].total += reg.monto;
        appData[tipo].history.splice(index, 1);
        guardarYRefrescar(tipo);
    }
}

function editarRegistro(tipo, index) {
    const reg = appData[tipo].history[index];
    const nDesc = prompt("Nueva descripción:", reg.desc);
    const nMonto = parseFloat(prompt("Nuevo monto S/:", reg.monto));

    if (nDesc && !isNaN(nMonto)) {
        if (reg.op === 'in') appData[tipo].total -= reg.monto;
        else appData[tipo].total += reg.monto;

        reg.desc = nDesc;
        reg.monto = nMonto;

        if (reg.op === 'in') appData[tipo].total += reg.monto;
        else appData[tipo].total -= reg.monto;

        guardarYRefrescar(tipo);
    }
}

function initChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
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

function guardarYRefrescar(tipo) {
    localStorage.setItem('sistema_financiero_data', JSON.stringify(appData));
    showModule(tipo);
}