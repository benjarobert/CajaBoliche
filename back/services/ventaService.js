// back/services/ventaService.js
// Capa de acceso a datos del flujo de cobro.
// Es el unico archivo de este flujo que habla SQL: ni el controller ni el
// front saben que del otro lado hay un SQL Server.
const { sql, getPool } = require("../config/db");

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

// Registra una venta llamando al procedimiento usp_registrar_venta.
// El total NO se calcula aca: lo calcula el procedimiento leyendo los
// precios de la tabla producto, y los triggers descuentan el stock y el
// saldo de la entrada. Devuelve el id de la venta recien creada.
async function registrarVenta({ cajaId, medioPago, cuotas, codigoEntrada, items }) {
  // Nos quedamos solo con el id y la cantidad de cada item. Aunque el front
  // mande un precio, nunca llega a la base: el precio sale de producto.
  const itemsParaSql = (items || []).map((item) => ({
    producto_id: item.producto_id,
    cantidad: item.cantidad,
  }));

  const pool = await getPool();
  const peticion = pool.request();

  // Cada valor viaja como parametro tipado, nunca pegado dentro del SQL.
  peticion.input("caja_id", sql.Int, cajaId);
  peticion.input("medio_pago", sql.VarChar(20), medioPago);
  // La tabla venta exige cuotas solo cuando se paga con credito, y exige
  // codigo de entrada solo cuando se paga con entrada. Mandamos NULL en el
  // resto de los casos para no violar esas restricciones.
  peticion.input("cuotas", sql.Int, medioPago === "credito" ? cuotas : null);
  peticion.input(
    "codigo_entrada",
    sql.VarChar(50),
    medioPago === "entrada" ? codigoEntrada : null
  );
  peticion.input("items_json", sql.NVarChar(sql.MAX), JSON.stringify(itemsParaSql));
  peticion.output("venta_id", sql.Int);

  const resultado = await peticion.execute("usp_registrar_venta");
  return { ventaId: resultado.output.venta_id };
}

module.exports = { listarProductos, registrarVenta };
