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

// POST /api/ventas/:id/anular
// El id de la venta viene en la URL y las credenciales en el cuerpo:
//   { "usuarioId": 1, "pin": "hash_admin_demo" }
// Que el usuario sea admin y que el PIN sea correcto lo valida el
// procedimiento, no esta capa: la regla vive en la base, que es la unica
// que no se puede saltear.
async function postAnularVenta(req, res) {
  // Lo que llega por la URL siempre es texto, hay que pasarlo a numero.
  const ventaId = Number(req.params.id);
  const { usuarioId, pin } = req.body;

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({
      error: { codigo: null, mensaje: "El id de la venta no es valido" },
    });
  }

  if (!usuarioId || !pin) {
    return res.status(400).json({
      error: { codigo: null, mensaje: "Faltan el usuario y el PIN para anular" },
    });
  }

  await ventaService.anularVenta({ ventaId, usuarioId, pin });
  res.json({ ventaId, estado: "anulada" });
}

module.exports = { getProductos, postVenta, postAnularVenta };
