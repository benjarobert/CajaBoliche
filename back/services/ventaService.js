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

// Anula una venta llamando al procedimiento usp_anular_venta.
// El procedimiento se encarga de dos controles antes de tocar nada:
// que quien anula sea un admin activo con el PIN correcto (THROW 50012) y
// que la venta exista y siga en estado 'pagada' (THROW 50013).
// Despues del UPDATE, el trigger trg_venta_anular deshace la venta solo:
// devuelve el stock, le devuelve el saldo a la entrada si se pago con una,
// y le resta el total a la caja. Por eso aca no hay ninguna cuenta.
async function anularVenta({ ventaId, usuarioId, pin }) {
  const pool = await getPool();
  const peticion = pool.request();

  peticion.input("venta_id", sql.Int, ventaId);
  peticion.input("anulada_por", sql.Int, usuarioId);
  // En la tabla usuario el PIN vive en la columna pin_hash. Este proyecto no
  // tiene hasheo: el seed guarda el texto tal cual, asi que lo mandamos como
  // viene. En un sistema real aca iria la comparacion contra un hash.
  peticion.input("pin_hash", sql.VarChar(255), pin);

  await peticion.execute("usp_anular_venta");
  return { ventaId };
}

module.exports = { listarProductos, registrarVenta, anularVenta };
