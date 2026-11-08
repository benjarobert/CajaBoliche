// back/services/estadisticaService.js
// Esqueleto: por ahora devuelve datos falsos (dummy).
// Más adelante cada función llamará a su procedimiento almacenado.

// -> usp_resumen_recaudacion (cajaId opcional: sin cajaId = total general)
async function resumenRecaudacion(cajaId) {
  return {
    caja_id: cajaId ?? null,
    total_recaudado: 150000,
    cantidad_ventas: 32,
    por_medio_pago: [
      { medio_pago: "efectivo", cantidad_ventas: 15, recaudacion: 70000 },
      { medio_pago: "debito",   cantidad_ventas: 10, recaudacion: 50000 },
      { medio_pago: "qr",       cantidad_ventas: 7,  recaudacion: 30000 },
    ],
  };
}

// -> usp_abrir_caja (recibe cajero_id, barra, fondo_inicial)
async function abrirCaja(datos) {
  return {
    id: 1,
    barra: datos?.barra ?? "general",
    cajero_id: datos?.cajero_id ?? 2,
    fondo_inicial: datos?.fondo_inicial ?? 20000,
    estado: "abierta",
  };
}

// -> usp_cerrar_caja (recibe el id de la caja)
async function cerrarCaja(id) {
  return { id: Number(id), estado: "cerrada" };
}

// -> v_caja_resumen (listado de cajas)
async function listarCajas() {
  return [
    { id: 1, barra: "general", cajero: "Juan",    estado: "abierta", fondo_inicial: 20000, total_vendido: 90000 },
    { id: 2, barra: "vip",     cajero: "Micaela", estado: "abierta", fondo_inicial: 20000, total_vendido: 60000 },
  ];
}

// back/services/estadisticaService.js
const { pool, sql } = require("../config/db"); // ajustá según cómo exporte db.js

// -> usp_resumen_recaudacion: devuelve DOS result sets (por eso recordsets, plural)
async function resumenRecaudacion(cajaId) {
  const request = pool.request();
  request.input("caja_id", sql.Int, cajaId ? Number(cajaId) : null);
  const result = await request.execute("usp_resumen_recaudacion");
  return {
    general: result.recordsets[0][0], // { total_recaudado, cantidad_ventas }
    porMedio: result.recordsets[1],   // una fila por medio de pago
  };
}

// -> usp_abrir_caja: tiene un parámetro OUTPUT (caja_id)
async function abrirCaja({ cajeroId, barra, fondoInicial }) {
  const request = pool.request();
  request.input("cajero_id", sql.Int, cajeroId);
  request.input("barra", sql.VarChar(10), barra);
  request.input("fondo_inicial", sql.Decimal(12, 2), fondoInicial);
  request.output("caja_id", sql.Int);
  const result = await request.execute("usp_abrir_caja");
  return { cajaId: result.output.caja_id };
}

// -> usp_cerrar_caja
async function cerrarCaja(id) {
  const request = pool.request();
  request.input("caja_id", sql.Int, Number(id));
  await request.execute("usp_cerrar_caja");
  return { id: Number(id), estado: "cerrada" };
}

// -> consulta directa a la vista (sin parámetros)
async function listarCajas() {
  const result = await pool.request().query("SELECT * FROM v_caja_resumen");
  return result.recordset; // acá es recordset (singular): una sola consulta
}

module.exports = { resumenRecaudacion, abrirCaja, cerrarCaja, listarCajas };