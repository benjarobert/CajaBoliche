// front/js/estadisticas.js
import { listarCajas, abrirCaja, cerrarCaja, resumenRecaudacion } from "./api.js";
import { badgeEstado } from "../componentes/badgeEstado.js";

const $ = (id) => document.getElementById(id);

// Se reemplaza por Intl.NumberFormat en el commit 5
const dinero = (valor) => String(valor ?? 0);

// Los datos vienen de la base, pero igual los escapamos antes de usar innerHTML
const esc = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function mostrarMensaje(texto, esError = false) {
  const el = $("mensaje");
  el.textContent = texto;
  el.className = esError ? "error" : "ok";
}

async function cargarCajas() {
  const cajas = await listarCajas();
  const abiertas = cajas.filter((c) => c.estado === "abierta");

  $("lista-cajas").innerHTML = abiertas.length === 0
    ? `<p class="vacio">No hay cajas abiertas todavía</p>`
    : abiertas.map((c) => `
        <article class="caja-item">
          <div>
            <strong>Barra ${esc(c.barra)}</strong> ${badgeEstado(c.estado)}
            <p>Cajero: ${esc(c.cajero)} · Fondo inicial: ${dinero(c.fondo_inicial)}
               · Vendido: ${dinero(c.total_vendido)}</p>
          </div>
          <button type="button" class="btn-cerrar" data-id="${c.caja_id}">Cerrar</button>
        </article>`).join("");

  llenarSelector(cajas);
}

// El selector incluye TODAS las cajas (también cerradas) para poder consultarlas
function llenarSelector(cajas) {
  const selector = $("selector-caja");
  const actual = selector.value; // para no perder la selección al refrescar
  selector.innerHTML = `<option value="">Todas las cajas</option>` + cajas.map((c) =>
    `<option value="${c.caja_id}">#${c.caja_id} · ${esc(c.barra)} · ${esc(String(c.fecha).slice(0, 10))} (${esc(c.estado)})</option>`
  ).join("");
  selector.value = actual;
}

async function refrescar() {
  await cargarCajas();
  await cargarResumen($("selector-caja").value);
}

async function cargarResumen(cajaId) { /* se completa en el commit 4 */ }

refrescar().catch((err) => mostrarMensaje(err.message, true));