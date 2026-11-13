# Panel de Control IoT | Excavadora Inteligente

Interfaz gráfica frontend de alto rendimiento diseñada con un enfoque **Mobile First**, desarrollada para el control en tiempo real, supervisión de estados operacionales y ejecución de rutinas de demostración de una excavadora robótica IoT. El sistema se comunica de manera síncrona y asíncrona con un backend modular basado en **FastAPI**, desplegado en la nube e integrado con una base de datos relacional en **Amazon RDS (MySQL)**.

---

## 📋 Tabla de Contenidos
1. [Arquitectura y Diseño del Sistema](#-arquitectura-y-diseño-del-sistema)
2. [Tecnologías y Stack Utilizado](#-tecnologías-y-stack-utilizado)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Características Principales](#-características-principales)
5. [Requisitos Previos y Entorno](#-requisitos-previos-y-entorno)
6. [Guía de Ejecución Local](#-guía-de-ejecución-local)
7. [Puntos de Integración con la API (AWS)](#-puntos-de-integración-con-la-api-aws)
8. [Despliegue y Publicación en GitHub Pages](#-despliegue-y-publicación-en-github-pages)

---

## 🏛️ Arquitectura y Diseño del Sistema

El proyecto implementa una separación estricta de responsabilidades (SoC):
* **Capa de Interfaz (UI/UX):** Diseñada bajo el paradigma *Mobile First* utilizando **Bootstrap 5** y estilos personalizados con efectos de cristal (*Glassmorphism*). Adapta su geometría para operar con total fluidez tanto en dispositivos móviles (orientación vertical u horizontal) como en pantallas de escritorio.
* **Capa de Control Táctil y de Eventos:** Emplea la librería **NippleJS** para la creación de joysticks virtuales de doble eje, permitiendo un mapeo preciso de los comandos de tracción y del brazo mecánico con soporte simultáneo para gestos táctiles y ratón.
* **Capa de Comunicación en Tiempo Real:** 
  * **Canal WSS (WebSocket):** Abre un canal bidireccional de baja latencia para la transmisión instantánea de ráfagas de movimiento hacia el microcontrolador (ESP8266/ESP32).
  * **Canal REST API:** Centraliza las consultas de estado, historial de operaciones en base de datos y la ejecución de rutinas de demostración programadas.

---

## 🛠️ Tecnologías y Stack Utilizado

* **HTML5 & CSS3:** Estructuración semántica y diseño visual responsivo.
* **Bootstrap 5.3:** Framework CSS para componentes adaptativos y grillas fluidas.
* **JavaScript (ES6 Modules):** Lógica asíncrona basada en promesas, `async/await` y gestión de eventos del DOM.
* **NippleJS (v0.10.1):** Motor de joysticks interactivos de alta precisión.
* **FontAwesome (v6.4.0):** Iconografía vectorial para indicadores y mandos de control.
* **FastAPI & Uvicorn (Backend AWS):** Proveedor de servicios REST y WebSockets.
* **Amazon RDS (MySQL):** Motor de persistencia para el historial de comandos y auditoría.

---

## 📂 Estructura del Proyecto

```text
control-iot/
├── assets/
│   ├── img/
│   │   └── fondo.jpeg          # Imagen de fondo estilizada para el panel
│   └── favicon.ico             # Icono institucional de la pestaña del navegador
├── css/
│   └── (Estilos integrados y adaptados para componentes visuales)
├── js/
│   ├── api.js                  # Módulo de consumo REST y peticiones HTTP
│   ├── app.js                  # Lógica principal, estados de interfaz y sincronización
│   ├── config.js               # Parámetros de configuración y endpoints globales
│   ├── joystick.js             # Inicialización y mapeo de eventos de NippleJS
│   └── websocket.js            # Gestión de la sesión WSS en tiempo real
├── index.html                  # Interfaz principal de control (Single Page Application)
└── README.md                   # Documentación técnica del proyecto