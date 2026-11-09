// back/controllers/tableroController.js
// Capa HTTP del tablero: traduce la peticion web en una llamada al service y
// devuelve la respuesta en JSON. No sabe nada de SQL.
// No lleva try/catch: si algo falla, el asyncHandler manda el error al
// middleware errorHandler, que lo traduce al codigo HTTP que corresponde.
const tableroService = require("../services/tableroService");

// Valores que acepta cada filtro. Son los mismos que los CHECK de la tabla
// venta y caja. Validarlos aca devuelve un 400 claro en vez de una lista
// vacia que parece "no hay ventas".
const BARRAS = ["general", "vip"];
const MEDIOS_PAGO = ["efectivo", "debito", "credito", "qr", "entrada"];
const ESTADOS_VENTA = ["pagada", "anulada"];
const LARGO_MAXIMO_TEXTO = 100; // lo que admite el parametro @texto

function errorDeEntrada(res, mensaje) {
  return res.status(400).json({ error: { codigo: null, mensaje } });
}

// Lo que llega por la URL es texto (o nada). Lo dejamos como texto sin
// espacios sobrantes, y "" si no vino.
function limpiar(valor) {
  return valor === undefined || valor === null ? "" : String(valor).trim();
}

// Acepta solo fechas reales con formato AAAA-MM-DD. Comparar la fecha que
// armamos contra el texto original descarta cosas como 2026-02-31.
function esFechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// GET /api/ventas
// Todos los filtros son opcionales y van en la URL:
//   /api/ventas?fechaDesde=2026-11-01&fechaHasta=2026-11-08&barra=vip
//              &medioPago=credito&estado=pagada&texto=fernet
// Responde 200 con la lista de ventas (vacia si nada coincide).
async function getVentas(req, res) {
  const filtros = {
    fechaDesde: limpiar(req.query.fechaDesde),
    fechaHasta: limpiar(req.query.fechaHasta),
    barra: limpiar(req.query.barra),
    medioPago: limpiar(req.query.medioPago),
    estado: limpiar(req.query.estado),
    texto: limpiar(req.query.texto),
  };

  if (filtros.fechaDesde && !esFechaValida(filtros.fechaDesde)) {
    return errorDeEntrada(res, "La fecha desde no es valida (formato AAAA-MM-DD)");
  }
  if (filtros.fechaHasta && !esFechaValida(filtros.fechaHasta)) {
    return errorDeEntrada(res, "La fecha hasta no es valida (formato AAAA-MM-DD)");
  }
  // Las dos fechas tienen el mismo formato, asi que comparar texto con texto
  // equivale a comparar fechas.
  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) {
    return errorDeEntrada(res, "La fecha desde no puede ser posterior a la fecha hasta");
  }
  if (filtros.barra && !BARRAS.includes(filtros.barra)) {
    return errorDeEntrada(res, "La barra tiene que ser general o vip");
  }
  if (filtros.medioPago && !MEDIOS_PAGO.includes(filtros.medioPago)) {
    return errorDeEntrada(res, "El medio de pago no es valido");
  }
  if (filtros.estado && !ESTADOS_VENTA.includes(filtros.estado)) {
    return errorDeEntrada(res, "El estado tiene que ser pagada o anulada");
  }
  if (filtros.texto.length > LARGO_MAXIMO_TEXTO) {
    return errorDeEntrada(res, `El texto de busqueda admite hasta ${LARGO_MAXIMO_TEXTO} caracteres`);
  }

  const ventas = await tableroService.buscarVentas(filtros);
  res.json(ventas);
}

// POST /api/entradas/:id/estado
// El id de la entrada viene en la URL y el estado nuevo en el cuerpo:
//   { "estado": "consumida" }
// Si el estado no existe o la transicion no esta permitida, lo rechaza el
// procedimiento (50014 -> 400); si la entrada no existe, 50016 -> 404. La
// regla vive en la base, que es la unica que no se puede saltear.
async function postEstadoEntrada(req, res) {
  // Lo que llega por la URL siempre es texto, hay que pasarlo a numero.
  const entradaId = Number(req.params.id);
  // Si el cliente no manda cuerpo, req.body puede venir sin definir.
  const estado = limpiar((req.body || {}).estado);

  if (!Number.isInteger(entradaId) || entradaId <= 0) {
    return errorDeEntrada(res, "El id de la entrada no es valido");
  }
  if (!estado) {
    return errorDeEntrada(res, "Falta el estado nuevo de la entrada");
  }

  const resultado = await tableroService.cambiarEstadoEntrada(entradaId, estado);
  res.json(resultado);
}

module.exports = { getVentas, postEstadoEntrada };
