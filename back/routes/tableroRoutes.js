// back/routes/tableroRoutes.js
// Rutas del tablero. El prefijo /api lo agrega app.js al montarlas, asi que
// lo que se declara aca como "/ventas" termina siendo "/api/ventas".
// POST /ventas (registrar una venta) es de ventaRoutes: acá solo se agrega el
// GET sobre la misma ruta, y Express los distingue por el metodo.
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");
const tableroController = require("../controllers/tableroController");

router.get("/ventas", asyncHandler(tableroController.getVentas));
router.post("/entradas/:id/estado", asyncHandler(tableroController.postEstadoEntrada));

module.exports = router;
