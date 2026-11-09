// front/js/estadisticas.js
import { listarCajas, abrirCaja, cerrarCaja, resumenRecaudacion } from "./api.js";
import { badgeEstado } from "../componentes/badgeEstado.js";
import { navbar } from "../componentes/navbar.js";

// La barra de navegacion es la misma en las tres paginas. El parametro le
// dice al componente cual de los tres links marcar como pagina actual.
document.querySelector("#nav").innerHTML = navbar("estadisticas.html");

const $ = (id) => document.getElementById(id);

// La consigna pide mostrar los importes con el formato argentino.
// Intl.NumberFormat pone el signo, el punto de miles y la coma decimal solo.
const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const dinero = (valor) => pesos.format(Number(valor) || 0);

// Los datos vienen de la base, pero igual los escapamos antes de usar innerHTML
const esc = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function mostrarMensaje(texto, esError = false) {
  const el = $("mensaje");
  el.textContent = texto;
  // alert, alert-ok y alert-danger ya estan en style.css.
  el.className = esError ? "alert alert-danger" : "alert alert-ok";
  el.hidden = false;
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

refrescar().catch((err) => mostrarMensaje(err.message, true));

// TEMPORAL: sin login todavía, asignamos el cajero del seed según la barra
const CAJEROS_POR_BARRA = { general: 2, vip: 3 };

$("form-abrir").addEventListener("submit", async (e) => {
  e.preventDefault(); // evita que el navegador recargue la página
  const barra = $("barra").value;
  const fondoInicial = Number($("fondo-inicial").value);
  try {
    await abrirCaja({ cajeroId: CAJEROS_POR_BARRA[barra], barra, fondoInicial });
    mostrarMensaje("Caja abierta correctamente");
    e.target.reset();
    await refrescar();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
});

$("lista-cajas").addEventListener("click", async (e) => {
  const boton = e.target.closest(".btn-cerrar");
  if (!boton) return;
  if (!confirm("¿Cerrar esta caja? Una vez cerrada no se puede reabrir.")) return;
  try {
    await cerrarCaja(boton.dataset.id);
    mostrarMensaje("Caja cerrada");
    await refrescar();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
});

const MEDIOS = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", qr: "QR", entrada: "Entrada" };

async function cargarResumen(cajaId) {
  const { general, porMedio } = await resumenRecaudacion(cajaId);

  $("total-recaudado").textContent = dinero(general.total_recaudado);
  $("cantidad-ventas").textContent = `${general.cantidad_ventas} ventas`;

  $("tabla-medios").innerHTML = porMedio.length === 0
    ? `<tr><td colspan="3" class="vacio">Sin ventas registradas</td></tr>`
    : porMedio.map((m) => `
        <tr>
          <td>${esc(MEDIOS[m.medio_pago] || m.medio_pago)}</td>
          <td>${m.cantidad_ventas}</td>
          <td>${dinero(m.recaudacion)}</td>
        </tr>`).join("");
}

$("selector-caja").addEventListener("change", (e) =>
  cargarResumen(e.target.value).catch((err) => mostrarMensaje(err.message, true)));

