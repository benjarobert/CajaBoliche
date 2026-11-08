// front/js/index.js
// Pantalla de cobro: catalogo, carrito y registro de la venta.
//
// Regla del estado: guarda SOLO ids y cantidades. Ni un precio, ni un
// total, ni el nombre de un producto. Todo lo demas se deriva del catalogo
// con map / filter / reduce cada vez que hace falta.

import { listarProductos, listarCajas, registrarVenta } from "./api.js";
import { navbar } from "../componentes/navbar.js";
import { productoCard } from "../componentes/productoCard.js";

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------- ESTADO
const estado = {
  carrito: new Map(), // producto_id -> cantidad
  cajaId: null,
  medioPago: "efectivo",
  cuotas: 1,
  codigoEntrada: "",
  busqueda: "",
  categoria: "todas",
};

// Datos traidos de la API. No son estado: son el catalogo tal como vino.
let productos = [];
let cajas = [];

// ------------------------------------------------------------- DERIVADOS
const cajaActual = () => cajas.find((c) => c.id === estado.cajaId) || null;

// Cada barra vende lo suyo, mas lo que esta marcado como 'ambas'.
function productosDeLaBarra() {
  const caja = cajaActual();
  if (!caja) return [];
  return productos.filter((p) => p.barra === caja.barra || p.barra === "ambas");
}

function productosVisibles() {
  const texto = estado.busqueda.trim().toLowerCase();
  return productosDeLaBarra()
    .filter((p) => estado.categoria === "todas" || p.categoria === estado.categoria)
    .filter((p) => texto === "" || `${p.nombre} ${p.sabor}`.toLowerCase().includes(texto));
}

// Reconstruye el pedido cruzando el carrito contra el catalogo.
function lineas() {
  return [...estado.carrito.entries()]
    .map(([id, cantidad]) => {
      const producto = productos.find((p) => p.id === id);
      return producto ? { producto, cantidad, subtotal: producto.precio * cantidad } : null;
    })
    .filter((linea) => linea !== null);
}

const total = () => lineas().reduce((suma, l) => suma + l.subtotal, 0);
const unidades = () => [...estado.carrito.values()].reduce((suma, c) => suma + c, 0);

function sePuedeCobrar() {
  if (!cajaActual() || estado.carrito.size === 0) return false;
  if (estado.medioPago === "entrada" && estado.codigoEntrada.trim() === "") return false;
  return true;
}

// ---------------------------------------------------------------- CARRITO
function agregar(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;
  const cantidad = estado.carrito.get(id) || 0;
  // No dejamos pasar del stock: la base lo rechazaria con un 50001.
  if (cantidad + 1 > producto.stock) return;
  estado.carrito.set(id, cantidad + 1);
  render();
}

function restar(id) {
  const cantidad = (estado.carrito.get(id) || 0) - 1;
  if (cantidad <= 0) estado.carrito.delete(id);
  else estado.carrito.set(id, cantidad);
  render();
}

function quitar(id) {
  estado.carrito.delete(id);
  render();
}

// ----------------------------------------------------------------- PINTAR
function pintarNav() {
  const opciones = cajas
    .map(
      (c) =>
        `<option value="${c.id}" ${c.id === estado.cajaId ? "selected" : ""}>Barra ${c.barra} · caja #${c.id}</option>`
    )
    .join("");

  const derecha = cajas.length
    ? `<label class="user-role" for="selectorCaja">Cobrando en</label>
       <select class="barra-chip" id="selectorCaja" aria-label="Caja en la que se cobra">${opciones}</select>`
    : `<span class="badge badge-warn">No hay cajas abiertas</span>`;

  document.querySelector("#nav").innerHTML = navbar("index.html", derecha);
}

function pintarCategorias() {
  const propias = productosDeLaBarra().map((p) => p.categoria);
  const categorias = ["todas", ...new Set(propias)];

  document.querySelector("#categorias").innerHTML = categorias
    .map(
      (c) =>
        `<button type="button" class="cat-chip${c === estado.categoria ? " is-active" : ""}"
                 data-categoria="${c}" aria-pressed="${c === estado.categoria}">${c}</button>`
    )
    .join("");
}

