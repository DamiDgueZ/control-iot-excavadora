let clientesCache = [];
let usuariosCache = [];
let unidadesCache = [];
let vehiculosCache = [];
let unidadEditandoActual = null;
let comandosVehiculoEditando = [];

const COMANDOS_BASE_NUEVO_CONTROL = [
    { nombre: 'ATRAS', codigo: 1, descripcion: 'Retroceder' },
    { nombre: 'ADELANTE', codigo: 2, descripcion: 'Avanzar' },
    { nombre: 'GIRO_IZQUIERDA', codigo: 3, descripcion: 'Giro a la izquierda' },
    { nombre: 'GIRO_DERECHA', codigo: 4, descripcion: 'Giro a la derecha' },
    { nombre: 'ENCENDIDO', codigo: 5, descripcion: 'Encender o apagar sistema' },
    { nombre: 'LUZ', codigo: 7, descripcion: 'Alternar luces' },
    { nombre: 'SONIDO', codigo: 8, descripcion: 'Activar claxon o sonido' },
    { nombre: 'GARRA_ARRIBA', codigo: 9, descripcion: 'Subir brazo o garra' },
    { nombre: 'GARRA_ABAJO', codigo: 10, descripcion: 'Bajar brazo o garra' },
    { nombre: 'DERECHA', codigo: 11, descripcion: 'Rotar o mover derecha auxiliar' },
    { nombre: 'IZQUIERDA', codigo: 12, descripcion: 'Rotar o mover izquierda auxiliar' },
    { nombre: 'APAGAR_TODO', codigo: 13, descripcion: 'Paro de emergencia / detener todo' }
];

