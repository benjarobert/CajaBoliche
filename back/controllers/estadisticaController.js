// back/controllers/estadisticaController.js
// Capa HTTP de estadisticas y cajas: traduce la peticion web en una llamada
// al service y devuelve la respuesta en JSON. No sabe nada de SQL.
// No lleva try/catch: si algo falla, el asyncHandler manda el error al
// middleware errorHandler, que lo traduce al codigo HTTP que corresponde.
const estadisticaService = require("../services/estadisticaService");

// GET /api/estadisticas/recaudacion?cajaId=1   (cajaId es opcional)
async function resumenRecaudacion(req, res) {
  const { cajaId } = req.query;
  const resumen = await estadisticaService.resumenRecaudacion(cajaId);
  res.json(resumen);
}

// GET /api/cajas
async function listarCajas(req, res) {
  const cajas = await estadisticaService.listarCajas();
  res.json(cajas);
}

// POST /api/cajas/abrir
// Espera { "cajeroId": 2, "barra": "general", "fondoInicial": 20000 }
async function abrirCaja(req, res) {
  const { cajeroId, barra, fondoInicial } = req.body;
  const caja = await estadisticaService.abrirCaja({ cajeroId, barra, fondoInicial });
  res.status(201).json(caja);
}

// PUT /api/cajas/:id/cerrar
async function cerrarCaja(req, res) {
  const caja = await estadisticaService.cerrarCaja(req.params.id);
  res.json(caja);
}

module.exports = { resumenRecaudacion, listarCajas, abrirCaja, cerrarCaja };