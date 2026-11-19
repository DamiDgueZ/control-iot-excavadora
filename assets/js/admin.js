let clientesCache = [];

document.addEventListener('DOMContentLoaded', () => {
    const { usuario } = obtenerSesionActual();
    if (usuario) {
        const nameEl = document.getElementById('user-display-name') || document.getElementById('admin-display-name');
        if (nameEl) nameEl.textContent = usuario.nombre;
    }

    verificarSaludApiAdmin();
    cargarClientesAdmin();
    cargarUnidadesAdmin();
    cargarModelosAdmin();
    cargarAuditoriaAdmin();

    const formModelo = document.getElementById('form-crear-modelo');
    const formUnidad = document.getElementById('form-crear-unidad');
    const formAsignar = document.getElementById('form-asignar-unidad');
    const formEstado = document.getElementById('form-cambiar-estado');

    if (formModelo) formModelo.addEventListener('submit', registrarModelo);
    if (formUnidad) formUnidad.addEventListener('submit', registrarUnidadFisica);
    if (formAsignar) formAsignar.addEventListener('submit', guardarAsignacionUnidad);
    if (formEstado) formEstado.addEventListener('submit', guardarEstadoUnidad);
});

async function verificarSaludApiAdmin() {
    const badge = document.getElementById('badge-api');
    if (!badge) return;

    try {
        const res = await fetch(`${BASE_URL}/`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
            badge.className = 'badge bg-success p-2 shadow-sm';
            badge.innerHTML = '<i class="fas fa-server me-1"></i>API: Disponible';
        } else {
            throw new Error();
        }
    } catch {
        badge.className = 'badge bg-danger p-2 shadow-sm';
        badge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>API: No disponible';
    }
}

