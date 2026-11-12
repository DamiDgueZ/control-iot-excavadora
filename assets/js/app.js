const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
let sistemaEncendido = false;
let ws;

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
        size: 130
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
        size: 130
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
            const origenStr = data.origen || "";
            const idCmd = parseInt(data.id_comando);
            const comandoStr = (data.comando || "").toUpperCase();

            // 1. Detectar inicio de Demo Automática
            if (eventoStr.includes("inicio_demo") || origenStr === "Demo Automática") {
                mostrarIndicadorDemo(true);
                
                // 2. Apagar la alerta si la Demo lanza el comando "APAGAR_TODO" (ID 13) al terminar
                if (idCmd === 13 || comandoStr === "APAGAR_TODO") {
                    setTimeout(() => {
                        mostrarIndicadorDemo(false);
                    }, 1000);
                }
            }
            
            // 3. Apagado genérico si detectamos palabras clave de fin en el evento
            if (eventoStr.includes("fin") || eventoStr.includes("cancel") || eventoStr.includes("completada")) {
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
    }
}

function mostrarIndicadorDemo(activo) {
    const badge = document.getElementById('badge-demo');
    if (activo) {
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

function forzarParo() {
    enviarComandoWS(13);
    enviarComandoREST(13); 
    actualizarEtiqueta(document.getElementById('lbl-izq'), 'DETENIDO', 'bg-secondary');
    actualizarEtiqueta(document.getElementById('lbl-der'), 'DETENIDO', 'bg-secondary');
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
        }
    } catch (error) {
        console.error("Error REST:", error);
    }
}

function ejecutarDemoSeleccionada() {
    const input = document.getElementById('input-demo');
    const idDemo = parseInt(input.value);
    
    if (idDemo && idDemo > 0) {
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

// NUEVO: Verifica que el backend esté arriba para encender los badges en verde al cargar la página
async function verificarSaludAPI() {
    try {
        const res = await fetch(`https://${HOST_IP}/vehiculos/1/estado`, {
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
        console.error("No se pudo conectar a la API al inicio:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initJoysticks();
    initWebSocket();
    verificarSaludAPI(); // Llama a los indicadores al abrir
});