// back/services/ventaService.js
// Capa de acceso a datos del flujo de cobro.
// Es el unico archivo de este flujo que habla SQL: ni el controller ni el
// front saben que del otro lado hay un SQL Server.
const { getPool } = require("../config/db");

// Catalogo de lo que se puede vender esta noche.
// Devuelve solo los productos activos, ordenados para mostrarlos agrupados
// por categoria en la pantalla de cobro.
async function listarProductos() {
  const pool = await getPool();
  const resultado = await pool.request().query(
    `SELECT id, nombre, sabor, tamanio, categoria, precio, stock, barra
       FROM producto
      WHERE activo = 1
      ORDER BY categoria, nombre`
  );
  return resultado.recordset;
}

module.exports = { listarProductos };