// Cargar usuarios/clientes para conocer su ID al asignar una unidad
async function cargarClientesAdmin() {
    const select = document.getElementById('asignar-cliente-select');
    try {
        const res = await fetch(`${BASE_URL}/usuarios`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('No se pudo cargar usuarios');
        const usuarios = await res.json();
        clientesCache = usuarios.filter(u => (u.rol || '').toLowerCase() === 'usuario');

        if (select) {
            select.innerHTML = '<option value="">-- Sin asignar / Liberar --</option>' +
                clientesCache.map(c => `<option value="${c.id_usuario}">ID #${c.id_usuario} — ${c.nombre} (${c.email})</option>`).join('');
        }
    } catch {
        if (select) {
            select.innerHTML = '<option value="">No disponible (usa el campo ID manual)</option>';
        }
    }
}

// Cargar inventario de unidades físicas
async function cargarUnidadesAdmin() {
    const tbody = document.getElementById('tabla-unidades-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/unidades`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener unidades');
        const unidades = await res.json();

        if (unidades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No hay unidades registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = unidades.map(u => `
            <tr>
                <td>${u.id_unidad}</td>
                <td><span class="fw-bold text-warning">${u.nombre_modelo || 'N/D'}</span></td>
                <td><code class="text-info">${u.numero_serie}</code></td>
                <td>
                    <span class="badge bg-${obtenerColorEstado(u.estado_comercial)} text-uppercase">
                        ${u.estado_comercial}
                    </span>
                </td>
                <td>${u.propietario_nombre ? `<i class="fas fa-user text-success me-1"></i>${u.propietario_nombre} (ID: ${u.id_propietario || '--'})` : '<span class="text-muted italic">Sin asignar</span>'}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-info btn-sm" onclick="abrirModalAsignar(${u.id_unidad}, ${u.id_propietario || 'null'}, '${u.estado_comercial}')" title="Asignar a cliente">
                            <i class="fas fa-user-tag"></i>
                        </button>
                        <button class="btn btn-outline-warning btn-sm" onclick="abrirModalEstado(${u.id_unidad}, '${u.estado_comercial}')" title="Cambiar estado comercial">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Error cargando inventario: ${err.message}</td></tr>`;
    }
}

// Cargar catálogo de modelos comerciales
async function cargarModelosAdmin() {
    const tbody = document.getElementById('tabla-modelos-body');
    const selectModal = document.getElementById('unidad-modelo-select');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/modelos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener modelos');
        const modelos = await res.json();

        if (modelos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay modelos registrados.</td></tr>';
            if (selectModal) selectModal.innerHTML = '<option value="">No hay modelos disponibles</option>';
            return;
        }

        tbody.innerHTML = modelos.map(m => `
            <tr>
                <td>${m.id_modelo}</td>
                <td class="fw-bold text-light">${m.nombre_modelo}</td>
                <td>${m.descripcion || '--'}</td>
                <td><small class="text-secondary">${m.especificaciones_tecnicas || '--'}</small></td>
            </tr>
        `).join('');

        if (selectModal) {
            selectModal.innerHTML = '<option value="">Seleccione un modelo...</option>' + modelos.map(m => `
                <option value="${m.id_modelo}">${m.nombre_modelo}</option>
            `).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error cargando modelos: ${err.message}</td></tr>`;
    }
}

// Cargar bitácora de auditoría
async function cargarAuditoriaAdmin() {
    const tbody = document.getElementById('tabla-auditoria-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/auditoria`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener auditoría');
        const logs = await res.json();

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Sin registros de auditoría.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr>
                <td>${l.id_auditoria}</td>
                <td class="text-warning">${l.usuario || 'Sistema / Invitado'}</td>
                <td><span class="badge bg-secondary">${l.accion}</span></td>
                <td>${l.detalles || '--'}</td>
                <td class="text-muted small">${new Date(l.fecha_evento).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Error cargando auditoría: ${err.message}</td></tr>`;
    }
}

// Registrar nuevo modelo comercial
async function registrarModelo(e) {
    e.preventDefault();
    const nombre_modelo = document.getElementById('modelo-nombre').value.trim();
    const descripcion = document.getElementById('modelo-desc').value.trim();
    const especificaciones_tecnicas = document.getElementById('modelo-specs').value.trim();

    try {
        const res = await fetch(`${BASE_URL}/modelos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre_modelo, descripcion, especificaciones_tecnicas })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al crear modelo');

        alert('¡Modelo comercial creado con éxito!');
        const modalEl = document.getElementById('modalCrearModelo');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
        }
        document.getElementById('form-crear-modelo').reset();
        cargarModelosAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Registrar nueva unidad física
async function registrarUnidadFisica(e) {
    e.preventDefault();
    const id_modelo = parseInt(document.getElementById('unidad-modelo-select').value);
    const id_vehiculo_iot_val = document.getElementById('unidad-vehiculo-iot').value;
    const id_vehiculo_iot = id_vehiculo_iot_val ? parseInt(id_vehiculo_iot_val) : null;
    const numero_serie = document.getElementById('unidad-serie').value.trim();
    const estado_comercial = document.getElementById('unidad-estado').value;

    try {
        const res = await fetch(`${BASE_URL}/unidades`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_modelo, id_vehiculo_iot, numero_serie, estado_comercial })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al registrar unidad');

        alert('¡Unidad física registrada correctamente!');
        const modalEl = document.getElementById('modalCrearUnidad');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
        }
        document.getElementById('form-crear-unidad').reset();
        cargarUnidadesAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Abrir modal para asignar unidad a un cliente comprador
function abrirModalAsignar(idUnidad, idPropietarioActual, estadoActual) {
    document.getElementById('asignar-id-unidad').value = idUnidad;
    const select = document.getElementById('asignar-cliente-select');
    const manual = document.getElementById('asignar-cliente-manual');
    const estadoSel = document.getElementById('asignar-estado-select');

    if (select) select.value = idPropietarioActual ? String(idPropietarioActual) : '';
    if (manual) manual.value = idPropietarioActual ? String(idPropietarioActual) : '';
    if (estadoSel) estadoSel.value = estadoActual || 'vendido';

    const modalEl = document.getElementById('modalAsignarUnidad');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

async function guardarAsignacionUnidad(e) {
    e.preventDefault();
    const idUnidad = parseInt(document.getElementById('asignar-id-unidad').value);
    const manualVal = document.getElementById('asignar-cliente-manual').value.trim();
    const selectVal = document.getElementById('asignar-cliente-select').value;
    const idRaw = manualVal || selectVal;
    const id_propietario = idRaw ? parseInt(idRaw) : null;
    const estado_comercial = document.getElementById('asignar-estado-select').value;

    try {
        const res = await fetch(`${BASE_URL}/unidades/${idUnidad}/asignar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_propietario, estado_comercial })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al asignar unidad');

        alert('¡Unidad actualizada y asignada exitosamente!');
        const modalEl = document.getElementById('modalAsignarUnidad');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        cargarUnidadesAdmin();
        cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Abrir modal para cambiar estado comercial de una unidad
function abrirModalEstado(idUnidad, estadoActual) {
    document.getElementById('estado-id-unidad').value = idUnidad;
    document.getElementById('estado-comercial-select').value = estadoActual || 'disponible';

    const modalEl = document.getElementById('modalCambiarEstado');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

async function guardarEstadoUnidad(e) {
    e.preventDefault();
    const idUnidad = parseInt(document.getElementById('estado-id-unidad').value);
    const estado_comercial = document.getElementById('estado-comercial-select').value;

    try {
        const res = await fetch(`${BASE_URL}/unidades/${idUnidad}/estado`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ estado_comercial })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al cambiar estado comercial');

        alert('¡Estado comercial actualizado con éxito!');
        const modalEl = document.getElementById('modalCambiarEstado');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        cargarUnidadesAdmin();
        cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function obtenerColorEstado(estado) {
    switch (estado) {
        case 'disponible': return 'primary';
        case 'vendido': return 'success';
        case 'exhibicion': return 'warning';
        default: return 'secondary';
    }
}