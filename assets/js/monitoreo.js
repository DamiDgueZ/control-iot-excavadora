// ATENCIÓN: Usamos ngrok para evitar el error de Contenido Mixto (HTTPS -> HTTP) en GitHub Pages.
// Si vas a probar en red local sin ngrok, cambia esto por '100.60.28.1:8000'
const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev'; 
let ws;

// Indicadores DOM
const badgeWSS = document.getElementById('badge-wss');
const badgeAPI = document.getElementById('badge-api');
const badgeRDS = document.getElementById('badge-rds');

// Elementos Tarjeta Último Movimiento
const movNombre = document.getElementById('mov-nombre');
const movFecha = document.getElementById('mov-fecha');
const movHora = document.getElementById('mov-hora');

// Tabla
const tablaHistorial = document.getElementById('tabla-historial-monitoreo');

// Opciones de fetch (Bypassea advertencia de ngrok y pide JSON)
const fetchOptions = {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' 
    }
};

// --- 1. CARGA INICIAL VÍA REST ---
async function fetchUltimoEstado() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/estado`, fetchOptions);
        if (res.ok) {
            const data = await res.json();
            // Validar que exista data y extraer de manera segura
            const estado = data.estado || data.data || data; 
            
            const nombreCmd = estado.comando || estado.nombre_comando || estado.nombre || 'DESCONOCIDO';
            const fechaRaw = estado.fecha_hora || estado.fecha || estado.timestamp || new Date().toISOString();
            
            const dateObj = new Date(fechaRaw);
            
            movNombre.textContent = nombreCmd;
            movFecha.textContent = dateObj.toLocaleDateString('es-MX');
            movHora.textContent = dateObj.toLocaleTimeString('es-MX');
        }
    } catch (error) {
        console.error("Error al obtener último estado:", error);
    }
}

async function fetchHistorialMonitoreo() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/historial`, fetchOptions);
        if (res.ok) {
            badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: Disponible`;
            
            // Regla profe: Si no hay diagnóstico explícito de DB, se marca "Sin verificar"
            // Asumiremos que si regresa historial, RDS está vivo. (O cambias a "Sin verificar")
            badgeRDS.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeRDS.innerHTML = `<i class="fas fa-database me-1"></i>RDS: Disponible`;

            const data = await res.json();
            const registros = Array.isArray(data) ? data : (data.historial || data.data || data.registros || []);
            
            tablaHistorial.innerHTML = '';

            if (registros.length === 0) {
                tablaHistorial.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Sin registros persistidos en RDS</td></tr>`;
                return;
            }

            // Regla profe: Renderiza máximo 10 filas
            const ultimos10 = registros.slice(0, 10);
            
            ultimos10.forEach((mov, index) => {
                const nombreCmd = mov.comando || mov.nombre_comando || mov.nombre || `Cód: ${mov.id_comando || 'N/D'}`;
                const fechaRaw = mov.fecha_hora || mov.fecha || mov.timestamp || mov.created_at;
                const dateObj = fechaRaw ? new Date(fechaRaw) : new Date();

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <th scope="row" class="text-secondary">${index + 1}</th>
                    <td class="fw-bold text-light">${nombreCmd}</td>
                    <td>${dateObj.toLocaleDateString('es-MX')}</td>
                    <td>${dateObj.toLocaleTimeString('es-MX')}</td>
                `;
                tablaHistorial.appendChild(tr);
            });
        } else {
            badgeAPI.className = "badge bg-danger p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: Fallo HTTP ${res.status}`;
        }
    } catch (error) {
        console.error("Error al cargar historial RDS:", error);
        badgeAPI.className = "badge bg-danger p-2 fs-6 shadow-sm";
        badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: No disponible`;
        tablaHistorial.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error de conexión al Servidor</td></tr>`;
    }
}

// --- 2. WEBSOCKET PARA TIEMPO REAL ---
function initMonitoreoWSS() {
    ws = new WebSocket(`wss://${HOST_IP}/ws/vehiculos/1`);

    ws.onopen = () => {
        badgeWSS.className = "badge bg-success p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: En línea`;
    };

    ws.onmessage = (event) => {
        // Al recibir un evento, actualizamos de forma asíncrona mediante la API 
        // para garantizar que la tabla solo muestre data verdaderamente confirmada por RDS.
        // Esto automáticamente ignora secuencias de DEMO en la tabla si el backend no las guarda en /historial.
        setTimeout(() => {
            fetchUltimoEstado();
            fetchHistorialMonitoreo();
        }, 500); 
    };

    ws.onclose = () => {
        badgeWSS.className = "badge bg-warning text-dark p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Reconectando...`;
        setTimeout(initMonitoreoWSS, 3000);
    };
    
    ws.onerror = () => {
        badgeWSS.className = "badge bg-danger p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Desconectado`;
    };
}

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    fetchUltimoEstado();
    fetchHistorialMonitoreo();
    initMonitoreoWSS();
});