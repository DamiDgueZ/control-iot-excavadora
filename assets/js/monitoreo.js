const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev'; 
let ws;

const badgeWSS = document.getElementById('badge-wss');
const badgeAPI = document.getElementById('badge-api');
const badgeRDS = document.getElementById('badge-rds');

const movNombre = document.getElementById('mov-nombre');
const movFecha = document.getElementById('mov-fecha');
const movHora = document.getElementById('mov-hora');

const tablaHistorial = document.getElementById('tabla-historial-monitoreo');

const fetchOptions = {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' 
    }
};

async function fetchUltimoEstado() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/estado`, fetchOptions);
        if (res.ok) {
            const data = await res.json();
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
            
            badgeRDS.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeRDS.innerHTML = `<i class="fas fa-database me-1"></i>RDS: Disponible`;

            const data = await res.json();
            const registros = Array.isArray(data) ? data : (data.historial || data.data || data.registros || []);
            
            tablaHistorial.innerHTML = '';

            // FILTRO ESTRICTO: Excluimos comandos internos de pausa o de origen demo de la tabla individual
            const registrosLimpios = registros.filter(mov => {
                const origen = (mov.origen || "").toLowerCase();
                const cmd = (mov.comando || mov.nombre || "").toLowerCase();
                return !origen.includes("demo") && !origen.includes("pausa") && !cmd.includes("apagar_todo");
            });

            if (registrosLimpios.length === 0) {
                tablaHistorial.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Sin registros individuales en RDS</td></tr>`;
                return;
            }

            const ultimos10 = registrosLimpios.slice(0, 10);
            
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

function initMonitoreoWSS() {
    ws = new WebSocket(`wss://${HOST_IP}/ws/vehiculos/1`);

    ws.onopen = () => {
        badgeWSS.className = "badge bg-success p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: En línea`;
    };

    ws.onmessage = (event) => {
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

document.addEventListener('DOMContentLoaded', () => {
    fetchUltimoEstado();
    fetchHistorialMonitoreo();
    initMonitoreoWSS();
});