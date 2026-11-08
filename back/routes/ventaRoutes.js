// back/routes/ventaRoutes.js
// Rutas del flujo de cobro. El prefijo /api lo agrega app.js al montarlas,
// asi que lo que se declara aca como "/productos" termina siendo
// "/api/productos".
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");
const ventaController = require("../controllers/ventaController");

router.get("/productos", asyncHandler(ventaController.getProductos));
router.post("/ventas", asyncHandler(ventaController.postVenta));
router.post("/ventas/:id/anular", asyncHandler(ventaController.postAnularVenta));

module.exports = router;