function pintarCatalogo() {
  const contenedor = document.querySelector("#catalogo");
  const visibles = productosVisibles();

  if (!cajaActual()) {
    contenedor.innerHTML =
      '<div class="catalog-empty">Elegí una caja abierta para empezar a cobrar.</div>';
    return;
  }

  if (visibles.length === 0) {
    contenedor.innerHTML = `<div class="catalog-empty">No hay productos que coincidan con la búsqueda.</div>`;
    return;
  }

  // Agrupadas por categoria, respetando el orden en que vinieron.
  const categorias = [...new Set(visibles.map((p) => p.categoria))];

  contenedor.innerHTML = categorias
    .map((categoria) => {
      const tarjetas = visibles
        .filter((p) => p.categoria === categoria)
        .map((p) => productoCard(p, estado.carrito.get(p.id) || 0))
        .join("");
      return `
        <section class="cat-section">
          <h2 class="cat-title">${categoria}</h2>
          <div class="products">${tarjetas}</div>
        </section>`;
    })
    .join("");
}

function pintarCarrito() {
  const lista = document.querySelector("#lineas");
  const items = lineas();

  if (items.length === 0) {
    lista.innerHTML =
      '<li class="cart-empty">El pedido está vacío. Tocá <strong>+</strong> en un producto para agregarlo.</li>';
  } else {
    lista.innerHTML = items
      .map(
        ({ producto, cantidad, subtotal }) => `
        <li class="line">
          <div>
            <div class="line-name">${producto.nombre}</div>
            <div class="line-unit">${pesos.format(producto.precio)} c/u</div>
          </div>
          <div class="stepper">
            <button type="button" class="step-btn" data-accion="restar" data-id="${producto.id}"
                    aria-label="Quitar uno de ${producto.nombre}">
              <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg>
            </button>
            <span class="step-qty">${cantidad}</span>
            <button type="button" class="step-btn" data-accion="agregar" data-id="${producto.id}"
                    aria-label="Agregar uno de ${producto.nombre}">
              <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            </button>
          </div>
          <span class="line-sub">${pesos.format(subtotal)}</span>
          <button type="button" class="del-btn" data-accion="quitar" data-id="${producto.id}"
                  aria-label="Sacar ${producto.nombre} del pedido">
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </li>`
      )
      .join("");
  }

  const cantidad = unidades();
  const etiqueta = cantidad === 1 ? "1 unidad" : `${cantidad} unidades`;
  document.querySelector("#contadorUnidades").textContent = cantidad ? etiqueta : "";
  document.querySelector("#totalUnidades").textContent = cantidad ? etiqueta : "sin items";
  document.querySelector("#totalMonto").textContent = pesos.format(total());
  document.querySelector("#montoBoton").textContent = pesos.format(total());
}

