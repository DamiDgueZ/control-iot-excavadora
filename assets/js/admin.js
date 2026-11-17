const HOST_IP = 'ultra-silver-unblessed.ngrok-free.dev';
const API_BASE_URL = `https://${HOST_IP}`;
const VEHICULO_ID = 1;

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM cargado en Administración. Iniciando petición de demos...");
    cargarDemos();
});

async function cargarDemos() {
    const tbody = document.getElementById("tabla-demos-admin");
    try {
        const urlPeticion = `${API_BASE_URL}/vehiculos/${VEHICULO_ID}/demos`;
        console.log("Haciendo fetch a:", urlPeticion);

        const response = await fetch(urlPeticion, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        console.log("Respuesta recibida, status:", response.status);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        console.log("Datos JSON obtenidos:", data);

        const demos = Array.isArray(data) ? data : (data.demos || []);
        
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
        console.error("Error detallado en catch:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error: ${error.message}. Revisa la consola (F12).</td></tr>`;
    }
}

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
        const modalElement = document.getElementById("modalNuevaDemo");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        cargarDemos();
    } catch (error) {
        console.error("Error al crear la demo:", error);
        alert("Ocurrió un error al intentar registrar la demo en el servidor.");
    }
}

async function eliminarDemo(idDemo) {
    if (!confirm(`¿Estás segura de que deseas eliminar la rutina DEMO con ID ${idDemo}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/demos/${idDemo}`, {
            method: "DELETE",
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (!response.ok) throw new Error("No se pudo eliminar la demo");

        cargarDemos();
    } catch (error) {
        console.error("Error al eliminar la demo:", error);
        alert("No se pudo completar la eliminación en el servidor.");
    }
}