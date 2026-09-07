# 🏟️ Sistema de Gestión y Reservas de Canchas Deportivas

Bienvenido al repositorio central del **Sistema de Gestión y Reservas de Canchas Deportivas**. Esta solución integral está diseñada para digitalizar la administración operativa y financiera de complejos deportivos que disponen de canchas de Futsal, Wally, Racket y otras disciplinas.

---

## 🧭 Navegación Rápida de Documentación

Si eres un **agente de Inteligencia Artificial** o un desarrollador integrándose al proyecto, consulta los documentos de referencia técnica según tu necesidad:

| Documento | Descripción | Audiencia / Uso |
| :--- | :--- | :--- |
| **[AI_CONTEXT.md](./AI_CONTEXT.md)** | **Contexto Maestro para Agentes IA**. Reglas de oro, directrices de arquitectura y restricciones inviolables. | 🤖 Agentes IA / Prompting |
| **[01. Arquitectura y Principios SOLID](./docs/01-architecture-solid.md)** | Especificación detallada de las 4 capas (Dominio, Aplicación, Infraestructura, Presentación) y ejemplos SOLID. | 🏛️ Arquitectura de Software |
| **[02. Base de Datos y Supabase](./docs/02-database-supabase.md)** | Script DDL oficial, diccionario de datos de las 8 tablas, triggers, RLS y configuración de Storage. | 🗄️ Backend / DB Admins |
| **[03. Reglas de Negocio](./docs/03-business-rules.md)** | Invariantes de dominio: bloqueo de 5 min, anticipo del 25%, horarios de 1h exacta, inmutabilidad de precios. | 📋 Lógica de Negocio |
| **[04. Matriz de Historias de Usuario](./docs/04-user-stories-matrix.md)** | Las 74 Historias de Usuario (Cliente: 25, Secretaria: 26, Admin: 25) con criterios de aceptación y trazabilidad. | 🎯 QA / Product / Devs |
| **[05. Especificación Backend (NestJS)](./docs/05-backend-spec-nestjs.md)** | Estructura modular en NestJS 11, DTOs, casos de uso, interfaces, repositorios y autenticación JWT. | ⚙️ Backend Developers |
| **[06. Especificación Frontend (Angular)](./docs/06-frontend-spec-angular.md)** | Arquitectura en Angular 20 Standalone, Signals, componentes por rol (Cliente, Secretaria, Admin). | 💻 Frontend Developers |
| **[07. Guía Operativa para Agentes de IA](./docs/07-ai-agent-guide.md)** | Flujo de trabajo estándar paso a paso para implementar nuevas funcionalidades sin romper capas. | 🤖 Agentes IA / Contribución |

---

## 🏗️ Arquitectura General del Sistema

El sistema implementa una **Arquitectura en Capas Limpia (Clean Layered Architecture)** siguiendo escrupulosamente los principios **SOLID**:

```
                              ┌──────────────────────────────────────────────┐
                              │             Frontend (Angular 20)            │
                              │   - Standalone Components & Signals          │
                              │   - Portales: Cliente, Secretaria, Admin     │
                              └──────────────────────┬───────────────────────┘
                                                     │ HTTP REST / JSON
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Backend (NestJS 11)                                          │
│                                                                                                    │
│  [Capa de Presentación]   ──▶  Controladores HTTP, DTOs de Entrada/Salida, Guards de Roles         │
│                                           │                                                        │
│  [Capa de Aplicación]     ──▶  Casos de Uso (1 acción por clase), Orquestación de Servicios        │
│                                           │                                                        │
│  [Capa de Dominio]        ──▶  Entidades, Value Objects, Puertos de Repositorio (Interfaces)       │
│                                           ▲                                                        │
│  [Capa de Infraestructura]──▶  Adaptadores Supabase (Implementación de Repositorios), Storage      │
└───────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                            │ SQL / REST
                                            ▼
                              ┌──────────────────────────────────────────────┐
                              │              Supabase Cloud                  │
                              │   - PostgreSQL 15+ (8 Tablas Relacionales)   │
                              │   - Storage Buckets (Comprobantes y QRs)     │
                              │   - Autenticación y RLS Policies             │
                              └──────────────────────────────────────────────┘
```