document.addEventListener('DOMContentLoaded', () => {
    const { usuario } = obtenerSesionActual();
    if (usuario) {
        const nameEl = document.getElementById('user-display-name') || document.getElementById('admin-display-name');
        if (nameEl) nameEl.textContent = usuario.nombre;
    }

    verificarSaludApiAdmin();
    cargarUsuariosAdmin();
    cargarVehiculosAdmin();
    cargarUnidadesAdmin();
    cargarModelosAdmin();
    cargarAuditoriaAdmin();

    document.getElementById('form-crear-control')?.addEventListener('submit', registrarNuevoControl);
    document.getElementById('form-crear-modelo')?.addEventListener('submit', registrarModelo);
    document.getElementById('form-crear-unidad')?.addEventListener('submit', registrarUnidadFisica);
    document.getElementById('form-asignar-unidad')?.addEventListener('submit', guardarAsignacionUnidad);
    document.getElementById('form-cambiar-estado')?.addEventListener('submit', guardarEstadoUnidad);
    document.getElementById('form-editar-unidad-general')?.addEventListener('submit', guardarEdicionUnidadGeneral);
    document.getElementById('form-crear-usuario-admin')?.addEventListener('submit', crearUsuarioDesdeAdmin);
    document.getElementById('form-editar-usuario-admin')?.addEventListener('submit', guardarEdicionUsuarioAdmin);
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

async function cargarVehiculosAdmin() {
    try {
        const res = await fetch(`${BASE_URL}/vehiculos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error cargando vehículos IoT');
        const data = await res.json();
        vehiculosCache = Array.isArray(data) ? data : (data.vehiculos || []);
    } catch {
        vehiculosCache = [];
    }
}

// Crear un nuevo control / vehículo IoT sin tocar los existentes
async function registrarNuevoControl(e) {
    e.preventDefault();
    const nombre = document.getElementById('control-nombre').value.trim();
    const modelo = document.getElementById('control-modelo').value.trim();
    const microcontrolador = document.getElementById('control-mcu').value.trim() || 'ESP8266';
    const descripcion = document.getElementById('control-desc').value.trim() || `Control IoT ${nombre}`;
    const cargarBase = document.getElementById('control-cargar-comandos')?.checked ?? true;

    try {
        const res = await fetch(`${BASE_URL}/vehiculos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, modelo, microcontrolador, descripcion })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al crear el control IoT');

        const nuevoId = data.id_vehiculo || data.id || data.vehiculo?.id_vehiculo || data.vehiculo?.id;

        if (nuevoId && cargarBase) {
            for (const cmd of COMANDOS_BASE_NUEVO_CONTROL) {
                try {
                    await fetch(`${BASE_URL}/vehiculos/${nuevoId}/comandos`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(cmd)
                    });
                } catch (_) {}
            }
        }

        alert(`¡Control IoT "${nombre}" creado${nuevoId ? ` con ID #${nuevoId}` : ''}! Ya puedes vincularlo en Editar Unidad.`);
        const modalEl = document.getElementById('modalCrearControl');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
        }
        document.getElementById('form-crear-control').reset();
        document.getElementById('control-mcu').value = 'ESP8266';
        if (document.getElementById('control-cargar-comandos')) {
            document.getElementById('control-cargar-comandos').checked = true;
        }

        await cargarVehiculosAdmin();
        await cargarUnidadesAdmin();
        await cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Cargar todos los usuarios para la pestaña de usuarios y selectores de asignación
async function cargarUsuariosAdmin() {
    const tbody = document.getElementById('tabla-usuarios-body');
    const selectAsignar = document.getElementById('asignar-cliente-select');
    const selectEditarProp = document.getElementById('editar-propietario-select');

    try {
        const res = await fetch(`${BASE_URL}/usuarios`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('No se pudo cargar usuarios');
        usuariosCache = await res.json();
        clientesCache = usuariosCache.filter(u => (u.rol || '').toLowerCase() === 'usuario');

        const opcionesClientes = '<option value="">-- Sin asignar / Liberar --</option>' +
            clientesCache.map(c => `<option value="${c.id_usuario}">ID #${c.id_usuario} — ${c.nombre} (${c.email})</option>`).join('');

        if (selectAsignar) selectAsignar.innerHTML = opcionesClientes;
        if (selectEditarProp) selectEditarProp.innerHTML = opcionesClientes;

        if (tbody) {
            if (usuariosCache.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No hay usuarios registrados.</td></tr>';
            } else {
                tbody.innerHTML = usuariosCache.map(u => {
                    const activo = u.activo === 1 || u.activo === true;
                    const colorRol = u.rol === 'administrador' ? 'warning text-dark' : (u.rol === 'usuario' ? 'info text-dark' : 'secondary');
                    return `
                        <tr>
                            <td>${u.id_usuario}</td>
                            <td class="fw-bold text-light">${u.nombre}</td>
                            <td><code class="text-info">${u.email}</code></td>
                            <td><span class="badge bg-${colorRol} text-uppercase">${u.rol}</span></td>
                            <td>
                                <span class="badge bg-${activo ? 'success' : 'danger'}">
                                    ${activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td class="text-muted small">${u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString() : '--'}</td>
                            <td>
                                <button class="btn btn-outline-warning btn-sm" onclick="abrirModalEditarUsuario(${u.id_usuario})" title="Editar usuario">
                                    <i class="fas fa-user-edit me-1"></i> Editar
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (err) {
        if (selectAsignar) selectAsignar.innerHTML = '<option value="">No disponible (usa el campo ID manual)</option>';
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Error cargando usuarios: ${err.message}</td></tr>`;
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
        unidadesCache = await res.json();

        if (unidadesCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No hay unidades registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = unidadesCache.map(u => `
            <tr>
                <td>${u.id_unidad}</td>
                <td>
                    <div class="fw-bold text-warning">${u.nombre_vehiculo || u.nombre_modelo || 'N/D'}</div>
                    <small class="text-secondary">${u.nombre_modelo || ''}</small>
                </td>
                <td>
                    <div><code class="text-info">${u.numero_serie}</code></div>
                    <small class="text-muted">ID IoT: ${u.id_vehiculo_iot ? `#${u.id_vehiculo_iot}` : 'Sin vínculo'}</small>
                </td>
                <td>
                    <span class="badge bg-${obtenerColorEstado(u.estado_comercial)} text-uppercase">
                        ${u.estado_comercial}
                    </span>
                </td>
                <td>${u.propietario_nombre ? `<i class="fas fa-user text-success me-1"></i>${u.propietario_nombre} (ID: ${u.id_propietario || '--'})` : '<span class="text-muted fst-italic">Sin asignar</span>'}</td>
                <td>
                    <div class="d-flex gap-1 flex-wrap">
                        <button class="btn btn-primary btn-sm" onclick="abrirModalEditarUnidad(${u.id_unidad})" title="Editar unidad, movimientos y demos">
                            <i class="fas fa-edit me-1"></i> Editar
                        </button>
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

// ============================================================================
// EDICIÓN INTEGRAL DE UNIDAD (NOMBRE, VÍNCULO IoT, COMANDOS Y DEMOS)
// ============================================================================
async function abrirModalEditarUnidad(idUnidad) {
    await cargarVehiculosAdmin();
    const unidad = unidadesCache.find(u => u.id_unidad === idUnidad);
    if (!unidad) {
        alert('No se encontró la unidad seleccionada.');
        return;
    }

    unidadEditandoActual = { ...unidad };
    document.getElementById('editar-id-unidad').value = unidad.id_unidad;
    document.getElementById('editar-unidad-titulo').textContent = `#${unidad.id_unidad} (${unidad.numero_serie})`;
    document.getElementById('editar-nombre-vehiculo').value = unidad.nombre_vehiculo || '';
    document.getElementById('editar-estado-comercial').value = unidad.estado_comercial || 'disponible';
    document.getElementById('editar-propietario-select').value = unidad.id_propietario ? String(unidad.id_propietario) : '';

    const selectVeh = document.getElementById('editar-vehiculo-iot-select');
    const opcionesVeh = vehiculosCache.map(v => {
        const ocupadoPorOtra = unidadesCache.find(u => u.id_vehiculo_iot === v.id_vehiculo && u.id_unidad !== unidad.id_unidad);
        const etiquetaOcupado = ocupadoPorOtra ? ` [Ocupado por ${ocupadoPorOtra.numero_serie}]` : '';
        return `<option value="${v.id_vehiculo}">ID #${v.id_vehiculo} — ${v.nombre} (${v.modelo || 'IoT'})${etiquetaOcupado}</option>`;
    }).join('');
    selectVeh.innerHTML = '<option value="">-- Sin vínculo IoT --</option>' + opcionesVeh;
    selectVeh.value = unidad.id_vehiculo_iot ? String(unidad.id_vehiculo_iot) : '';

    cerrarPanelPasosDemoAdmin();
    await refrescarSubpanelesUnidadEditando(unidad.id_vehiculo_iot);

    const modalEl = document.getElementById('modalEditarUnidad');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

async function refrescarSubpanelesUnidadEditando(idVehiculoIoT) {
    const avisoCmd = document.getElementById('aviso-sin-vehiculo-comandos');
    const secCmd = document.getElementById('seccion-comandos-unidad');
    const avisoDemo = document.getElementById('aviso-sin-vehiculo-demos');
    const secDemo = document.getElementById('seccion-demos-unidad');

    if (!idVehiculoIoT) {
        avisoCmd?.classList.remove('d-none');
        secCmd?.classList.add('d-none');
        avisoDemo?.classList.remove('d-none');
        secDemo?.classList.add('d-none');
        return;
    }

    avisoCmd?.classList.add('d-none');
    secCmd?.classList.remove('d-none');
    avisoDemo?.classList.add('d-none');
    secDemo?.classList.remove('d-none');

    await cargarComandosUnidadAdmin(idVehiculoIoT);
    await cargarDemosUnidadAdmin(idVehiculoIoT);
}

async function guardarEdicionUnidadGeneral(e) {
    e.preventDefault();
    const idUnidad = parseInt(document.getElementById('editar-id-unidad').value);
    const vehVal = document.getElementById('editar-vehiculo-iot-select').value;
    const id_vehiculo_iot = vehVal ? parseInt(vehVal) : null;
    const nombre_vehiculo = document.getElementById('editar-nombre-vehiculo').value.trim() || null;
    const estado_comercial = document.getElementById('editar-estado-comercial').value;
    const propVal = document.getElementById('editar-propietario-select').value;
    const id_propietario = propVal ? parseInt(propVal) : null;

    try {
        const res = await fetch(`${BASE_URL}/unidades/${idUnidad}/editar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                nombre_vehiculo,
                id_vehiculo_iot,
                estado_comercial,
                id_propietario
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al editar unidad');

        alert('¡Cambios de la unidad guardados correctamente!');
        if (unidadEditandoActual) {
            unidadEditandoActual.id_vehiculo_iot = id_vehiculo_iot;
        }
        await cargarVehiculosAdmin();
        await cargarUnidadesAdmin();
        await cargarAuditoriaAdmin();
        await refrescarSubpanelesUnidadEditando(id_vehiculo_iot);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function cargarComandosUnidadAdmin(idVehiculo) {
    const tbody = document.getElementById('tabla-comandos-unidad-body');
    const selectPaso = document.getElementById('admin-paso-comando');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/vehiculos/${idVehiculo}/comandos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener comandos');
        const data = await res.json();
        comandosVehiculoEditando = data.comandos || [];

        if (selectPaso) {
            selectPaso.innerHTML = comandosVehiculoEditando.length
                ? comandosVehiculoEditando.map(c => `<option value="${c.id_comando}">${c.nombre} (Código ${c.codigo})</option>`).join('')
                : '<option value="">Sin comandos</option>';
        }

        if (comandosVehiculoEditando.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Este vehículo no tiene comandos registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = comandosVehiculoEditando.map(c => `
            <tr>
                <td>${c.id_comando}</td>
                <td><span class="badge bg-info text-dark">${c.codigo}</span></td>
                <td class="fw-bold text-light">${c.nombre}</td>
                <td class="text-secondary small">${c.descripcion || '--'}</td>
                <td class="text-center">
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarComandoAdmin(${c.id_comando})" title="Eliminar comando">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Error: ${err.message}</td></tr>`;
    }
}

async function agregarComandoAdmin() {
    const idVehiculo = unidadEditandoActual?.id_vehiculo_iot;
    if (!idVehiculo) return;

    const nombre = document.getElementById('nuevo-cmd-nombre').value.trim().toUpperCase();
    const codigo = parseInt(document.getElementById('nuevo-cmd-codigo').value);
    const descripcion = document.getElementById('nuevo-cmd-desc').value.trim() || nombre;

    if (!nombre || isNaN(codigo)) {
        alert('Ingresa el nombre y el código numérico del movimiento.');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/vehiculos/${idVehiculo}/comandos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, codigo, descripcion })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'No se pudo agregar el comando');

        document.getElementById('nuevo-cmd-nombre').value = '';
        document.getElementById('nuevo-cmd-codigo').value = '';
        document.getElementById('nuevo-cmd-desc').value = '';
        await cargarComandosUnidadAdmin(idVehiculo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function eliminarComandoAdmin(idComando) {
    const idVehiculo = unidadEditandoActual?.id_vehiculo_iot;
    if (!idVehiculo) return;
    if (!confirm('¿Eliminar este comando del vehículo? (No se podrá borrar si está usado en una demo activa).')) return;

    try {
        const res = await fetch(`${BASE_URL}/comandos/${idComando}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'No se pudo eliminar el comando');

        await cargarComandosUnidadAdmin(idVehiculo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function cargarDemosUnidadAdmin(idVehiculo) {
    const tbody = document.getElementById('tabla-demos-unidad-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/vehiculos/${idVehiculo}/demos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener demos');
        const data = await res.json();
        const demos = data.demos || [];

        if (demos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay demos registradas para este vehículo.</td></tr>';
            return;
        }

        tbody.innerHTML = demos.map(d => `
            <tr>
                <td class="fw-bold text-warning">${d.id_demo}</td>
                <td class="fw-bold text-light">${d.nombre}</td>
                <td class="text-secondary small">${d.descripcion || '--'}</td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-1 flex-wrap">
                        <button class="btn btn-outline-info btn-sm" onclick="abrirPasosDemoAdmin(${d.id_demo}, '${(d.nombre || '').replace(/'/g, "\\'")}')">
                            <i class="fas fa-list-ol me-1"></i> Pasos
                        </button>
                        <button class="btn btn-outline-warning btn-sm" onclick="editarNombreDemoAdmin(${d.id_demo}, '${(d.nombre || '').replace(/'/g, "\\'")}', '${(d.descripcion || '').replace(/'/g, "\\'")}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="eliminarDemoAdmin(${d.id_demo})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error: ${err.message}</td></tr>`;
    }
}

async function crearDemoAdmin() {
    const idVehiculo = unidadEditandoActual?.id_vehiculo_iot;
    if (!idVehiculo) return;

    const nombre = document.getElementById('admin-nueva-demo-nombre').value.trim();
    const descripcion = document.getElementById('admin-nueva-demo-desc').value.trim() || 'Creada por Administrador';

    if (!nombre) {
        alert('Ingresa un nombre para la demo.');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/vehiculos/${idVehiculo}/demos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, descripcion })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al crear demo');

        document.getElementById('admin-nueva-demo-nombre').value = '';
        document.getElementById('admin-nueva-demo-desc').value = '';
        await cargarDemosUnidadAdmin(idVehiculo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function editarNombreDemoAdmin(idDemo, nombreActual, descActual) {
    const idVehiculo = unidadEditandoActual?.id_vehiculo_iot;
    const nuevoNombre = prompt('Nuevo nombre de la demo:', nombreActual);
    if (nuevoNombre === null || !nuevoNombre.trim()) return;
    const nuevaDesc = prompt('Nueva descripción de la demo:', descActual) ?? descActual;

    try {
        const res = await fetch(`${BASE_URL}/demos/${idDemo}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                nombre: nuevoNombre.trim(),
                descripcion: nuevaDesc.trim(),
                activo: true
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al actualizar demo');

        if (idVehiculo) await cargarDemosUnidadAdmin(idVehiculo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function eliminarDemoAdmin(idDemo) {
    const idVehiculo = unidadEditandoActual?.id_vehiculo_iot;
    if (!confirm(`¿Eliminar la demo ID #${idDemo} y todos sus pasos?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/demos/${idDemo}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al eliminar demo');

        cerrarPanelPasosDemoAdmin();
        if (idVehiculo) await cargarDemosUnidadAdmin(idVehiculo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function abrirPasosDemoAdmin(idDemo, nombreDemo) {
    document.getElementById('admin-demo-activa-id').value = idDemo;
    document.getElementById('admin-demo-seleccionada-titulo').textContent = `${nombreDemo} (ID #${idDemo})`;
    document.getElementById('panel-pasos-demo-admin').classList.remove('d-none');
    await cargarPasosDemoAdmin(idDemo);
}

function cerrarPanelPasosDemoAdmin() {
    document.getElementById('panel-pasos-demo-admin')?.classList.add('d-none');
}

async function cargarPasosDemoAdmin(idDemo) {
    const tbody = document.getElementById('tabla-pasos-demo-admin-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/demos/${idDemo}/movimientos`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Error al obtener pasos');
        const data = await res.json();
        const movs = data.movimientos || [];

        if (movs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-2">Sin pasos registrados en esta demo.</td></tr>';
            return;
        }

        tbody.innerHTML = movs.map(m => `
            <tr>
                <td class="fw-bold text-info">${m.orden}</td>
                <td>${m.comando || `Comando #${m.id_comando}`}</td>
                <td>${m.duracion_ms} ms</td>
                <td>${m.pausa_ms} ms</td>
                <td class="text-center">
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarPasoDemoAdmin(${m.id_demo_movimiento}, ${idDemo})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-2">Error: ${err.message}</td></tr>`;
    }
}

async function agregarPasoDemoAdmin() {
    const idDemo = parseInt(document.getElementById('admin-demo-activa-id').value);
    const id_comando = parseInt(document.getElementById('admin-paso-comando').value);
    const orden = parseInt(document.getElementById('admin-paso-orden').value);
    const duracion_ms = parseInt(document.getElementById('admin-paso-duracion').value);
    const pausa_ms = parseInt(document.getElementById('admin-paso-pausa').value) || 0;

    if (!idDemo || isNaN(id_comando) || isNaN(orden) || isNaN(duracion_ms)) {
        alert('Completa comando, orden y duración del paso.');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/demos/${idDemo}/movimientos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id_comando, orden, duracion_ms, pausa_ms })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al agregar paso');

        await cargarPasosDemoAdmin(idDemo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function eliminarPasoDemoAdmin(idDemoMovimiento, idDemo) {
    if (!confirm('¿Eliminar este paso de la demo?')) return;

    try {
        const res = await fetch(`${BASE_URL}/demo-movimientos/${idDemoMovimiento}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al eliminar paso');

        await cargarPasosDemoAdmin(idDemo);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ============================================================================
// ADMINISTRACIÓN DE USUARIOS (CREAR Y EDITAR)
// ============================================================================
async function crearUsuarioDesdeAdmin(e) {
    e.preventDefault();
    const nombre = document.getElementById('crear-usr-nombre').value.trim();
    const email = document.getElementById('crear-usr-email').value.trim();
    const password = document.getElementById('crear-usr-password').value;
    const rol = document.getElementById('crear-usr-rol').value;

    try {
        const res = await fetch(`${BASE_URL}/admin/usuarios`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, email, password, rol })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al crear usuario');

        alert('¡Usuario creado correctamente!');
        const modalEl = document.getElementById('modalCrearUsuario');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        document.getElementById('form-crear-usuario-admin').reset();
        await cargarUsuariosAdmin();
        await cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function abrirModalEditarUsuario(idUsuario) {
    const usr = usuariosCache.find(u => u.id_usuario === idUsuario);
    if (!usr) return;

    document.getElementById('editar-usr-id').value = usr.id_usuario;
    document.getElementById('editar-usr-nombre').value = usr.nombre;
    document.getElementById('editar-usr-rol').value = usr.rol;
    const activo = usr.activo === 1 || usr.activo === true;
    document.getElementById('editar-usr-activo').value = activo ? 'true' : 'false';

    const modalEl = document.getElementById('modalEditarUsuario');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

async function guardarEdicionUsuarioAdmin(e) {
    e.preventDefault();
    const idUsuario = parseInt(document.getElementById('editar-usr-id').value);
    const nombre = document.getElementById('editar-usr-nombre').value.trim();
    const rol = document.getElementById('editar-usr-rol').value;
    const activo = document.getElementById('editar-usr-activo').value === 'true';

    try {
        const res = await fetch(`${BASE_URL}/admin/usuarios/${idUsuario}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, rol, activo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al actualizar usuario');

        alert('¡Usuario actualizado correctamente!');
        const modalEl = document.getElementById('modalEditarUsuario');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        await cargarUsuariosAdmin();
        await cargarUnidadesAdmin();
        await cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ============================================================================
// MODELOS, UNIDADES Y ASIGNACIONES RÁPIDAS
// ============================================================================
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
        cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

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
        cargarAuditoriaAdmin();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

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