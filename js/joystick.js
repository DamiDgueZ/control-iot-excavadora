import { wsClient } from './websocket.js';
import { CONFIG } from './config.js';

export function setupControls() {
    const buttons = document.querySelectorAll('.control-btn');
    
    const startAction = (e) => {
        e.preventDefault(); 
        const cmdKey = e.target.getAttribute('data-cmd');
        if (cmdKey && CONFIG.COMMANDS[cmdKey]) {
            wsClient.sendCommand(CONFIG.COMMANDS[cmdKey]);
        }
    };

    const stopAction = (e) => {
        e.preventDefault();
        wsClient.sendCommand(CONFIG.COMMANDS.STOP);
    };

    buttons.forEach(btn => {
        // Eventos para PC (Mouse)
        btn.addEventListener('mousedown', startAction);
        btn.addEventListener('mouseup', stopAction);
        btn.addEventListener('mouseleave', stopAction);
        
        // Eventos para Dispositivos Móviles (Touch)
        btn.addEventListener('touchstart', startAction, { passive: false });
        btn.addEventListener('touchend', stopAction, { passive: false });
        btn.addEventListener('touchcancel', stopAction, { passive: false });
    });
}