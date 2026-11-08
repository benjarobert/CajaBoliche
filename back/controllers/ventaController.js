// back/controllers/ventaController.js
// Capa HTTP del flujo de cobro: traduce la peticion web en una llamada al
// service y devuelve la respuesta en JSON. No sabe nada de SQL.
// No lleva try/catch: si algo falla, el asyncHandler manda el error al
// middleware errorHandler, que lo traduce al codigo HTTP que corresponde.
const ventaService = require("../services/ventaService");

// GET /api/productos
async function getProductos(req, res) {
  const productos = await ventaService.listarProductos();
  res.json(productos);
}

// POST /api/ventas
// Espera un cuerpo con la caja, el medio de pago y los items del carrito:
//   { "cajaId": 1, "medioPago": "efectivo",
//     "items": [ { "producto_id": 1, "cantidad": 2 } ] }
// Responde 201 con el id de la venta creada.
async function postVenta(req, res) {
  const { cajaId, medioPago, cuotas, codigoEntrada, items } = req.body;

  const { ventaId } = await ventaService.registrarVenta({
    cajaId,
    medioPago,
    cuotas,
    codigoEntrada,
    items,
  });

  res.status(201).json({ ventaId });
}

module.exports = { getProductos, postVenta };
