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

Hace falta tener instalados **Node.js 18 o superior** y **SQL Server** (alcanza con la edición Express).

### 1. Clonar el repositorio

```bash
git clone https://github.com/benjarobert/CajaBoliche.git
cd CajaBoliche
```

### 2. Crear la base de datos

`db/script.sql` es autosuficiente: crea la base `Boliche.RobertBertinoSuarez`, crea el login `prog2` con sus permisos, las 6 tablas con sus FK, los datos de ejemplo, los 3 triggers, los 7 procedimientos y las 2 vistas. Se puede correr las veces que haga falta sin que rompa nada.

Desde la línea de comandos, con autenticación de Windows:

```bash
sqlcmd -S localhost -E -i db/script.sql
```

Si la instancia tiene nombre y `localhost` solo no alcanza, usar `-S localhost\SQLEXPRESS`.

También se puede abrir `db/script.sql` en SQL Server Management Studio y ejecutarlo con F5. No hace falta seleccionar ninguna base antes: el script la crea y se posiciona solo con un `USE`.

### 3. Configurar las credenciales

```bash
cd back
copy env.ejemplo .env
```

En Linux o Mac, `cp env.ejemplo .env`.

Los valores que trae la plantilla ya coinciden con lo que crea el script, así que normalmente no hay que tocar nada. Si tu SQL Server no escucha en `localhost:1433`, ajustá `DB_SERVER` y `DB_PORT`.

El `.env` real nunca se sube al repo: está en el `.gitignore`.

### 4. Instalar dependencias y levantar el servidor

```bash
npm install
npm start
```

Durante el desarrollo, `npm run dev` levanta lo mismo con nodemon y reinicia solo al guardar.

### 5. Abrir el sistema

Entrar a `http://localhost:3000`. El back sirve el front con `express.static`, así que no hay que levantar un segundo servidor para las páginas.

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
| PUT  | `/api/cajas/:id/cerrar`        | Tomás    | cierra una caja |

## Base de datos

6 tablas (`usuario`, `producto`, `entrada`, `caja`, `venta`, `venta_item`), 3 triggers, 7 procedimientos almacenados y 2 vistas.

Todo está en un único archivo, `db/script.sql`, dividido en siete secciones numeradas y comentadas en castellano:

| Sección | Qué hace |
|---|---|
| 0 | Crea la base, el login `prog2` y sus permisos |
| 1 | Las 6 tablas, con sus claves foráneas y sus `CHECK` |
| 2 | Los índices (tres son filtrados) |
| 3 | Los datos de ejemplo, incluida una caja abierta para hoy |
| 4 | Los 3 triggers: stock, saldo de entradas y total de caja |
| 5 | Los 7 procedimientos, todos con prefijo `usp_` |
| 6 | Las 2 vistas de lectura |

Las reglas de negocio viven en la base, no en el JavaScript: los `CHECK` de las tablas, los triggers y los `THROW` de los procedimientos (códigos propios desde el 50001). El back traduce esos códigos al estado HTTP que corresponde.