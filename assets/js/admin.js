// Usamos tu URL de ngrok para que funcione correctamente desde GitHub Pages
const API_BASE_URL = "https://ultra-silver-unblessed.ngrok-free.dev";
const VEHICULO_ID = 1;

document.addEventListener("DOMContentLoaded", function () {
    cargarDemos();
});

// Función para obtener y listar las demos del vehículo 1
async function cargarDemos() {
    const tbody = document.getElementById("tabla-demos-admin");
    try {
        const response = await fetch(`${API_BASE_URL}/vehiculos/${VEHICULO_ID}/demos`);
        if (!response.ok) throw new Error("Error al obtener las rutinas DEMO");
        
        const data = await response.json();
        // Como main.py devuelve {"vehiculo_id": 1, "demos": [...]}, extraemos el arreglo de data.demos
        const demos = data.demos || [];
        
        tbody.innerHTML = "";

        if (!demos || demos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay rutinas DEMO registradas para este vehículo.</td></tr>`;
            return;
        }

        demos.forEach((demo, index) => {
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="fw-bold text-warning">${demo.id_demo || demo.id || index + 1}</td>
                <td>${demo.nombre || demo.descripcion || "Rutina sin nombre"}</td>
                <td class="text-muted small">${demo.fecha_creacion || demo.fecha || "Reciente"}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger px-3 shadow-sm" onclick="eliminarDemo(${demo.id_demo || demo.id})">
                        <i class="fas fa-trash-alt me-1"></i> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error conectando con la API:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error de conexión con el servidor (Verifica que ngrok esté activo).</td></tr>`;
    }
}

// Función para crear una nueva demo vía POST
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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre: nombre, descripcion: "Creado desde panel admin" })
        });

        if (!response.ok) throw new Error("No se pudo crear la demo");

        // Limpiar formulario y cerrar modal
        inputNombre.value = "";
        const modalElement = document.getElementById("modalNuevaDemo");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        // Recargar tabla
        cargarDemos();
    } catch (error) {
        console.error("Error al crear la demo:", error);
        alert("Ocurrió un error al intentar registrar la demo en el servidor.");
    }
}

// Función para eliminar una demo vía DELETE
async function eliminarDemo(idDemo) {
    if (!confirm(`¿Estás segura de que deseas eliminar la rutina DEMO con ID ${idDemo}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/demos/${idDemo}`, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("No se pudo eliminar la demo");

        // Recargar tabla
        cargarDemos();
    } catch (error) {
        console.error("Error al eliminar la demo:", error);
        alert("No se pudo completar la eliminación en el servidor.");
    }
}