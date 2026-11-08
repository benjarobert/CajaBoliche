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

module.exports = { getProductos };
