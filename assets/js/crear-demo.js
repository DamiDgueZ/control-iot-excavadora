let VEHICULO_ID = null;

document.addEventListener("DOMContentLoaded", async function () {
    const { usuario } = obtenerSesionActual();
    if (!usuario) return;

    const nameEl = document.getElementById('user-display-name');
    const rolEl = document.getElementById('user-display-rol');
    if (nameEl) nameEl.textContent = usuario.nombre;
    if (rolEl) rolEl.textContent = `Rol: ${usuario.rol}`;

    // Mostrar enlaces según rol en la barra unificada
    if (usuario.rol === 'administrador') {
        const navAdmin = document.getElementById('nav-item-admin');
        if (navAdmin) navAdmin.style.display = 'block';
    } else if (usuario.rol === 'usuario') {
        const navVehiculos = document.getElementById('nav-item-mis-vehiculos');
        const navDemos = document.getElementById('nav-item-mis-demos');
        if (navVehiculos) navVehiculos.style.display = 'block';
        if (navDemos) navDemos.style.display = 'block';
    }

    const params = new URLSearchParams(window.location.search);
    VEHICULO_ID = await obtenerVehiculoAutorizado(params.get('id'), 1);
    if (!VEHICULO_ID) return;

    window.VEHICULO_ID_AUTORIZADO = VEHICULO_ID;
    const contenedor = document.getElementById('contenido-protegido');
    if (contenedor) contenedor.classList.remove('d-none');

    console.log("Módulo de Demos de Cliente inicializado correctamente.");
    cargarDemos();
});

// 1. Obtener y listar las demos del vehículo autorizado
async function cargarDemos() {
    const tbody = document.getElementById("tabla-demos-admin");
    if (!tbody || !VEHICULO_ID) return;

    try {
        const response = await fetch(`${BASE_URL}/vehiculos/${VEHICULO_ID}/demos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error("Error al obtener las rutinas DEMO");
        
        const data = await response.json();
        const demos = Array.isArray(data) ? data : (data.demos || []);
        
        tbody.innerHTML = "";

        if (!demos || demos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay rutinas DEMO registradas para este vehículo.</td></tr>`;
            return;
        }

        demos.forEach((demo) => {
            const idDemo = demo.id_demo || demo.id;
            const nombreDemo = demo.nombre || demo.descripcion || "Rutina sin nombre";
            
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-warning">${idDemo}</td>
                <td>${nombreDemo}</td>
                <td class="text-muted small">${demo.fecha_creacion || demo.fecha || "Reciente"}</td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-outline-info px-3 shadow-sm" onclick="abrirModalMovimientos(${idDemo}, '${nombreDemo}')">
                            <i class="fas fa-list-ol me-1"></i> Movimientos
                        </button>
                        <button class="btn btn-sm btn-outline-danger px-3 shadow-sm" onclick="eliminarDemo(${idDemo})">
                            <i class="fas fa-trash-alt me-1"></i> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error conectando con la API:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error de conexión con el servidor.</td></tr>`;
    }
}

// 2. Crear una nueva demo vía POST
async function crearDemo() {
    const inputNombre = document.getElementById("nombre-demo");
    const nombre = inputNombre.value.trim();

    if (!nombre) {
        alert("Por favor ingresa un nombre para la rutina DEMO.");
        return;
    }

    if (!VEHICULO_ID) {
        alert("No hay un vehículo autorizado para crear la demo.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/vehiculos/${VEHICULO_ID}/demos`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre: nombre, descripcion: "Creado desde portal de cliente" })
        });

        if (!response.ok) throw new Error("No se pudo crear la demo");

        inputNombre.value = "";
        const modalEl = document.getElementById("modalNuevaDemo");
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
        
        cargarDemos();
    } catch (error) {
        console.error("Error al crear la demo:", error);
        alert("Ocurrió un error al intentar registrar la demo.");
    }
}

// 3. Eliminar una demo vía DELETE
async function eliminarDemo(idDemo) {
    if (!confirm(`¿Estás segura de que deseas eliminar la rutina DEMO con ID ${idDemo}?`)) return;

    try {
        const response = await fetch(`${BASE_URL}/demos/${idDemo}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("No se pudo eliminar la demo");
        cargarDemos();
    } catch (error) {
        console.error("Error al eliminar la demo:", error);
        alert("No se pudo completar la eliminación.");
    }
}

// --- GESTIÓN DE MOVIMIENTOS DE LA DEMO ---

async function abrirModalMovimientos(idDemo, nombreDemo) {
    document.getElementById("modal-id-demo-activo").value = idDemo;
    document.getElementById("demo-titulo-modal").textContent = `${nombreDemo} (ID: ${idDemo})`;
    
    const modalEl = document.getElementById("modalMovimientosDemo");
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();

    await cargarMovimientosDemo(idDemo);
}

async function cargarMovimientosDemo(idDemo) {
    const tbody = document.getElementById("tabla-movimientos-demo");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm me-2"></div>Cargando pasos...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/demos/${idDemo}/movimientos`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("Error al obtener movimientos de la demo");

        const data = await response.json();
        const movimientos = Array.isArray(data) ? data : (data.movimientos || []);

        tbody.innerHTML = "";

        if (movimientos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Esta demo aún no tiene movimientos configurados.</td></tr>`;
            return;
        }

        movimientos.forEach((mov) => {
            const idMov = mov.id_demo_movimiento || mov.id_movimiento || mov.id;
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-info">${mov.orden}</td>
                <td>Comando ID: ${mov.id_comando}</td>
                <td>${mov.duracion_ms} ms</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger px-3 shadow-sm" onclick="eliminarMovimientoDemo(${idMov}, ${idDemo})">
                        <i class="fas fa-trash-alt me-1"></i> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al cargar movimientos:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error al cargar los pasos de la demo.</td></tr>`;
    }
}

async function agregarMovimientoDemo() {
    const idDemo = document.getElementById("modal-id-demo-activo").value;
    const idComando = parseInt(document.getElementById("select-comando").value);
    const orden = parseInt(document.getElementById("input-orden").value);
    const duracionMs = parseInt(document.getElementById("input-duracion").value);

    if (!idComando || isNaN(orden) || isNaN(duracionMs)) {
        alert("Por favor completa todos los campos del movimiento.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/demos/${idDemo}/movimientos`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_comando: idComando,
                orden: orden,
                duracion_ms: duracionMs,
                pausa_ms: 500
            })
        });

        if (!response.ok) throw new Error("No se pudo agregar el movimiento");

        document.getElementById("select-comando").value = "";
        document.getElementById("input-orden").value = "";
        document.getElementById("input-duracion").value = "";

        await cargarMovimientosDemo(idDemo);
    } catch (error) {
        console.error("Error al agregar movimiento:", error);
        alert("Ocurrió un error al registrar el paso en el servidor.");
    }
}

async function eliminarMovimientoDemo(idMovimiento, idDemo) {
    if (!idMovimiento) {
        alert("No se encontró el identificador del movimiento.");
        return;
    }
    if (!confirm("¿Estás segura de eliminar este paso de la rutina?")) return;

    try {
        const response = await fetch(`${BASE_URL}/demo-movimientos/${idMovimiento}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("No se pudo eliminar el movimiento");

        await cargarMovimientosDemo(idDemo);
    } catch (error) {
        console.error("Error al eliminar movimiento:", error);
        alert("No se pudo completar la eliminación del paso.");
    }
}