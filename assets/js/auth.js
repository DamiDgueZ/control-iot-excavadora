// Usa API_BASE_URL si ya viene definido en config.js; de lo contrario usa tu dominio ngrok
const BASE_URL = (typeof API_BASE_URL !== 'undefined')
    ? API_BASE_URL
    : 'https://ultra-silver-unblessed.ngrok-free.dev';

document.addEventListener('DOMContentLoaded', () => {
    verificarSaludApiLogin();

    const formLogin = document.getElementById('form-login');
    const formRegistro = document.getElementById('form-registro');

    if (formLogin) {
        formLogin.addEventListener('submit', manejarLogin);
    }
    if (formRegistro) {
        formRegistro.addEventListener('submit', manejarRegistro);
    }
});

// Verifica disponibilidad de la API AWS
async function verificarSaludApiLogin() {
    const badge = document.getElementById('badge-api-login');
    if (!badge) return;

    try {
        const res = await fetch(`${BASE_URL}/`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
            badge.className = 'badge bg-success p-2 shadow-sm';
            badge.innerHTML = '<i class="fas fa-server me-1"></i>API: Disponible';
        } else {
            throw new Error('API no disponible');
        }
    } catch {
        badge.className = 'badge bg-danger p-2 shadow-sm';
        badge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>API: No disponible';
    }
}

// Mostrar alertas limpias en pantalla
function mostrarAlertaAuth(mensaje, tipo = 'danger') {
    const alerta = document.getElementById('auth-alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo} small py-2`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
}

// Iniciar sesión contra POST /auth/login
async function manejarLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al iniciar sesión');
        }

        // Guardar sesión en localStorage
        localStorage.setItem('iot_token', data.access_token);
        localStorage.setItem('iot_usuario', JSON.stringify(data.usuario));

        redirigirSegunRol(data.usuario.rol);
    } catch (error) {
        mostrarAlertaAuth(error.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket me-2"></i>Entrar a la Plataforma';
    }
}

// Registrar usuario nuevo contra POST /auth/registro
async function manejarRegistro(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-registro');
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';

    try {
        const response = await fetch(`${BASE_URL}/auth/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ nombre, email, password, rol })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'No se pudo completar el registro');
        }

        mostrarAlertaAuth('Cuenta creada correctamente. Ahora puedes iniciar sesión.', 'success');
        document.getElementById('form-registro').reset();
        document.getElementById('login-email').value = email;
        document.getElementById('tab-login-btn').click();
    } catch (error) {
        mostrarAlertaAuth(error.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-check me-2"></i>Crear Cuenta';
    }
}

// Rellenar credenciales de prueba
function rellenarDemo(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
}

// Acceso directo como invitado sin credenciales permanentes
function entrarComoInvitado() {
    localStorage.removeItem('iot_token');
    localStorage.setItem('iot_usuario', JSON.stringify({
        id_usuario: null,
        nombre: 'Prospecto Invitado',
        email: 'invitado@exhibicion.local',
        rol: 'invitado'
    }));
    redirigirSegunRol('invitado');
}

// Redirección inteligente según el rol (CORREGIDA)
function redirigirSegunRol(rol) {
    if (rol === 'administrador') {
        window.location.href = 'admin.html';
    } else if (rol === 'usuario') {
        window.location.href = 'mis-vehiculos.html'; // Redirige al panel del cliente comprador
    } else {
        window.location.href = 'exhibicion.html';
    }
}

// =========================================================
// UTILIDADES EXPORTABLES PARA LAS DEMÁS VISTAS
// =========================================================

function obtenerSesionActual() {
    const token = localStorage.getItem('iot_token');
    const usuarioStr = localStorage.getItem('iot_usuario');
    const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
    return { token, usuario };
}

function getAuthHeaders(extraHeaders = {}) {
    const { token } = obtenerSesionActual();
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...extraHeaders
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function cerrarSesion() {
    localStorage.removeItem('iot_token');
    localStorage.removeItem('iot_usuario');
    localStorage.removeItem('iot_sesion_invitado');
    window.location.href = 'login.html';
}