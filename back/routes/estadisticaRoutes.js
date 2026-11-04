// back/routes/estadisticaRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/estadisticaController");

router.get("/estadisticas/recaudacion", controller.resumenRecaudacion);
router.get("/cajas", controller.listarCajas);
router.post("/cajas/abrir", controller.abrirCaja);
router.put("/cajas/:id/cerrar", controller.cerrarCaja);

module.exports = router;