---

## 📦 Estructura del Monorepo

```
Calidad/
├── AI_CONTEXT.md                     # Contexto de alto nivel para asistentes IA
├── README.md                         # Documento de bienvenida y mapa general
├── docs/                             # Documentación técnica exhaustiva
│   ├── 01-architecture-solid.md
│   ├── 02-database-supabase.md
│   ├── 03-business-rules.md
│   ├── 04-user-stories-matrix.md
│   ├── 05-backend-spec-nestjs.md
│   ├── 06-frontend-spec-angular.md
│   └── 07-ai-agent-guide.md
├── back-canchas-deportivas/          # Proyecto Backend en NestJS 11
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── common/                   # Filtros, decoradores, guards e interceptores compartidos
│       └── modules/                  # Módulos por capas: auth, complexes, courts, reservations...
└── FrontCanchasDeportivas/           # Proyecto Frontend en Angular 20
    ├── package.json
    ├── angular.json
    └── src/
        └── app/
            ├── core/                 # Servicios globales, interceptores HTTP, guards de ruta
            ├── shared/               # Componentes reusables (botones, modales, pipes)
            └── features/             # Vistas agrupadas por rol (client, secretary, admin)
```

---

## 👥 Perfiles de Usuario del Sistema

1. **Cliente**:
   - Registro con CI, teléfono y correo electrónico.
   - Exploración de complejos y tipos de canchas (Futsal, Wally, Racket).
   - Consulta de disponibilidad en calendario interactivo.
   - Bloqueo temporal de horario por **5 minutos**.
   - Pago del **25% de anticipo** escaneando el código QR del complejo y carga de comprobante de pago.
   - Seguimiento del estado de validación y pago del **75% restante en ventanilla** al ingresar.

2. **Secretaria / Cajera**:
   - Panel operativo con reservas del día agrupadas por estado.
   - Validación o rechazo con motivo de comprobantes de pago de anticipos.
   - Registro de reservas manuales (solicitadas presencialmente o por WhatsApp).
   - Control de solicitudes temporales y liberación de horarios expirados.
   - Recepción del pago final (efectivo/QR) y habilitación de ingreso a cancha.
   - Gestión de inasistencias (*no-shows*) y reprogramaciones por incidentes.
   - Arqueo diario y cierre formal de turno de caja.

3. **Administrador / Propietario**:
   - Mantenimiento integral de complejos y canchas.
   - Configuración de precios por hora (con preservación histórica inmutable en reservas existentes).
   - Programación de mantenimientos e inhabilitación por incidentes.
   - Definición de calendarios habituales y excepciones de fechas específicas.
   - Supervisión financiera de ingresos y pagos pendientes.
   - Análisis de negocio: identificación de **horas de mayor afluencia** y **canchas con menor ocupación** para toma de decisiones estratégicas.

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- Node.js versión 20 o 22 LTS
- Gestor de paquetes `npm`
- Proyecto activo en [Supabase](https://supabase.com/)

### 1. Configuración de Base de Datos
1. Accede a tu consola de Supabase -> **SQL Editor**.
2. Ejecuta el script DDL provisto en [`docs/02-database-supabase.md`](./docs/02-database-supabase.md).
3. Configura los buckets de Storage `payment-receipts` y `complex-qrs` con permisos públicos de lectura y autenticados para escritura.

### 2. Backend (NestJS)
```bash
cd back-canchas-deportivas
npm install
# Crear archivo .env basado en las variables requeridas (ver docs/05-backend-spec-nestjs.md)
npm run start:dev
```
El servidor backend se levantará en `http://localhost:3000`.

### 3. Frontend (Angular 20)
```bash
cd FrontCanchasDeportivas
npm install
npm start
```
La aplicación cliente se levantará en `http://localhost:4200`.

---

## 📜 Licencia y Contacto
Proyecto académico y profesional de Ingeniería de Software y Aseguramiento de Calidad.
