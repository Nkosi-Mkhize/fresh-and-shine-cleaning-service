function money(value) {
  return `R${Number(value || 0).toLocaleString("en-ZA")}`;
}

function optionPrice(option) {
  return `${money(option.price)}${option.unit ? ` ${option.unit}` : ""}`;
}

async function loadPricing() {
  const response = await fetch("pricing.json");
  if (!response.ok) throw new Error("Could not load pricing.");
  return response.json();
}

function renderPricingBoard(data) {
  const board = document.querySelector("[data-pricing-board]");
  if (!board) return;
  board.innerHTML = data.groups
    .map(
      (group) => `
        <section class="price-group" data-animate>
          <div class="price-group-head">
            <div>
              <span class="eyebrow">${group.title}</span>
              <h2>${group.title}</h2>
              <p>${group.summary}</p>
            </div>
          </div>
          <div class="price-service-grid">
            ${group.services
              .map(
                (service) => `
                  <article class="price-card">
                    <div class="price-card-head">
                      <h3>${service.name}</h3>
                      ${service.subtitle ? `<p>${service.subtitle}</p>` : ""}
                    </div>
                    <div class="table-wrap">
                      <table class="price-table">
                        <thead><tr><th>${service.unitLabel}</th><th>Price</th></tr></thead>
                        <tbody>
                          ${service.options.map((option) => `<tr><td>${option.label}</td><td><strong>${optionPrice(option)}</strong></td></tr>`).join("")}
                        </tbody>
                      </table>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  board.insertAdjacentHTML(
    "beforeend",
    `<section class="price-notes card">
      <h2>Important Notes</h2>
      <ul class="check-list">${data.notes.map((note) => `<li>${note}</li>`).join("")}</ul>
    </section>`
  );
}

loadPricing()
  .then(renderPricingBoard)
  .catch((error) => {
    const board = document.querySelector("[data-pricing-board]");
    if (board) board.innerHTML = `<div class="card"><strong>${error.message}</strong></div>`;
  });
