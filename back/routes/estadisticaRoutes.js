// back/routes/estadisticaRoutes.js
// Rutas de estadisticas y cajas. El prefijo /api lo agrega app.js al
// montarlas, asi que lo que aca se declara como "/cajas" termina siendo
// "/api/cajas".
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");
const controller = require("../controllers/estadisticaController");

router.get("/estadisticas/recaudacion", asyncHandler(controller.resumenRecaudacion));
router.get("/cajas", asyncHandler(controller.listarCajas));
router.post("/cajas/abrir", asyncHandler(controller.abrirCaja));
router.put("/cajas/:id/cerrar", asyncHandler(controller.cerrarCaja));

module.exports = router;