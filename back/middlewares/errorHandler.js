const mapaCodigos = {
  50001: 400, 50002: 400, 50003: 400,
  50006: 403, 50007: 409, 50008: 404, 50009: 409,
  50010: 400, 50011: 404, 50012: 403, 50013: 404,
  50014: 400, 50016: 404
};

function errorHandler(err, req, res, next) {
  const codigo = err.number || null;
  const status = mapaCodigos[codigo] || 500;

  if (status >= 500) console.error("[ERROR 5xx]", err);
  else console.warn(`[ERROR ${status}] ${codigo}: ${err.message}`);

  res.status(status).json({
    error: { codigo, mensaje: err.message || "Error interno" }
  });
}

module.exports = errorHandler;