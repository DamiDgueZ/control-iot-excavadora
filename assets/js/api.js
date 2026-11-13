import { CONFIG } from './config.js';

class ApiService {
    constructor() {
        this.ws = null;
    }

    connectWebSocket(onOpen, onMessage, onClose, onError) {
        this.ws = new WebSocket(CONFIG.WS_URL);
        
        this.ws.onopen = onOpen;
        this.ws.onmessage = onMessage;
        this.ws.onclose = onClose;
        this.ws.onerror = onError;
    }

    sendCommand(commandValue) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // El payload JSON que espera tu endpoint de FastAPI
            const payload = { 
                action: 'move', 
                command: commandValue 
            };
            this.ws.send(JSON.stringify(payload));
            console.log(`[WS] Comando enviado: ${commandValue}`);
        } else {
            console.warn('[WS] No conectado. El comando no se envió.');
        }
    }

    async getSecuencias() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/secuencias`);
            if (!response.ok) throw new Error('Error en la red');
            return await response.json();
        } catch (error) {
            console.error('[REST] Error obteniendo secuencias:', error);
            return null;
        }
    }
}

export const api = new ApiService();