function pintarPanelesDePago() {
  document.querySelectorAll("#mediosPago .pay-btn").forEach((boton) => {
    const activo = boton.dataset.medio === estado.medioPago;
    boton.classList.toggle("is-active", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });

  const esCredito = estado.medioPago === "credito";
  const esEntrada = estado.medioPago === "entrada";
  document.querySelector("#panelCuotas").hidden = !esCredito;
  document.querySelector("#panelEntrada").hidden = !esEntrada;

  if (esCredito) {
    document.querySelectorAll("#opcionesCuotas .seg-btn").forEach((boton) => {
      const activo = Number(boton.dataset.cuotas) === estado.cuotas;
      boton.classList.toggle("is-active", activo);
      boton.setAttribute("aria-pressed", String(activo));
    });
    const porCuota = estado.cuotas > 0 ? total() / estado.cuotas : 0;
    document.querySelector("#detalleCuota").innerHTML =
      `${estado.cuotas} ${estado.cuotas === 1 ? "pago de" : "cuotas de"} <strong>${pesos.format(porCuota)}</strong>`;
  }
}

function render() {
  pintarNav();
  pintarCategorias();
  pintarCatalogo();
  pintarCarrito();
  pintarPanelesDePago();
  document.querySelector("#btnCobrar").disabled = !sePuedeCobrar();
}

function mostrarError(mensaje) {
  const caja = document.querySelector("#errorCobro");
  caja.textContent = mensaje;
  caja.hidden = !mensaje;
}

// ------------------------------------------------------------------ COBRO
async function cobrar() {
  mostrarError("");
  const boton = document.querySelector("#btnCobrar");
  boton.disabled = true;

  // Al servidor viajan SOLO ids y cantidades. El total lo calcula la base.
  const datos = {
    cajaId: cajaActual().id,
    medioPago: estado.medioPago,
    items: lineas().map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
  };
  if (estado.medioPago === "credito") datos.cuotas = estado.cuotas;
  if (estado.medioPago === "entrada") datos.codigoEntrada = estado.codigoEntrada.trim();

  const cobrado = total();

  try {
    const { ventaId } = await registrarVenta(datos);

    document.querySelector("#detalleExito").innerHTML =
      `Venta <strong>#${ventaId}</strong> por <strong>${pesos.format(cobrado)}</strong> en ${estado.medioPago}.`;
    document.querySelector("#modalExito").hidden = false;

    estado.carrito.clear();
    estado.codigoEntrada = "";
    document.querySelector("#codigoEntrada").value = "";
    // El stock cambio, asi que volvemos a pedir el catalogo.
    productos = await listarProductos();
  } catch (error) {
    mostrarError(error.message);
  } finally {
    render();
  }
}

// ------------------------------------------------------------------ EVENTOS
// Un solo listener para todo el catalogo y otro para el carrito: las
// tarjetas se vuelven a dibujar en cada render, asi que no conviene
// enganchar un listener por boton.
function conectarEventos() {
  document.querySelector("#catalogo").addEventListener("click", (e) => {
    const boton = e.target.closest("[data-accion]");
    if (boton) agregar(Number(boton.dataset.id));
  });

  document.querySelector("#lineas").addEventListener("click", (e) => {
    const boton = e.target.closest("[data-accion]");
    if (!boton) return;
    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "agregar") agregar(id);
    if (boton.dataset.accion === "restar") restar(id);
    if (boton.dataset.accion === "quitar") quitar(id);
  });

  document.querySelector("#categorias").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-categoria]");
    if (!chip) return;
    estado.categoria = chip.dataset.categoria;
    render();
  });

  document.querySelector("#buscador").addEventListener("input", (e) => {
    estado.busqueda = e.target.value;
    pintarCatalogo();
  });

  document.querySelector("#mediosPago").addEventListener("click", (e) => {
    const boton = e.target.closest("[data-medio]");
    if (!boton) return;
    estado.medioPago = boton.dataset.medio;
    mostrarError("");
    render();
  });

  document.querySelector("#opcionesCuotas").addEventListener("click", (e) => {
    const boton = e.target.closest("[data-cuotas]");
    if (!boton) return;
    estado.cuotas = Number(boton.dataset.cuotas);
    render();
  });

  document.querySelector("#codigoEntrada").addEventListener("input", (e) => {
    estado.codigoEntrada = e.target.value;
    document.querySelector("#btnCobrar").disabled = !sePuedeCobrar();
  });

  // El selector de caja se vuelve a dibujar en cada render, por eso el
  // listener va en el contenedor y no en el select.
  document.querySelector("#nav").addEventListener("change", (e) => {
    if (e.target.id !== "selectorCaja") return;
    estado.cajaId = Number(e.target.value);
    estado.carrito.clear(); // cambiar de barra cambia el catalogo
    render();
  });

  document.querySelector("#btnVaciar").addEventListener("click", () => {
    estado.carrito.clear();
    mostrarError("");
    render();
  });

  document.querySelector("#btnCobrar").addEventListener("click", cobrar);

  document.querySelector("#btnSeguir").addEventListener("click", () => {
    document.querySelector("#modalExito").hidden = true;
  });
}

// ------------------------------------------------------------------ ARRANQUE
async function iniciar() {
  conectarEventos();
  try {
    [productos, cajas] = await Promise.all([listarProductos(), listarCajas()]);
    const abiertas = cajas.filter((c) => c.estado === "abierta");
    cajas = abiertas.length ? abiertas : cajas;
    if (cajas.length) estado.cajaId = cajas[0].id;
  } catch (error) {
    mostrarError("No se pudieron cargar los datos: " + error.message);
  }
  render();
}

iniciar();
