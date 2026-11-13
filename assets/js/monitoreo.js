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

// FUNCIÓN PARA OBTENER EL ÚLTIMO ESTADO (CON HORA CDMX)
async function fetchUltimoEstado() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/estado`, fetchOptions);
        if (res.ok) {
            const data = await res.json();
            
            const listaEstados = data.estado || data.data || [];
            const objEstado = Array.isArray(listaEstados) ? listaEstados[0] : listaEstados;

            if (objEstado && movNombre && movFecha && movHora) {
                const nombreCmd = objEstado.comando || objEstado.nombre || objEstado.nombre_comando || 'DESCONOCIDO';
                let fechaRaw = objEstado.fecha_actualizacion || objEstado.fecha_hora || objEstado.fecha || new Date().toISOString();
                
                if (typeof fechaRaw === 'string' && !fechaRaw.endsWith('Z') && !fechaRaw.includes('+') && !fechaRaw.includes('-', 10)) {
                    fechaRaw += 'Z';
                }

                const dateObj = new Date(fechaRaw);
                
                if (!isNaN(dateObj.getTime())) {
                    movFecha.textContent = dateObj.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
                    movHora.textContent = dateObj.toLocaleTimeString('es-MX', {
                        timeZone: 'America/Mexico_City',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    });
                } else {
                    movFecha.textContent = "--/--/----";
                    movHora.textContent = "--:--:--";
                }

                movNombre.textContent = nombreCmd;
            }
        }
    } catch (error) {
        console.error("Error al obtener último estado:", error);
    }
}

// HISTORIAL DE MONITOREO CON FILTRO BLINDADO Y LLENADO EXACTO DE 10 FILAS
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

            // FILTRO BLINDADO: Solo descartamos pausas explícitas o comandos de origen demo
            const registrosLimpios = registros.filter(mov => {
                const origen = (mov.origen || "").toLowerCase();
                const cmd = (mov.comando || mov.nombre_comando || mov.nombre || "").toLowerCase();
                
                if (origen.includes("demo") || origen.includes("pausa")) return false;
                if (cmd === "apagar_todo" || cmd.includes("apagar todo")) return false;
                
                return true;
            });

            if (registrosLimpios.length === 0) {
                tablaHistorial.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Sin registros individuales en RDS</td></tr>`;
                return;
            }

            // Tomamos estrictamente los primeros 10 elementos válidos
            const ultimos10 = registrosLimpios.slice(0, 10);
            
            // Creamos exactamente 10 filas de forma simétrica
            for (let i = 0; i < 10; i++) {
                const tr = document.createElement('tr');
                const numeroFila = i + 1;

                if (i < ultimos10.length) {
                    const mov = ultimos10[i];
                    const nombreCmd = mov.comando || mov.nombre_comando || mov.nombre || `Cód: ${mov.id_comando || 'N/D'}`;
                    let fechaRaw = mov.fecha_hora || mov.fecha || mov.timestamp || mov.created_at;
                    
                    if (typeof fechaRaw === 'string' && !fechaRaw.endsWith('Z') && !fechaRaw.includes('+') && !fechaRaw.includes('-', 10)) {
                        fechaRaw += 'Z';
                    }

                    const dateObj = fechaRaw ? new Date(fechaRaw) : new Date();
                    let fechaStr = "--/--/----";
                    let horaStr = "--:--:--";

                    if (!isNaN(dateObj.getTime())) {
                        fechaStr = dateObj.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
                        horaStr = dateObj.toLocaleTimeString('es-MX', {
                            timeZone: 'America/Mexico_City',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        });
                    }

                    tr.innerHTML = `
                        <th scope="row" class="text-secondary">${numeroFila}</th>
                        <td class="fw-bold text-light">${nombreCmd}</td>
                        <td>${fechaStr}</td>
                        <td>${horaStr}</td>
                    `;
                } else {
                    // Fila vacía de relleno si llegaran a faltar elementos
                    tr.innerHTML = `
                        <th scope="row" class="text-muted opacity-50">${numeroFila}</th>
                        <td class="text-muted opacity-50 fst-italic">---</td>
                        <td class="text-muted opacity-50">--/--/----</td>
                        <td class="text-muted opacity-50">--:--:--</td>
                    `;
                }
                tablaHistorial.appendChild(tr);
            }

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