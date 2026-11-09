// front/js/tablero.js
// Pantalla del tablero: busca ventas con filtros y deja cambiar el estado de
// las entradas desde la fila de cada venta.
//
// Regla: este archivo no guarda las ventas. Cada vez que hace falta (buscar,
// o despues de cambiar un estado) vuelve a pedirlas a la API con los filtros
// que hay en el formulario, asi la pantalla siempre muestra lo que dice la
// base.

import { buscarVentas, cambiarEstadoEntrada } from "./api.js";
import { navbar } from "../componentes/navbar.js";


const $ = (id) => document.getElementById(id);

document.querySelector("#nav").innerHTML = navbar("tablero.html");

const form = $("filtros");
const tbody = $("resultados");
const contador = $("contador");

// ---------------------------------------------------------------- MENSAJES
function limpiarMensajes() {
  $("mensajeError").hidden = true;
  $("mensajeOk").hidden = true;
}

function mostrarError(texto) {
  $("mensajeOk").hidden = true;
  $("mensajeError").textContent = texto;
  $("mensajeError").hidden = false;
}

function mostrarOk(texto) {
  $("mensajeError").hidden = true;
  $("mensajeOk").textContent = texto;
  $("mensajeOk").hidden = false;
}

// ----------------------------------------------------------------- PINTAR
const ESTADO_VACIO = `
  <div class="empty">
    <div class="empty-icon">
      <svg class="i i-xl" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
      </svg>
    </div>
    <h2 class="empty-title">No hay ventas con esos filtros</h2>
    <p class="empty-text">Probá con otro rango de fechas o sacá algún filtro.</p>
  </div>`;

function pintar(ventas) {
  const cantidad = ventas.length;
  contador.innerHTML = `<strong>${cantidad}</strong> ${cantidad === 1 ? "venta" : "ventas"}`;
  tbody.innerHTML = cantidad
    ? ventas.map((venta) => filaVenta(venta)).join("")
    : ESTADO_VACIO;
}

// ----------------------------------------------------------------- BUSCAR
// Si el usuario busca dos veces seguidas, la primera respuesta podria llegar
// despues de la segunda y pisarla. Cada busqueda lleva un numero y solo la
// ultima pinta.
let ultimaBusqueda = 0;

async function buscar() {
  // Sin valores vacios y sin espacios: lo que el formulario tiene hoy.
  const filtros = Object.fromEntries(new FormData(form));

  if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) {
    mostrarError("La fecha desde no puede ser posterior a la fecha hasta");
    return;
  }

  const numero = ++ultimaBusqueda;
  contador.textContent = "Buscando…";

  try {
    const ventas = await buscarVentas(filtros);
    if (numero !== ultimaBusqueda) return;
    pintar(ventas);
  } catch (err) {
    if (numero !== ultimaBusqueda) return;
    tbody.innerHTML = "";
    contador.textContent = "";
    mostrarError(err.message);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault(); // evita que el navegador recargue la pagina
  limpiarMensajes();
  buscar();
});

// El reset del navegador vacia los campos despues de este evento, por eso la
// busqueda espera un instante: asi lee el formulario ya limpio.
form.addEventListener("reset", () => {
  limpiarMensajes();
  setTimeout(buscar, 0);
});

// ------------------------------------------------------ CAMBIO DE ESTADO
// Las filas se pintan de nuevo en cada busqueda, asi que un solo oyente en el
// contenedor atiende los botones de todas las filas.
tbody.addEventListener("click", async (e) => {
  const boton = e.target.closest('[data-accion="cambiar-estado"]');
  if (!boton) return;

  const { entradaId, estado, codigo } = boton.dataset;

  // Ningun cambio de estado de una entrada se puede deshacer.
  if (!confirm(`¿Pasar la entrada ${codigo} a "${estado}"? Este cambio no se puede deshacer.`)) {
    return;
  }

  boton.disabled = true;
  limpiarMensajes();

  try {
    await cambiarEstadoEntrada(entradaId, estado);
    mostrarOk(`La entrada ${codigo} ahora figura como ${estado}.`);
    await buscar(); // vuelve a pedir las ventas para ver el estado nuevo
  } catch (err) {
    // El mensaje es el del THROW del procedimiento (por ejemplo,
    // "Transicion de estado no permitida").
    boton.disabled = false;
    mostrarError(err.message);
  }
});

// Al abrir la pagina se muestran todas las ventas, de la mas nueva a la mas vieja.
buscar();
