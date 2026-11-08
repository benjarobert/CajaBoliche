// front/componentes/navbar.js
// Barra de navegacion comun a las tres paginas.
// Componente puro: recibe datos y devuelve el HTML como texto.
// Al vivir en un solo archivo, si cambia un link cambia en las tres paginas.

const PAGINAS = [
  {
    href: "index.html",
    texto: "Cobrar",
    icono:
      '<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle>' +
      '<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
  },
  {
    href: "tablero.html",
    texto: "Tablero",
    icono:
      '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>',
  },
  {
    href: "estadisticas.html",
    texto: "Estadísticas",
    icono:
      '<path d="M3 3v18h18"></path><path d="M18 17V9"></path>' +
      '<path d="M13 17V5"></path><path d="M8 17v-3"></path>',
  },
];

// activa: el href de la pagina actual, por ejemplo "index.html".
// derecha: HTML opcional para el sector derecho (el selector de caja, por ejemplo).
export function navbar(activa, derecha = "") {
  const links = PAGINAS.map((p) => {
    const esActiva = p.href === activa;
    return `
      <a class="nav-link${esActiva ? " is-active" : ""}"
         href="${p.href}"
         ${esActiva ? 'aria-current="page"' : ""}>
        <svg class="i i-sm" viewBox="0 0 24 24" aria-hidden="true">${p.icono}</svg>${p.texto}
      </a>`;
  }).join("");

  return `
    <header class="nav">
      <div class="nav-left">
        <div class="brand">NOCTURNA<span class="brand-sub">POS</span></div>
        <nav class="nav-links" aria-label="Secciones">${links}</nav>
      </div>
      <div class="nav-right">${derecha}</div>
    </header>`;
}
