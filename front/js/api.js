// front/js/api.js
// Unico lugar del front que conoce las direcciones de la API.
// Las tres paginas piden los datos desde aca, asi no queda ninguna URL
// suelta repartida por el codigo.

const API_URL = "/api";

// Envoltorio de fetch. Si la respuesta no es 2xx, lanza un Error con el
// mensaje en castellano que escribio el THROW del procedimiento almacenado.
async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(API_URL + ruta, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });

  // Un 204 o una respuesta vacia no traen JSON.
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje =
      (cuerpo && cuerpo.error && cuerpo.error.mensaje) ||
      "No se pudo completar la operacion";
    throw new Error(mensaje);
  }

  return cuerpo;
}

// --- Cobro (Benjamin) ---
export const listarProductos = () => pedir("/productos");

export const registrarVenta = (datos) =>
  pedir("/ventas", { method: "POST", body: JSON.stringify(datos) });

// --- Cajas (Tomas) ---
export const listarCajas = () => pedir("/cajas");

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  const datos = await res.json().catch(() => ({}));
  // El backend responde { error: "..." } cuando algo falla
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

export const abrirCaja = (datos) =>
  pedir("/cajas/abrir", { method: "POST", body: JSON.stringify(datos) });

export const cerrarCaja = (id) =>
  pedir(`/cajas/${id}/cerrar`, { method: "PUT" });

export const resumenRecaudacion = (cajaId) =>
  pedir(cajaId
    ? `/estadisticas/recaudacion?cajaId=${encodeURIComponent(cajaId)}`
    : "/estadisticas/recaudacion");