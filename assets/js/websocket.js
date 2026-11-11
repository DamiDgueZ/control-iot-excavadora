import { CONFIG } from './config.js';

class WebSocketClient {
    constructor() {
        this.ws = null;
    }

    // Inicializa la conexión y recibe las funciones que actualizarán la interfaz (app.js)
    connect(onOpen, onMessage, onClose, onError) {
        this.ws = new WebSocket(CONFIG.WS_URL);

        this.ws.onopen = (event) => {
            console.log('[WSS] Conectado al servidor de telemetría/control');
            if (onOpen) onOpen(event);
        };

        this.ws.onmessage = (event) => {
            if (onMessage) onMessage(event);
        };

        this.ws.onclose = (event) => {
            console.warn('[WSS] Desconectado. Reintentando en 3 segundos...');
            if (onClose) onClose(event);
            
            // Lógica de reconexión automática vital para IoT
            setTimeout(() => this.connect(onOpen, onMessage, onClose, onError), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('[WSS] Error de conexión:', error);
            if (onError) onError(error);
        };
    }

    // Método que usará el joystick.js para disparar las acciones
    sendCommand(commandValue) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const payload = { 
                action: 'move', 
                command: commandValue 
            };
            this.ws.send(JSON.stringify(payload));
            console.log(`[WSS] Comando emitido: ${commandValue}`);
        } else {
            console.warn('[WSS] Sin conexión al servidor. Comando ignorado.');
        }
    }
}

// Exportamos una única instancia para usarla en toda la app
export const wsClient = new WebSocketClient();