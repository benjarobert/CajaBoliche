// back/services/estadisticaService.js
// Capa de acceso a datos de estadisticas y cajas.
// Es el unico archivo de este flujo que habla SQL: ni el controller ni el
// front saben que del otro lado hay un SQL Server.
const { sql, getPool } = require("../config/db");

// -> usp_resumen_recaudacion
// El SP hace dos SELECT: primero el total general y despues el desglose por
// medio de pago. Por eso se leen los recordsets (plural), uno por SELECT.
// Sin cajaId devuelve el total de toda la noche.
async function resumenRecaudacion(cajaId) {
  const pool = await getPool();
  const peticion = pool.request();
  peticion.input("caja_id", sql.Int, cajaId ? Number(cajaId) : null);

  const resultado = await peticion.execute("usp_resumen_recaudacion");
  return {
    general: resultado.recordsets[0][0], // { total_recaudado, cantidad_ventas }
    porMedio: resultado.recordsets[1],   // una fila por medio de pago
  };
}

// -> usp_abrir_caja
// El id de la caja nueva lo genera la base con IDENTITY y vuelve por un
// parametro OUTPUT, no por un SELECT.
async function abrirCaja({ cajeroId, barra, fondoInicial }) {
  const pool = await getPool();
  const peticion = pool.request();
  peticion.input("cajero_id", sql.Int, cajeroId);
  peticion.input("barra", sql.VarChar(10), barra);
  peticion.input("fondo_inicial", sql.Decimal(12, 2), fondoInicial);
  peticion.output("caja_id", sql.Int);

  const resultado = await peticion.execute("usp_abrir_caja");
  return { cajaId: resultado.output.caja_id };
}

// -> usp_cerrar_caja
// El SP valida que la caja exista (THROW 50008) y que no este ya cerrada
// (THROW 50009). Esa regla vive en la base, no aca.
async function cerrarCaja(id) {
  const pool = await getPool();
  const peticion = pool.request();
  peticion.input("caja_id", sql.Int, Number(id));

  await peticion.execute("usp_cerrar_caja");
  return { id: Number(id), estado: "cerrada" };
}

// -> v_caja_resumen
// Consulta directa a la vista: una sola consulta, por eso el resultado se
// lee de recordset (singular).
async function listarCajas() {
  const pool = await getPool();
  const resultado = await pool.request().query("SELECT * FROM v_caja_resumen");
  return resultado.recordset;
}

module.exports = { resumenRecaudacion, abrirCaja, cerrarCaja, listarCajas };