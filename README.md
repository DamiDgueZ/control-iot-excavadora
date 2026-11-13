# Plataforma IoT de Control y Monitoreo para Excavadora

> Sistema web interactivo de control en tiempo real basado en joysticks virtuales, WebSockets y base de datos relacional en la nube (AWS RDS), desarrollado bajo estrictos estándares de adaptabilidad (Responsive Design) para computadoras de escritorio y dispositivos móviles.

---

## 📋 Índice / Table of Contents

1. [Acerca del Proyecto / About the Project](#-acerca-del-proyecto--about-the-project)
2. [Características Principales / Key Features](#-características-principales--key-features)
3. [Arquitectura y Stack Tecnológico / Architecture & Tech Stack)](#-arquitectura-y-stack-tecnológico--architecture--tech-stack)
4. [Estructura del Proyecto / Project Structure](#-estructura-del-proyecto--project-structure)
5. [Instalación y Configuración / Installation & Setup](#-instalación-y-configuración--installation--setup)
6. [Diseño Adaptable (Responsive & Viewport)](#-diseño-adaptable-responsive--viewport)
7. [Créditos / Autoría](#-créditos--autoría)
8. [Licencia / License](#-licencia--license)

---

## 🚀 Acerca del Proyecto / About the Project

Esta plataforma fue diseñada y desarrollada como parte de un sistema embebido e IoT para el control remoto y monitoreo de una **Excavadora IoT**. Permite operar los movimientos de tracción, el brazo mecánico y la rotación mediante controles táctiles duales, además de activar luces, claxon, paros de emergencia y secuencias de demostración automatizadas. El sistema registra cada comando emitido y los almacena en una base de datos relacional alojada en **AWS RDS**, ofreciendo una interfaz de supervisión histórica en tiempo real.

---

## ✨ Características Principales / Key Features

* 🎮 **Joysticks Táctiles Duales (`nipplejs`):** Interfaz tipo gamepad con control independiente para tracción y para el sistema de brazo/rotación.
* 📱 **Adaptabilidad Híbrida Inteligente:**
  * **Laptops / Escritorio:** Interfaz completamente estática (`overflow: hidden`), bloqueada en una sola vista tipo aplicación de escritorio sin barras de desplazamiento innecesarias.
  * **Dispositivos Móviles (Smartphones/Tablets):** Desplazamiento vertical fluido, optimización táctil (`touch-action: none`) y redimensionamiento dinámico de los joysticks para una experiencia cómoda.
* ⚡ **Comunicación en Tiempo Real:** Integración mediante WebSockets (`websocket.js`) y APIs REST para retroalimentación instantánea del estado de la excavadora.
* 📊 **Módulo de Monitoreo Dedicado (`monitoreo.html`):** Visualización del último estado reportado y tabla histórica con registros sincronizados desde AWS RDS.

---

## 🛠️ Arquitectura y Stack Tecnológico / Architecture & Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **Framework de Estilos:** Bootstrap 5.3 (con temas personalizados y diseño glassmorphism).
* **Librerías Externas:** 
  * `NippleJS` (Controladores de joystick táctil).
  * `Font Awesome 6.4` (Iconografía de alta calidad).
* **Backend y Conectividad:** Node.js / API REST / WebSockets (`wss://`).
* **Base de Datos:** AWS RDS (Relational Database Service).

---

## 📁 Estructura del Proyecto / Project Structure

La distribución real y organizada del código fuente en el repositorio es la siguiente:

```text
control-iot/
│
├── assets/
│   ├── css/
│   │   └── styles.css          # Estilos globales y reglas responsive (Laptops estáticas / Celulares con scroll)
│   ├── img/
│   │   └── fondo.jpeg          # Imagen de fondo institucional con gradiente glassmorphic
│   └── js/
│       ├── api.js              # Gestión de peticiones HTTP con la API REST
│       ├── app.js              # Lógica principal del panel de control y joysticks
│       ├── config.js           # Variables de configuración y endpoints
│       ├── joystick.js         # Inicialización y eventos táctiles de nipplejs
│       ├── monitoreo.js        # Lógica de actualización de la tabla histórica
│       └── websocket.js        # Comunicación en tiempo real WSS
│
├── favicon.ico                 # Icono oficial de la plataforma
├── index.html                  # Panel de Control interactivo (Gamepad)
├── monitoreo.html              # Panel de Supervisión y Registro Histórico (AWS RDS)
└── README.md                   # Documentación oficial del proyecto
```

---

## 📥 Instalación y Configuración / Installation & Setup

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/control-iot.git
   cd control-iot
   ```

2. **Abrir en tu entorno de desarrollo:**
   Puedes utilizar editores como **Visual Studio Code** e iniciar un servidor local (por ejemplo, mediante la extensión *Live Server*).

3. **Configuración de Conectividad:**
   Verifica los archivos de configuración (`assets/js/config.js`) para apuntar correctamente a la dirección IP de tu servidor WebSocket y API REST.

---

## 📱 Diseño Adaptable (Responsive & Viewport)

El sistema implementa reglas de medios (`@media queries`) dedicadas:
* **Escritorio (`min-width: 992px`):** Se aplica un bloqueo estricto de desbordamiento (`overflow: hidden`) y un ajuste milimétrico de altura mediante `calc(100vh - 110px)`, evitando cualquier scroll indeseado en la laptop.
* **Móviles (`max-width: 991.98px`):** Se libera el scroll vertical de forma natural, adaptando los anchos de los paneles y reduciendo el radio de los joysticks (`170px`) para garantizar una interacción táctil perfecta en pantallas verticales.

---

## 🎓 Créditos / Autoría

* **Institución:** TecNM Campus Pachuca (Instituto Tecnológico de Pachuca)
* **Carrera:** Ingeniería en Sistemas Computacionales
* **Desarrolladora:** Damaris Domínguez Zapata
* **Año:** 2026

---

## 📄 Licencia / License

Este proyecto se encuentra bajo los términos de la licencia [MIT](LICENSE).