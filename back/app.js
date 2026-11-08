// Punto de entrada del back
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const errorHandler = require("./middlewares/errorHandler");
const { getPool } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "front")));

// Ruta de salud para verificar que anda
app.get("/api/salud", (req, res) => {
  res.json({ ok: true, mensaje: "API andando" });
});

// Rutas de cada integrante
app.use("/api", require("./routes/estadisticaRoutes"));
app.use("/api", require("./routes/ventaRoutes"));
// app.use("/api", require("./routes/tableroRoutes"));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    await getPool();
    app.listen(PORT, () => {
      console.log(`Servidor levantado en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo conectar a la base de datos:", err.message);
    process.exit(1);
  }
}

iniciar();