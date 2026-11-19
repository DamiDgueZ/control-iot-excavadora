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

function mostrarAlertaAuth(mensaje, tipo = 'danger') {
    const alerta = document.getElementById('auth-alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo} small py-2`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
}

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

// Registrar usuario nuevo como 'usuario' en POST /auth/registro
async function manejarRegistro(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-registro');
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const rol = 'usuario';

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
            let detalleError = 'No se pudo completar el registro';
            if (typeof data.detail === 'string') {
                detalleError = data.detail;
            } else if (Array.isArray(data.detail)) {
                detalleError = data.detail.map(d => d.msg).join(', ');
            }
            throw new Error(detalleError);
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

function rellenarDemo(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
}

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

function redirigirSegunRol(rol) {
    if (rol === 'administrador') {
        window.location.href = 'admin.html';
    } else if (rol === 'usuario') {
        window.location.href = 'mis-vehiculos.html';
    } else {
        window.location.href = 'exhibicion.html';
    }
}

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

async function obtenerVehiculoAutorizado(idSolicitado = null, idFallback = 1) {
    const { usuario } = obtenerSesionActual();
    if (!usuario) {
        window.location.replace('login.html');
        return null;
    }

    const rol = (usuario.rol || '').toLowerCase().trim();
    const idParseado = idSolicitado ? parseInt(idSolicitado, 10) : null;

    if (rol !== 'usuario') {
        return idParseado || idFallback;
    }

    try {
        const res = await fetch(`${BASE_URL}/mis-vehiculos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            throw new Error('No se pudieron verificar sus unidades asignadas');
        }

        const unidades = await res.json();
        const idsPermitidos = (Array.isArray(unidades) ? unidades : [])
            .map(u => u.id_vehiculo_iot)
            .filter(id => id !== null && id !== undefined);

        if (idsPermitidos.length === 0) {
            alert('Tu unidad no tiene un control/vehículo IoT vinculado o aún no tienes un vehículo asignado.');
            window.location.replace('mis-vehiculos.html');
            return null;
        }

        const idObjetivo = idParseado || idsPermitidos[0];
        if (!idsPermitidos.includes(idObjetivo)) {
            alert('No tienes permiso para operar o consultar este vehículo.');
            window.location.replace('mis-vehiculos.html');
            return null;
        }

        return idObjetivo;
    } catch (err) {
        console.error('Error validando vehículo asignado:', err);
        alert('No se pudo validar tu vehículo asignado.');
        window.location.replace('mis-vehiculos.html');
        return null;
    }
}