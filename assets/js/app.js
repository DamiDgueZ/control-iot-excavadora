import { wsClient } from './websocket.js';
import { setupControls } from './joystick.js';
import { CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('ws-status');

    // Callbacks para actualizar la interfaz según el estado del WebSocket
    const onWsOpen = () => {
        statusBadge.textContent = 'Conectado';
        statusBadge.classList.replace('bg-danger', 'bg-success');
        statusBadge.classList.replace('bg-warning', 'bg-success');
    };

    const onWsMessage = (event) => {
        console.log('[WSS] Telemetría recibida:', event.data);
    };

    const onWsClose = () => {
        statusBadge.textContent = 'Reconectando...';
        statusBadge.classList.replace('bg-success', 'bg-warning');
        statusBadge.classList.replace('bg-danger', 'bg-warning');
    };

    const onWsError = (error) => {
        console.error('[WSS] Error en la conexión:', error);
    };

    // Inicializar conexión delegada al cliente de sockets
    wsClient.connect(onWsOpen, onWsMessage, onWsClose, onWsError);

    // Mapear los eventos de los botones de la interfaz
    setupControls();

    // Configurar el botón de secuencia automatizada (Demo)
    document.getElementById('btn-demo').addEventListener('click', () => {
        wsClient.sendCommand(CONFIG.COMMANDS.DEMO_1);
    });
});