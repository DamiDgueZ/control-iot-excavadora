// Reemplaza 'TU_IP_ELASTICA_EC2' con la IP pública de tu servidor en AWS
const API_HOST = '100.60.28.1:8000';

export const CONFIG = {
    API_BASE_URL: `http://100.60.28.1:8000`,
    WS_URL: `ws://100.60.28.1:8000/ws/vehiculos/1`,
    
    // Catálogo de comandos: Ajusta las claves o valores según tus procedimientos almacenados
    COMMANDS: {
        FORWARD: 'F',
        BACKWARD: 'B',
        LEFT: 'L',
        RIGHT: 'R',
        STOP: 'S',
        BOOM_UP: 'BU',
        BOOM_DOWN: 'BD',
        BUCKET_IN: 'BI',
        BUCKET_OUT: 'BO',
        DEMO_1: 'D1'
    }
};