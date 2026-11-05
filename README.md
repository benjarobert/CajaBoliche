# Sistema de ventas de boliche

Trabajo Final Integrador — Programación II — Ciclo 2026
Instituto Superior Villa del Rosario · Lic. Romina Laura Frandino

## Integrantes

- **Benjamín Bertino** — Flujo de cobro (venta, anular)
- **Juan Pablo Bertino** — Tablero (búsqueda con filtros, cambio de estado de entradas)
- **Tomás Suarez** — Estadísticas y caja (recaudación, abrir/cerrar)

## Rubro

POS para la barra de un boliche. Dos barras (general y VIP), stock por barra, cobro con 5 medios de pago (efectivo, débito, crédito, QR, entrada con crédito), apertura y cierre de caja.

## Cómo levantarlo

1. Correr el script en SQL Server:
2. Copiar `back/env.ejemplo` a `back/.env` y completarlo con los datos del servidor local.
3. Instalar dependencias:
4. Levantar el servidor:
5. Abrir en el navegador: `http://localhost:3000`

## Endpoints de la API

| Método | Ruta | Dueño | Hace |
|---|---|---|---|
| GET  | `/api/productos`               | Benjamín | lista productos activos |
| POST | `/api/ventas`                  | Benjamín | registra una venta |
| POST | `/api/ventas/:id/anular`       | Benjamín | anula una venta (requiere admin) |
| GET  | `/api/ventas`                  | Juan     | busca ventas con filtros |
| POST | `/api/entradas/:id/estado`     | Juan     | cambia el estado de una entrada |
| GET  | `/api/estadisticas/recaudacion`| Tomás    | resumen por medio de pago |
| GET  | `/api/cajas`                   | Tomás    | lista cajas |
| POST | `/api/cajas/abrir`             | Tomás    | abre una caja nueva |
| POST | `/api/cajas/:id/cerrar`        | Tomás    | cierra una caja |

## Base de datos

6 tablas (`usuario`, `producto`, `entrada`, `caja`, `venta`, `venta_item`), 3 triggers, 7 procedimientos almacenados y 2 vistas. Documentación completa en `db/`.