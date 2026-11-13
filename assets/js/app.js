const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
let sistemaEncendido = false;
let estadoLuces = false;   
let estadoClaxon = false;  
let ws;
let demoTimeout = null; 

const badgeWSS = document.getElementById('badge-wss');
const badgeAPI = document.getElementById('badge-api');
const badgeRDS = document.getElementById('badge-rds');

function actualizarEtiqueta(elemento, texto, claseColor) {
    elemento.textContent = texto;
    elemento.className = `mt-3 badge ${claseColor} px-4 py-2 fs-6 shadow-sm rounded-pill`;
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

    joyIzq.on('dir:up', () => { enviarComandoWS(2); actualizarEtiqueta(lblIzq, '↑ ADELANTE', 'bg-info text-dark'); });
    joyIzq.on('dir:down', () => { enviarComandoWS(1); actualizarEtiqueta(lblIzq, '↓ ATRÁS', 'bg-info text-dark'); });
    joyIzq.on('dir:left', () => { enviarComandoWS(3); actualizarEtiqueta(lblIzq, '← GIRO IZQ', 'bg-info text-dark'); });
    joyIzq.on('dir:right', () => { enviarComandoWS(4); actualizarEtiqueta(lblIzq, '→ GIRO DER', 'bg-info text-dark'); });
    joyIzq.on('end', () => { enviarComandoWS(13); actualizarEtiqueta(lblIzq, 'DETENIDO', 'bg-secondary'); });

    const joyDer = nipplejs.create({
        zone: document.getElementById('joystick-der'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#ffc107',
        size: 110
    });

    joyDer.on('dir:up', () => { enviarComandoWS(9); actualizarEtiqueta(lblDer, '↑ SUBIR BRAZO', 'bg-warning text-dark'); });
    joyDer.on('dir:down', () => { enviarComandoWS(10); actualizarEtiqueta(lblDer, '↓ BAJAR BRAZO', 'bg-warning text-dark'); });
    joyDer.on('dir:left', () => { enviarComandoWS(12); actualizarEtiqueta(lblDer, '← ROTAR IZQ', 'bg-warning text-dark'); });
    joyDer.on('dir:right', () => { enviarComandoWS(11); actualizarEtiqueta(lblDer, '→ ROTAR DER', 'bg-warning text-dark'); });
    joyDer.on('end', () => { enviarComandoWS(13); actualizarEtiqueta(lblDer, 'DETENIDO', 'bg-secondary'); });
}

function initWebSocket() {
    ws = new WebSocket(`wss://${HOST_IP}/ws/vehiculos/1`);

    ws.onopen = () => {
        badgeWSS.className = "badge bg-success p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Conectado`;
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
        badgeWSS.className = "badge bg-danger p-2 fs-6 shadow-sm";
        badgeWSS.innerHTML = `<i class="fas fa-plug me-1"></i>WSS: Error`;
        setTimeout(initWebSocket, 3000);
    };
}

function enviarComandoWS(idComando) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            id_comando: parseInt(idComando),
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
    enviarComandoWS(13);
    enviarComandoREST(13); 
    actualizarEtiqueta(document.getElementById('lbl-izq'), 'DETENIDO', 'bg-secondary');
    const lblDer = document.getElementById('lbl-der');
    if(lblDer) actualizarEtiqueta(lblDer, 'DETENIDO', 'bg-secondary');
    mostrarIndicadorDemo(false);
}

async function enviarComandoREST(idComando) {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/mover`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                id_comando: parseInt(idComando),
                origen: "Control Web REST"
            })
        });
        if(res.ok) {
            badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: OK`;
            setTimeout(obtenerUltimoEstadoControl, 400);
        }
    } catch (error) {
        console.error("Error REST:", error);
    }
}

// LECTURA DE ESTADO CON HORA AJUSTADA A LA ZONA HORARIA DE LA CIUDAD DE MÉXICO
async function obtenerUltimoEstadoControl() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/estado`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
            const data = await res.json();
            
            const listaEstados = data.estado || data.data || [];
            const objEstado = Array.isArray(listaEstados) ? listaEstados[0] : listaEstados;

            const elemMov = document.getElementById('ctrl-ultimo-mov');
            const elemTiempo = document.getElementById('ctrl-ultimo-tiempo');

            if (objEstado && elemMov && elemTiempo) {
                const nombreCmd = objEstado.comando || objEstado.nombre || 'SIN MOVIMIENTO';
                const fechaRaw = objEstado.fecha_actualizacion || objEstado.fecha_hora || new Date().toISOString();
                
                let horaFormateada = fechaRaw;
                const dateObj = new Date(fechaRaw);
                
                if (!isNaN(dateObj.getTime())) {
                    // Forzamos la zona horaria exacta de la CDMX
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

// TUS BOTONES DE LUCES Y CLAXON (INTACTOS Y FUNCIONANDO)
function toggleLuces() {
    estadoLuces = !estadoLuces;
    const btnLuces = document.getElementById('btn-luces');
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
    enviarComandoREST(7);
}

function toggleClaxon() {
    estadoClaxon = !estadoClaxon;
    const btnClaxon = document.getElementById('btn-claxon');
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
    enviarComandoREST(8);
}

function ejecutarDemoSeleccionada() {
    const input = document.getElementById('input-demo');
    if (!input) return;
    const idDemo = parseInt(input.value);
    
    if (!isNaN(idDemo) && idDemo > 0) {
        ejecutarDemo(idDemo);
    } else {
        alert("Por favor, ingresa un número de Demo válido (ej. 1)");
    }
}

async function ejecutarDemo(idDemo) {
    try {
        mostrarIndicadorDemo(true);
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/ejecutar-demo`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ id_demo: parseInt(idDemo) })
        });
        
        if(!res.ok) {
            mostrarIndicadorDemo(false);
        }
    } catch (error) {
        console.error("Error al iniciar demo", error);
        mostrarIndicadorDemo(false);
    }
}

function toggleEncendido() {
    sistemaEncendido = !sistemaEncendido;
    const btn = document.getElementById('btn-encendido');
    if (sistemaEncendido) {
        btn.classList.replace('btn-danger', 'btn-success');
        btn.style.background = "linear-gradient(135deg, #198754, #146c43)";
    } else {
        btn.classList.replace('btn-success', 'btn-danger');
        btn.style.background = "linear-gradient(135deg, #dc3545, #a71d2a)";
    }
    enviarComandoREST(5);
}

async function verificarSaludAPI() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/historial`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
        });
        if(res.ok) {
            badgeAPI.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeAPI.innerHTML = `<i class="fas fa-server me-1"></i>API: OK`;
            
            badgeRDS.className = "badge bg-success p-2 fs-6 shadow-sm";
            badgeRDS.innerHTML = `<i class="fas fa-database me-1"></i>RDS: Online`;
        }
    } catch (error) {
        console.error("No se pudo conectar al historial al inicio:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initJoysticks();
    initWebSocket();
    verificarSaludAPI();
    obtenerUltimoEstadoControl();
});