const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
const API_BASE_URL = `https://${HOST_IP}`;
const VEHICULO_ID = 1;

document.addEventListener("DOMContentLoaded", function () {
    cargarDemos();
});

// 1. Obtener y listar las demos del vehículo 1
async function cargarDemos() {
    const tbody = document.getElementById("tabla-demos-admin");
    try {
        const response = await fetch(`${API_BASE_URL}/vehiculos/${VEHICULO_ID}/demos`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        if (!response.ok) throw new Error("Error al obtener las rutinas DEMO");
        
        const data = await response.json();
        const demos = Array.isArray(data) ? data : (data.demos || []);
        
        tbody.innerHTML = "";

        if (!demos || demos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay rutinas DEMO registradas para este vehículo.</td></tr>`;
            return;
        }

        demos.forEach((demo, index) => {
            const idDemo = demo.id_demo || demo.id;
            const nombreDemo = demo.nombre || demo.descripcion || "Rutina sin nombre";
            
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-warning">${idDemo}</td>
                <td>${nombreDemo}</td>
                <td class="text-muted small">${demo.fecha_creacion || demo.fecha || "Reciente"}</td>
                <td class="text-center d-flex justify-content-center gap-2">
                    <button class="btn btn-sm btn-outline-info px-3 shadow-sm" onclick="abrirModalMovimientos(${idDemo}, '${nombreDemo}')">
                        <i class="fas fa-list-ol me-1"></i> Movimientos
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-3 shadow-sm" onclick="eliminarDemo(${idDemo})">
                        <i class="fas fa-trash-alt me-1"></i> Eliminar
                    </button>
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

    try {
        const response = await fetch(`${API_BASE_URL}/vehiculos/${VEHICULO_ID}/demos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({ nombre: nombre, descripcion: "Creado desde panel admin" })
        });

        if (!response.ok) throw new Error("No se pudo crear la demo");

        inputNombre.value = "";
        bootstrap.Modal.getInstance(document.getElementById("modalNuevaDemo")).hide();
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
        const response = await fetch(`${API_BASE_URL}/demos/${idDemo}`, {
            method: "DELETE",
            headers: { "ngrok-skip-browser-warning": "true" }
        });

        if (!response.ok) throw new Error("No se pudo eliminar la demo");
        cargarDemos();
    } catch (error) {
        console.error("Error al eliminar la demo:", error);
        alert("No se pudo completar la eliminación.");
    }
}

// --- GESTIÓN DE MOVIMIENTOS DE LA DEMO ---

// 4. Abrir modal y cargar los movimientos asociados a esa Demo
async function abrirModalMovimientos(idDemo, nombreDemo) {
    document.getElementById("modal-id-demo-activo").value = idDemo;
    document.getElementById("demo-titulo-modal").textContent = `${nombreDemo} (ID: ${idDemo})`;
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById("modalMovimientosDemo"));
    modal.show();

    await cargarMovimientosDemo(idDemo);
}

async function cargarMovimientosDemo(idDemo) {
    const tbody = document.getElementById("tabla-movimientos-demo");
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm me-2"></div>Cargando pasos...</td></tr>`;

    try {
        const response = await fetch(`${API_BASE_URL}/demos/${idDemo}/movimientos`, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' }
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
            const idMov = mov.id_movimiento || mov.id;
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

// 5. Agregar un nuevo movimiento/paso a la demo
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
        const response = await fetch(`${API_BASE_URL}/demos/${idDemo}/movimientos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({
                id_comando: idComando,
                orden: orden,
                duracion_ms: duracionMs,
                pausa_ms: 500 // Pausa estándar por defecto
            })
        });

        if (!response.ok) throw new Error("No se pudo agregar el movimiento");

        // Limpiar inputs del formulario de pasos
        document.getElementById("select-comando").value = "";
        document.getElementById("input-orden").value = "";
        document.getElementById("input-duracion").value = "";

        // Recargar la tabla del modal
        await cargarMovimientosDemo(idDemo);
    } catch (error) {
        console.error("Error al agregar movimiento:", error);
        alert("Ocurrió un error al registrar el paso en el servidor.");
    }
}

// 6. Eliminar un movimiento individual de la demo
async function eliminarMovimientoDemo(idMovimiento, idDemo) {
    if (!confirm("¿Estás segura de eliminar este paso de la rutina?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/demo-movimientos/${idMovimiento}`, {
            method: "DELETE",
            headers: { "ngrok-skip-browser-warning": "true" }
        });

        if (!response.ok) throw new Error("No se pudo eliminar el movimiento");

        await cargarMovimientosDemo(idDemo);
    } catch (error) {
        console.error("Error al eliminar movimiento:", error);
        alert("No se pudo completar la eliminación del paso.");
    }
}