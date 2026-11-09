// back/services/tableroService.js
// Capa de acceso a datos del tablero: busqueda de ventas con filtros y
// cambio de estado de las entradas.
// Es el unico archivo del tablero que habla SQL: el controller no sabe que
// del otro lado hay un SQL Server.
const { sql, getPool } = require("../config/db");

// Busca ventas llamando al procedimiento usp_buscar_ventas.
// Todos los filtros son opcionales: los que no vienen se mandan como NULL y
// el procedimiento los ignora (la condicion "@filtro IS NULL OR ..." deja
// pasar todo). Devuelve las ventas de la mas nueva a la mas vieja.
async function buscarVentas(filtros = {}) {
  const pool = await getPool();
  const peticion = pool.request();

  // Cada filtro viaja como parametro tipado, nunca pegado dentro del SQL.
  // El "|| null" convierte el texto vacio ("") en NULL.
  peticion.input("fecha_desde", sql.Date, filtros.fechaDesde || null);
  peticion.input("fecha_hasta", sql.Date, filtros.fechaHasta || null);
  peticion.input("barra", sql.VarChar(10), filtros.barra || null);
  peticion.input("medio_pago", sql.VarChar(20), filtros.medioPago || null);
  peticion.input("estado", sql.VarChar(10), filtros.estado || null);
  peticion.input("texto", sql.NVarChar(100), filtros.texto || null);

  const resultado = await peticion.execute("usp_buscar_ventas");
  return resultado.recordset;
}

// Cambia el estado de una entrada llamando a usp_cambiar_estado_entrada.
// Las reglas viven en el procedimiento, no aca:
//   - que la entrada exista (THROW 50016)
//   - que el estado destino sea valido (THROW 50014)
//   - que la transicion este permitida: activa -> consumida/caducada/anulada
//     y consumida -> caducada (THROW 50014)
// Si algo no se cumple, el error sube y el errorHandler lo traduce a 400/404.
async function cambiarEstadoEntrada(entradaId, nuevoEstado) {
  const pool = await getPool();
  const peticion = pool.request();

  peticion.input("entrada_id", sql.Int, entradaId);
  peticion.input("nuevo_estado", sql.VarChar(10), nuevoEstado);

  await peticion.execute("usp_cambiar_estado_entrada");
  return { entradaId, estado: nuevoEstado };
}

module.exports = { buscarVentas, cambiarEstadoEntrada };
