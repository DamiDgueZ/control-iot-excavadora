const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
let ws = null;
let reconexionTimer = null;
let idVehiculoMonitoreo = null;
let inicializadoMonitoreo = false;

const badgeWSS = document.getElementById('badge-wss');
const badgeAPI = document.getElementById('badge-api');
const badgeRDS = document.getElementById('badge-rds');

const movNombre = document.getElementById('mov-nombre');
const movVehiculo = document.getElementById('mov-vehiculo');
const movFecha = document.getElementById('mov-fecha');
const movHora = document.getElementById('mov-hora');

const tablaHistorial = document.getElementById('tabla-historial-monitoreo');

async function fetchUltimoEstado() {
    if (!idVehiculoMonitoreo) return;
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoMonitoreo}/estado`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const data = await res.json();

            const listaEstados = data.estado || data.data || [];
            const objEstado = Array.isArray(listaEstados) ? listaEstados[0] : listaEstados;

            if (objEstado && movNombre && movFecha && movHora) {
                const nombreCmd = objEstado.comando || objEstado.nombre || objEstado.nombre_comando || 'DESCONOCIDO';
                const nombreVeh = objEstado.vehiculo ? ` · ${objEstado.vehiculo}` : '';
                if (movVehiculo) {
                    movVehiculo.textContent = `Vehículo ID: #${idVehiculoMonitoreo}${nombreVeh}`;
                }

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

async function fetchHistorialMonitoreo() {
    if (!idVehiculoMonitoreo) return;
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoMonitoreo}/historial`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            if (badgeAPI) {
                badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
                badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: Disponible`;
            }

            if (badgeRDS) {
                badgeRDS.className = "badge bg-success p-2 fs-6 shadow-sm";
                badgeRDS.innerHTML = `<i class="fas fa-database me-1"></i>RDS: Disponible`;
            }

            const data = await res.json();
            const registros = Array.isArray(data) ? data : (data.historial || data.data || data.registros || []);

            if (tablaHistorial) {
                tablaHistorial.innerHTML = '';

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

                const ultimos10 = registrosLimpios.slice(0, 10);

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
                        tr.innerHTML = `
                            <th scope="row" class="text-muted opacity-50">${numeroFila}</th>
                            <td class="text-muted opacity-50 fst-italic">---</td>
                            <td class="text-muted opacity-50">--/--/----</td>
                            <td class="text-muted opacity-50">--:--:--</td>
                        `;
                    }
                    tablaHistorial.appendChild(tr);
                }
            }

        } else if (badgeAPI) {
            badgeAPI.className = "badge bg-danger p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: Fallo HTTP ${res.status}`;
        }
    } catch (error) {
        console.error("Error al cargar historial RDS:", error);
        if (badgeAPI) {
            badgeAPI.className = "badge bg-danger p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: No disponible`;
        }
        if (tablaHistorial) {
            tablaHistorial.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error de conexión al Servidor</td></tr>`;
        }
    }
}

function initMonitoreoWSS() {
    if (!idVehiculoMonitoreo) return;

    if (reconexionTimer) {
        clearTimeout(reconexionTimer);
        reconexionTimer = null;
    }

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
            ws.onclose = null;
            ws.close();
        } catch (_) {}
    }

    ws = new WebSocket(`wss://${HOST_IP}/ws/vehiculos/${idVehiculoMonitoreo}`);

    ws.onopen = () => {
        if (badgeWSS) {
            badgeWSS.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: En línea`;
        }
    };

    ws.onmessage = () => {
        setTimeout(() => {
            fetchUltimoEstado();
            fetchHistorialMonitoreo();
        }, 500);
    };

    ws.onclose = () => {
        if (badgeWSS) {
            badgeWSS.className = "badge bg-warning text-dark p-2 fs-6 shadow-sm";
            badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Reconectando...`;
        }
        reconexionTimer = setTimeout(initMonitoreoWSS, 3000);
    };

    ws.onerror = () => {
        if (badgeWSS) {
            badgeWSS.className = "badge bg-danger p-2 fs-6 shadow-sm";
            badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Desconectado`;
        }
    };
}

function arrancarMonitoreoParaVehiculo(idVehiculo) {
    if (!idVehiculo || inicializadoMonitoreo) return;
    inicializadoMonitoreo = true;
    idVehiculoMonitoreo = parseInt(idVehiculo, 10);

    if (movVehiculo) {
        movVehiculo.textContent = `Vehículo ID: #${idVehiculoMonitoreo}`;
    }

    fetchUltimoEstado();
    fetchHistorialMonitoreo();
    initMonitoreoWSS();
}

window.addEventListener('vehiculoAutorizadoListo', (ev) => {
    const id = ev.detail?.idVehiculo || window.VEHICULO_ID_AUTORIZADO;
    arrancarMonitoreoParaVehiculo(id);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.VEHICULO_ID_AUTORIZADO && !inicializadoMonitoreo) {
            arrancarMonitoreoParaVehiculo(window.VEHICULO_ID_AUTORIZADO);
        }
    }, 300);
});