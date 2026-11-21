const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
let sistemaEncendido = false;
let estadoLuces = false;
let estadoClaxon = false;
let ws = null;
let reconexionTimer = null;
let demoTimeout = null;
let idVehiculoActivo = null;
let mapaComandos = {};
let inicializadoControl = false;

const badgeWSS = document.getElementById('badge-wss');
const badgeAPI = document.getElementById('badge-api');
const badgeRDS = document.getElementById('badge-rds');

function actualizarEtiqueta(elemento, texto, claseColor) {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.className = `mt-3 badge ${claseColor} px-4 py-2 fs-6 shadow-sm rounded-pill`;
}

function resolverIdComando(claveLogica, codigoFallback) {
    if (mapaComandos[claveLogica]) {
        return mapaComandos[claveLogica];
    }
    return codigoFallback;
}

async function cargarComandosDelVehiculo(idVehiculo) {
    mapaComandos = {};
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculo}/comandos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        const comandos = Array.isArray(data) ? data : (data.comandos || []);

        for (const cmd of comandos) {
            if (cmd.activo === false || cmd.activo === 0) continue;
            const nombreUpper = (cmd.nombre || '').toUpperCase().trim();
            const codigo = parseInt(cmd.codigo, 10);
            const idCmd = parseInt(cmd.id_comando, 10);

            if (nombreUpper.includes('ADELANTE') || nombreUpper.includes('AVANZAR') || codigo === 2) {
                mapaComandos.ADELANTE = idCmd;
            } else if (nombreUpper.includes('ATRAS') || nombreUpper.includes('RETROCEDER') || codigo === 1) {
                mapaComandos.ATRAS = idCmd;
            } else if (nombreUpper.includes('GIRO_IZQUIERDA') || nombreUpper.includes('GIRAR_IZQUIERDA') || codigo === 3) {
                mapaComandos.GIRO_IZQUIERDA = idCmd;
            } else if (nombreUpper.includes('GIRO_DERECHA') || nombreUpper.includes('GIRAR_DERECHA') || codigo === 4) {
                mapaComandos.GIRO_DERECHA = idCmd;
            } else if (nombreUpper.includes('ENCENDIDO') || codigo === 5) {
                mapaComandos.ENCENDIDO = idCmd;
            } else if (nombreUpper.includes('LUZ') || codigo === 7) {
                mapaComandos.LUZ = idCmd;
            } else if (nombreUpper.includes('SONIDO') || nombreUpper.includes('CLAXON') || codigo === 8) {
                mapaComandos.SONIDO = idCmd;
            } else if (nombreUpper.includes('GARRA_ARRIBA') || nombreUpper.includes('SUBIR_BRAZO') || codigo === 9) {
                mapaComandos.GARRA_ARRIBA = idCmd;
            } else if (nombreUpper.includes('GARRA_ABAJO') || nombreUpper.includes('BAJAR_BRAZO') || codigo === 10) {
                mapaComandos.GARRA_ABAJO = idCmd;
            } else if (nombreUpper === 'DERECHA' || nombreUpper.includes('DERECHA AUX') || codigo === 11) {
                mapaComandos.DERECHA = idCmd;
            } else if (nombreUpper === 'IZQUIERDA' || nombreUpper.includes('IZQUIERDA AUX') || codigo === 12) {
                mapaComandos.IZQUIERDA = idCmd;
            } else if (nombreUpper.includes('APAGAR') || nombreUpper.includes('DETENER') || codigo === 13) {
                mapaComandos.DETENER = idCmd;
            }
        }
    } catch (e) {
        console.warn('No se pudieron cargar comandos dinámicos, usando respaldo:', e);
    }
}

