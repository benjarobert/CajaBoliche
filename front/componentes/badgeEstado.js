// front/componentes/badgeEstado.js
// Etiqueta de color para el estado de una caja.
// Componente puro: recibe un dato y devuelve el HTML como texto. No toca el
// DOM, no guarda estado y no sabe de donde salio ese valor.

// La tabla caja solo admite 'abierta' o 'cerrada' (lo garantiza el CHECK
// chk_caja_estado), pero igual se contempla cualquier otro valor: si llega
// uno que no esta en la lista cae en el neutral y la pagina no se rompe.
const ESTADOS = {
  abierta: { clase: "badge-ok", texto: "Abierta" },
  cerrada: { clase: "badge-neutral", texto: "Cerrada" },
};

const DESCONOCIDO = { clase: "badge-neutral", texto: "Sin estado" };

export function badgeEstado(estado) {
  const { clase, texto } = ESTADOS[estado] || DESCONOCIDO;
  return `<span class="badge ${clase}">${texto}</span>`;
}