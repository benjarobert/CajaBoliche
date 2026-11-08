// front/componentes/productoCard.js
// Tarjeta de un producto del catalogo.
// Componente puro: recibe el producto y la cantidad que ya hay en el
// carrito, y devuelve el HTML como texto. No toca el DOM ni guarda estado.

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function productoCard(producto, cantidadEnCarrito = 0) {
  const enCarrito = cantidadEnCarrito > 0;
  const sinStock = producto.stock <= 0;

  // El sabor y el tamanio pueden venir vacios: se arma la descripcion con
  // los que tengan valor.
  const descripcion = [producto.sabor, producto.tamanio]
    .filter((dato) => dato && dato.trim() !== "")
    .join(" · ");

  const clases = ["product"];
  if (enCarrito) clases.push("in-cart");
  if (sinStock) clases.push("sin-stock");

  return `
    <div class="${clases.join(" ")}" data-id="${producto.id}">
      ${enCarrito ? `<span class="qty-pill" aria-label="${cantidadEnCarrito} en el pedido">${cantidadEnCarrito}</span>` : ""}
      <div>
        <div class="product-name">${producto.nombre}</div>
        ${descripcion ? `<div class="product-desc">${descripcion}</div>` : ""}
      </div>
      <div class="product-foot">
        <span class="product-price">${pesos.format(producto.precio)}</span>
        <button type="button" class="add-btn" data-accion="agregar" data-id="${producto.id}"
                ${sinStock ? "disabled" : ""}
                aria-label="Agregar ${producto.nombre} al pedido">
          <svg class="i i-lg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14"></path><path d="M12 5v14"></path>
          </svg>
        </button>
      </div>
    </div>`;
}