async function cargarDemosDelVehiculo(idVehiculo) {
    const selectDemo = document.getElementById('select-demo');
    const inputDemo = document.getElementById('input-demo');
    if (!selectDemo) return;

    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculo}/demos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('No se pudieron cargar demos');
        const data = await res.json();
        const demos = Array.isArray(data) ? data : (data.demos || []);

        if (demos.length === 0) {
            selectDemo.innerHTML = '<option value="">Sin demos en este vehículo</option>';
            return;
        }

        selectDemo.innerHTML = '<option value="">Selecciona una demo...</option>' + demos.map(d => {
            const idD = d.id_demo || d.id;
            const nombreD = d.nombre || d.descripcion || `Demo #${idD}`;
            return `<option value="${idD}">#${idD} — ${nombreD}</option>`;
        }).join('');

        selectDemo.addEventListener('change', () => {
            if (selectDemo.value && inputDemo) {
                inputDemo.value = selectDemo.value;
            }
        }, { once: true });

        const primerId = demos[0].id_demo || demos[0].id;
        selectDemo.value = String(primerId);
        if (inputDemo && !inputDemo.value) {
            inputDemo.value = String(primerId);
        }
    } catch (e) {
        selectDemo.innerHTML = '<option value="">Error al cargar demos</option>';
    }
}

function initJoysticks() {
    const lblIzq = document.getElementById('lbl-izq');
    const lblDer = document.getElementById('lbl-der');

    const joyIzq = nipplejs.create({
        zone: document.getElementById('joystick-izq'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#0dcaf0',
        size: 110
    });

    joyIzq.on('dir:up', () => {
        enviarComandoWS(resolverIdComando('ADELANTE', 2));
        actualizarEtiqueta(lblIzq, '↑ ADELANTE', 'bg-info text-dark');
    });
    joyIzq.on('dir:down', () => {
        enviarComandoWS(resolverIdComando('ATRAS', 1));
        actualizarEtiqueta(lblIzq, '↓ ATRÁS', 'bg-info text-dark');
    });
    joyIzq.on('dir:left', () => {
        enviarComandoWS(resolverIdComando('GIRO_IZQUIERDA', 3));
        actualizarEtiqueta(lblIzq, '← GIRO IZQ', 'bg-info text-dark');
    });
    joyIzq.on('dir:right', () => {
        enviarComandoWS(resolverIdComando('GIRO_DERECHA', 4));
        actualizarEtiqueta(lblIzq, '→ GIRO DER', 'bg-info text-dark');
    });
    joyIzq.on('end', () => {
        enviarComandoWS(resolverIdComando('DETENER', 13));
        actualizarEtiqueta(lblIzq, 'DETENIDO', 'bg-secondary');
    });

    const joyDer = nipplejs.create({
        zone: document.getElementById('joystick-der'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#ffc107',
        size: 110
    });

    joyDer.on('dir:up', () => {
        enviarComandoWS(resolverIdComando('GARRA_ARRIBA', 9));
        actualizarEtiqueta(lblDer, '↑ SUBIR BRAZO', 'bg-warning text-dark');
    });
    joyDer.on('dir:down', () => {
        enviarComandoWS(resolverIdComando('GARRA_ABAJO', 10));
        actualizarEtiqueta(lblDer, '↓ BAJAR BRAZO', 'bg-warning text-dark');
    });
    joyDer.on('dir:left', () => {
        enviarComandoWS(resolverIdComando('IZQUIERDA', 12));
        actualizarEtiqueta(lblDer, '← ROTAR IZQ', 'bg-warning text-dark');
    });
    joyDer.on('dir:right', () => {
        enviarComandoWS(resolverIdComando('DERECHA', 11));
        actualizarEtiqueta(lblDer, '→ ROTAR DER', 'bg-warning text-dark');
    });
    joyDer.on('end', () => {
        enviarComandoWS(resolverIdComando('DETENER', 13));
        actualizarEtiqueta(lblDer, 'DETENIDO', 'bg-secondary');
    });
}

function initWebSocket() {
    if (!idVehiculoActivo) return;

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

    ws = new WebSocket(`wss://${HOST_IP}/ws/vehiculos/${idVehiculoActivo}`);

    ws.onopen = () => {
        if (badgeWSS) {
            badgeWSS.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Conectado`;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const eventoStr = (data.evento || "").toLowerCase();
            const origenStr = (data.origen || "").toLowerCase();

            setTimeout(obtenerUltimoEstadoControl, 300);

            if (eventoStr.includes("inicio_demo") || eventoStr === "inicio_demo") {
                mostrarIndicadorDemo(true);
            }

            if (origenStr === "fin demo" || eventoStr.includes("fin_demo")) {
                mostrarIndicadorDemo(false);
            }
        } catch (e) {
            console.error("No se pudo parsear el mensaje WSS", e);
        }
    };

    ws.onclose = () => {
        if (badgeWSS) {
            badgeWSS.className = "badge bg-danger p-2 fs-6 shadow-sm";
            badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Error`;
        }
        reconexionTimer = setTimeout(initWebSocket, 3000);
    };
}

function enviarComandoWS(idComando) {
    if (!idVehiculoActivo) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            id_comando: parseInt(idComando, 10),
            origen: "Joystick WSS"
        }));
        setTimeout(obtenerUltimoEstadoControl, 400);
    }
}

