# Proposal: Console UI & Dashboard for SDK

## 1. Overview
Basados en la referencia (`reference-console-app`), proponemos la creación de una capa de interfaz (UI) interactiva para el SDK. Esta capa funcionará como un panel de control (Dashboard) o aplicación de Terminal (TUI) para gestionar y visualizar el estado del bot en tiempo real.

## 2. Objetivos
- **Mejorar la Experiencia del Desarrollador (DX):** Proveer un frontend interactivo que facilite la configuración y monitoreo del bot (simulando la experiencia de herramientas CLI modernas).
- **Integración con SDK Básico:** La UI consumirá directamente el API pública expuesta en `src/index.ts`.

## 3. Arquitectura del Frontal (Vistas Propuestas)

### 3.1. Landing / Overview
- **Estado del Bot:** Conexión con Telegram (Online/Offline/Polling).
- **Estadísticas Rápidas:** Mensajes procesados, chats activos (basado en `ChatTracker`), advertencias o errores recientes de `Logger`.

### 3.2. Gestión de Comandos y Ajustes (Settings)
- **Vista Interactiva de Comandos:** Interfaz para listar, añadir, habilitar o deshabilitar comandos en tiempo de ejecución interactuando con `CommandHandler`.
- **Ajustes:** Configuración de credenciales de Telegram (modo `BotFather Settings`).

### 3.3. Monitoreo: Logs y Stream de Mensajes
- **Visor de Logs (Real-time):** Interfaz para consultar los logs del bot, filtrando por nivel (Info, Error, Debug) utilizando la clase `Logger`.
- **Stream de Mensajes:** Visualización de conversaciones activas segmentadas por chat (aprovechando `ChatTracker` y los handlers de mensajes de `BotHandler`).

## 4. Referencias y Próximos Pasos
- **Inspiración:** Se tomará la arquitectura de renderizado interactivo y componentes de consola presentes en `reference-console-app`.
- **Siguiente Paso (para confirmación del PO):** Desarrollar un prototipo de la app de consola/dashboard en la carpeta `examples/portable-app` o integrarlo como un submódulo UI del SDK.
