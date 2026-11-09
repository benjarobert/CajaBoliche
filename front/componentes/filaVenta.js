// front/componentes/filaVenta.js
// Fila de la tabla del tablero: una venta por fila.
// Componente puro: recibe el objeto venta (tal como lo devuelve
// GET /api/ventas) y devuelve el HTML como texto. No toca el DOM ni guarda
// estado. Los botones de la fila solo llevan data-attributes; quien escucha
// los clicks es js/tablero.js.
//
// La grilla de 9 columnas esta definida en css/style.css (.t-row), asi que
// el orden de las celdas de aca tiene que coincidir con el encabezado de
// tablero.html: N°, Fecha, Hora, Cajero, Pago, Cuotas, Total, Estado, Acciones.

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

// creada_en llega como "2026-11-08T21:44:00.000Z". La base guarda la hora
// local del servidor y el driver la entrega marcada como UTC, asi que hay que
// mostrarla en UTC para que el reloj no se corra 3 horas.
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const formatoHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const NOMBRE_MEDIO = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  qr: "QR",
  entrada: "Entrada",
};

const NOMBRE_BARRA = { general: "General", vip: "VIP" };

const BADGE_VENTA = {
  pagada: { clase: "badge-ok", texto: "Pagada" },
  anulada: { clase: "badge-danger", texto: "Anulada" },
};

// Botones que se ofrecen segun el estado actual de la entrada. Es un espejo
// de lo que permite usp_cambiar_estado_entrada, solo para no mostrar botones
// que la base va a rechazar. La regla de verdad vive en el procedimiento.
const ACCIONES_ENTRADA = {
  activa: [
    { estado: "consumida", texto: "Consumir", clase: "btn-ghost" },
    { estado: "caducada", texto: "Caducar", clase: "btn-ghost" },
    { estado: "anulada", texto: "Anular", clase: "btn-danger" },
  ],
  consumida: [{ estado: "caducada", texto: "Caducar", clase: "btn-ghost" }],
};

// Los datos vienen de la base, pero igual los escapamos antes de usar innerHTML.
const esc = (t) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function badgeVenta(estado) {
  const badge = BADGE_VENTA[estado] || { clase: "badge-neutral", texto: estado };
  return `<span class="badge ${badge.clase}">${esc(badge.texto)}</span>`;
}

// Celda de "Pago": el medio y, si se pago con entrada, su codigo y estado.
function celdaPago(venta) {
  const medio = esc(NOMBRE_MEDIO[venta.medio_pago] || venta.medio_pago);
  if (venta.medio_pago === "entrada" && venta.entrada_codigo) {
    return `<span>${medio}</span>
        <span class="cell-sub">${esc(venta.entrada_codigo)} · ${esc(venta.entrada_estado)}</span>`;
  }
  return `<span>${medio}</span>`;
}

// Celda de "Acciones": los botones de cambio de estado de la entrada de la
// venta. Solo hay botones si se pago con entrada y todavia se puede cambiar.
function celdaAcciones(venta) {
  const acciones = venta.entrada_id ? ACCIONES_ENTRADA[venta.entrada_estado] : null;
  if (!acciones) return `<span class="cell-sub">—</span>`;

  return acciones
    .map(
      (a) => `<button type="button" class="btn btn-sm ${a.clase}"
              data-accion="cambiar-estado"
              data-entrada-id="${venta.entrada_id}"
              data-codigo="${esc(venta.entrada_codigo)}"
              data-estado="${a.estado}">${a.texto}</button>`
    )
    .join("");
}

export function filaVenta(venta) {
  const momento = new Date(venta.creada_en);
  const anulada = venta.estado === "anulada";
  const barra = NOMBRE_BARRA[venta.barra] || venta.barra;

  return `
    <div class="t-row" role="row" data-venta-id="${venta.venta_id}">
      <div class="t-cell" role="cell"><span class="id">#${venta.venta_id}</span></div>
      <div class="t-cell" role="cell">${formatoFecha.format(momento)}</div>
      <div class="t-cell" role="cell">${formatoHora.format(momento)}</div>
      <div class="t-cell t-stack" role="cell">
        <span>${esc(venta.cajero)}</span>
        <span class="cell-sub">Barra ${esc(barra)}</span>
      </div>
      <div class="t-cell t-stack" role="cell">${celdaPago(venta)}</div>
      <div class="t-cell" role="cell">${venta.cuotas ? venta.cuotas : "—"}</div>
      <div class="t-cell num" role="cell">
        <span class="t-total${anulada ? " void" : ""}">${pesos.format(venta.total)}</span>
      </div>
      <div class="t-cell" role="cell">${badgeVenta(venta.estado)}</div>
      <div class="t-cell end" role="cell">${celdaAcciones(venta)}</div>
    </div>`;
}

// a