function mostrarIndicadorDemo(activo) {
    const badge = document.getElementById('badge-demo');
    if (badge) {
        if (activo) {
            badge.classList.remove('d-none');
            if (demoTimeout) clearTimeout(demoTimeout);
            demoTimeout = setTimeout(() => {
                badge.classList.add('d-none');
            }, 25000);
        } else {
            badge.classList.add('d-none');
            if (demoTimeout) clearTimeout(demoTimeout);
        }
    }
}

function forzarParo() {
    const idDetener = resolverIdComando('DETENER', 13);
    enviarComandoWS(idDetener);
    enviarComandoREST(idDetener);
    actualizarEtiqueta(document.getElementById('lbl-izq'), 'DETENIDO', 'bg-secondary');
    const lblDer = document.getElementById('lbl-der');
    if (lblDer) actualizarEtiqueta(lblDer, 'DETENIDO', 'bg-secondary');
    mostrarIndicadorDemo(false);
}

async function enviarComandoREST(idComando) {
    if (!idVehiculoActivo) return;
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoActivo}/mover`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_comando: parseInt(idComando, 10),
                origen: "Control Web REST"
            })
        });
        if (res.ok) {
            if (badgeAPI) {
                badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
                badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: OK`;
            }
            setTimeout(obtenerUltimoEstadoControl, 400);
        }
    } catch (error) {
        console.error("Error REST:", error);
    }
}

async function obtenerUltimoEstadoControl() {
    if (!idVehiculoActivo) return;
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoActivo}/estado`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const data = await res.json();

            const listaEstados = data.estado || data.data || [];
            const objEstado = Array.isArray(listaEstados) ? listaEstados[0] : listaEstados;

            const elemMov = document.getElementById('ctrl-ultimo-mov');
            const elemTiempo = document.getElementById('ctrl-ultimo-tiempo');

            if (objEstado && elemMov && elemTiempo) {
                const nombreCmd = objEstado.comando || objEstado.nombre || 'SIN MOVIMIENTO';
                let fechaRaw = objEstado.fecha_actualizacion || objEstado.fecha_hora || new Date().toISOString();

                if (typeof fechaRaw === 'string' && !fechaRaw.endsWith('Z') && !fechaRaw.includes('+') && !fechaRaw.includes('-', 10)) {
                    fechaRaw += 'Z';
                }

                let horaFormateada = fechaRaw;
                const dateObj = new Date(fechaRaw);

                if (!isNaN(dateObj.getTime())) {
                    horaFormateada = dateObj.toLocaleTimeString('es-MX', {
                        timeZone: 'America/Mexico_City',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    });
                }

                elemMov.textContent = nombreCmd;
                elemTiempo.textContent = horaFormateada;
            }
        }
    } catch (e) {
        console.error("Error al refrescar estado en control:", e);
    }
}

function toggleLuces() {
    estadoLuces = !estadoLuces;
    const btnLuces = document.getElementById('btn-luces');
    if (btnLuces) {
        if (estadoLuces) {
            btnLuces.classList.replace('btn-outline-warning', 'btn-warning');
            btnLuces.style.background = "linear-gradient(135deg, #ffc107, #d39e00)";
            btnLuces.style.color = "#000";
            btnLuces.style.borderColor = "#ffc107";
        } else {
            btnLuces.classList.replace('btn-warning', 'btn-outline-warning');
            btnLuces.style.background = "transparent";
            btnLuces.style.color = "#ffc107";
            btnLuces.style.borderColor = "";
        }
    }
    enviarComandoREST(resolverIdComando('LUZ', 7));
}

function toggleClaxon() {
    estadoClaxon = !estadoClaxon;
    const btnClaxon = document.getElementById('btn-claxon');
    if (btnClaxon) {
        if (estadoClaxon) {
            btnClaxon.classList.replace('btn-outline-info', 'btn-info');
            btnClaxon.style.background = "linear-gradient(135deg, #0dcaf0, #087990)";
            btnClaxon.style.color = "#000";
            btnClaxon.style.borderColor = "#0dcaf0";
        } else {
            btnClaxon.classList.replace('btn-info', 'btn-outline-info');
            btnClaxon.style.background = "transparent";
            btnClaxon.style.color = "#0dcaf0";
            btnClaxon.style.borderColor = "";
        }
    }
    enviarComandoREST(resolverIdComando('SONIDO', 8));
}

function ejecutarDemoSeleccionada() {
    const selectDemo = document.getElementById('select-demo');
    const input = document.getElementById('input-demo');
    const rawVal = (input && input.value) ? input.value : (selectDemo ? selectDemo.value : '');
    const idDemo = parseInt(rawVal, 10);

    if (!isNaN(idDemo) && idDemo > 0) {
        ejecutarDemo(idDemo);
    } else {
        alert("Por favor, selecciona o ingresa un número de Demo válido.");
    }
}

async function ejecutarDemo(idDemo) {
    if (!idVehiculoActivo) return;
    try {
        mostrarIndicadorDemo(true);
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoActivo}/ejecutar-demo`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_demo: parseInt(idDemo, 10) })
        });

        if (!res.ok) {
            mostrarIndicadorDemo(false);
            alert("No se pudo iniciar la demo seleccionada en este vehículo.");
        }
    } catch (error) {
        console.error("Error al iniciar demo", error);
        mostrarIndicadorDemo(false);
    }
}

