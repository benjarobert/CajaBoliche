// back/services/estadisticaService.js
// Esqueleto: por ahora devuelve datos falsos (dummy).
// Más adelante cada función llamará a su procedimiento almacenado.

// -> usp_resumen_recaudacion (cajaId opcional: sin cajaId = total general)
async function resumenRecaudacion(cajaId) {
  return {
    caja_id: cajaId ?? null,
    total_recaudado: 150000,
    cantidad_ventas: 32,
    por_medio_pago: [
      { medio_pago: "efectivo", cantidad_ventas: 15, recaudacion: 70000 },
      { medio_pago: "debito",   cantidad_ventas: 10, recaudacion: 50000 },
      { medio_pago: "qr",       cantidad_ventas: 7,  recaudacion: 30000 },
    ],
  };
}

// -> usp_abrir_caja (recibe cajero_id, barra, fondo_inicial)
async function abrirCaja(datos) {
  return {
    id: 1,
    barra: datos?.barra ?? "general",
    cajero_id: datos?.cajero_id ?? 2,
    fondo_inicial: datos?.fondo_inicial ?? 20000,
    estado: "abierta",
  };
}

// -> usp_cerrar_caja (recibe el id de la caja)
async function cerrarCaja(id) {
  return { id: Number(id), estado: "cerrada" };
}

// -> v_caja_resumen (listado de cajas)
async function listarCajas() {
  return [
    { id: 1, barra: "general", cajero: "Juan",    estado: "abierta", fondo_inicial: 20000, total_vendido: 90000 },
    { id: 2, barra: "vip",     cajero: "Micaela", estado: "abierta", fondo_inicial: 20000, total_vendido: 60000 },
  ];
}

module.exports = { resumenRecaudacion, abrirCaja, cerrarCaja, listarCajas };