// back/controllers/estadisticaController.js
const estadisticaService = require("../services/estadisticaService");

async function resumenRecaudacion(req, res) {
  try {
    const { cajaId } = req.query; // opcional: /recaudacion?cajaId=1
    const data = await estadisticaService.resumenRecaudacion(cajaId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listarCajas(req, res) {
  try {
    const data = await estadisticaService.listarCajas();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function abrirCaja(req, res) {
  try {
    const data = await estadisticaService.abrirCaja(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function cerrarCaja(req, res) {
  try {
    const data = await estadisticaService.cerrarCaja(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { resumenRecaudacion, listarCajas, abrirCaja, cerrarCaja };