function toggleEncendido() {
    sistemaEncendido = !sistemaEncendido;
    const btn = document.getElementById('btn-encendido');
    if (btn) {
        if (sistemaEncendido) {
            btn.classList.replace('btn-danger', 'btn-success');
            btn.style.background = "linear-gradient(135deg, #198754, #146c43)";
        } else {
            btn.classList.replace('btn-success', 'btn-danger');
            btn.style.background = "linear-gradient(135deg, #dc3545, #a71d2a)";
        }
    }
    enviarComandoREST(resolverIdComando('ENCENDIDO', 5));
}

async function verificarSaludAPI() {
    if (!idVehiculoActivo) return;
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/${idVehiculoActivo}/historial`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            if (badgeAPI) {
                badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
                badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: OK`;
            }
            if (badgeRDS) {
                badgeRDS.className = "badge bg-success p-2 fs-6 shadow-sm";
                badgeRDS.innerHTML = `<i class="fas fa-database me-1"></i>RDS: Online`;
            }
        }
    } catch (error) {
        console.error("No se pudo conectar al historial al inicio:", error);
    }
}

async function arrancarControlParaVehiculo(idVehiculo) {
    if (!idVehiculo || inicializadoControl) return;
    inicializadoControl = true;
    idVehiculoActivo = parseInt(idVehiculo, 10);

    const badgeVeh = document.getElementById('ctrl-vehiculo-badge');
    if (badgeVeh) {
        badgeVeh.innerHTML = `<i class="fas fa-microchip me-1"></i>Vehículo ID: #${idVehiculoActivo}`;
    }

    initJoysticks();
    await cargarComandosDelVehiculo(idVehiculoActivo);
    await cargarDemosDelVehiculo(idVehiculoActivo);
    initWebSocket();
    verificarSaludAPI();
    obtenerUltimoEstadoControl();
}

window.addEventListener('vehiculoAutorizadoListo', (ev) => {
    const id = ev.detail?.idVehiculo || window.VEHICULO_ID_AUTORIZADO;
    arrancarControlParaVehiculo(id);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.VEHICULO_ID_AUTORIZADO && !inicializadoControl) {
            arrancarControlParaVehiculo(window.VEHICULO_ID_AUTORIZADO);
        }
    }, 300);
});