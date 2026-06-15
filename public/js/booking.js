const steps = Array.from(document.querySelectorAll(".booking-step"));
const stepButtons = Array.from(document.querySelectorAll(".stepper button"));
let currentStep = 0;
let pricingData = null;

function setStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === currentStep));
  stepButtons.forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === currentStep));
}

stepButtons.forEach((button, index) => button.addEventListener("click", () => setStep(index)));
document.querySelectorAll("[data-next-step]").forEach((button) => button.addEventListener("click", () => setStep(currentStep + 1)));
document.querySelectorAll("[data-prev-step]").forEach((button) => button.addEventListener("click", () => setStep(currentStep - 1)));

function money(value) {
  return `R${Number(value || 0).toLocaleString("en-ZA")}`;
}

async function loadPricing() {
  if (pricingData) return pricingData;
  const response = await fetch("pricing.json");
  if (!response.ok) throw new Error("Could not load FreshAndShine pricing.");
  pricingData = await response.json();
  return pricingData;
}

function flatServices(data) {
  return data.groups.flatMap((group) =>
    group.services.map((service) => ({
      ...service,
      groupTitle: group.title
    }))
  );
}

function selectedService(form) {
  const serviceName = form.querySelector("[data-service-select]")?.value;
  return flatServices(pricingData).find((service) => service.name === serviceName);
}

function selectedOption(form) {
  const service = selectedService(form);
  const optionLabel = form.querySelector("[data-option-select]")?.value;
  return service?.options.find((option) => option.label === optionLabel);
}

function pricingTotal(form) {
  const option = selectedOption(form);
  const quantity = Math.max(Number(form.quantity?.value || 1), 1);
  return Number(option?.price || 0) * quantity;
}

function pricingDetail(form) {
  const service = selectedService(form);
  const option = selectedOption(form);
  const quantity = Math.max(Number(form.quantity?.value || 1), 1);
  if (!service || !option) return "Choose a service to calculate the payment total.";
  const unit = option.unit ? ` ${option.unit}` : "";
  return `${service.name}: ${option.label} at ${money(option.price)}${unit}${quantity > 1 ? ` x ${quantity}` : ""}.`;
}

function populatePricingControls(form) {
  const serviceSelect = form.querySelector("[data-service-select]");
  const optionSelect = form.querySelector("[data-option-select]");
  const categoryField = form.querySelector("[data-category-field]");
  const estimateNode = form.querySelector("[data-estimate]") || document.querySelector("[data-estimate]");
  const estimateDetail = form.querySelector("[data-estimate-detail]") || document.querySelector("[data-estimate-detail]");
  if (!serviceSelect || !optionSelect) return;

  const services = flatServices(pricingData);
  serviceSelect.innerHTML = pricingData.groups
    .map(
      (group) => `
        <optgroup label="${group.title}">
          ${group.services.map((service) => `<option value="${service.name}">${service.name}</option>`).join("")}
        </optgroup>
      `
    )
    .join("");

  const updateOptions = () => {
    const service = services.find((item) => item.name === serviceSelect.value) || services[0];
    if (!service) return;
    optionSelect.innerHTML = service.options
      .map((option) => `<option value="${option.label}">${option.label} - ${money(option.price)}${option.unit ? ` ${option.unit}` : ""}</option>`)
      .join("");
    if (categoryField) categoryField.value = service.groupTitle;
    updateEstimate();
  };

  function updateEstimate() {
    if (estimateNode) estimateNode.textContent = money(pricingTotal(form));
    if (estimateDetail) estimateDetail.textContent = pricingDetail(form);
  }

  serviceSelect.addEventListener("change", updateOptions);
  optionSelect.addEventListener("change", updateEstimate);
  form.quantity?.addEventListener("input", updateEstimate);
  updateOptions();
}

function setupPaymentMethod(form) {
  const paymentInputs = Array.from(form.querySelectorAll("input[name='paymentMethod']"));
  const cardFields = form.querySelector("[data-card-fields]");
  const cardName = form.cardName;
  const walletNote = form.querySelector("[data-wallet-note]");
  const cardInputs = [cardName, form.cardNumber, form.cardExpiry, form.cardCvv].filter(Boolean);

  const update = () => {
    const method = form.querySelector("input[name='paymentMethod']:checked")?.value || "Card";
    const isCard = method === "Card";
    if (cardFields) cardFields.style.display = isCard ? "" : "none";
    if (cardName?.closest(".field")) cardName.closest(".field").style.display = isCard ? "" : "none";
    if (walletNote) walletNote.classList.toggle("show", !isCard);
    cardInputs.forEach((input) => {
      input.required = isCard;
      if (!isCard) input.value = "";
    });
  };

  paymentInputs.forEach((input) => input.addEventListener("change", update));
  update();
}

function setupCardFormatting(form) {
  const cardNumber = form.querySelector("[name='cardNumber']");
  const cardExpiry = form.querySelector("[name='cardExpiry']");
  const cardCvv = form.querySelector("[name='cardCvv']");

  cardNumber?.addEventListener("input", () => {
    const digits = cardNumber.value.replace(/\D/g, "").slice(0, 19);
    cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  });

  cardExpiry?.addEventListener("input", () => {
    const digits = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
    cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  cardCvv?.addEventListener("input", () => {
    cardCvv.value = cardCvv.value.replace(/\D/g, "").slice(0, 4);
  });
}

function showPaymentSuccess(result) {
  const panel = document.querySelector("[data-payment-success]");
  if (!panel) return;
  const reference = result.booking?.reference || "";
  const amount = money(result.booking?.estimatedTotal || 0);
  const refNode = panel.querySelector("[data-success-reference]");
  const whatsapp = panel.querySelector("[data-whatsapp-proof]");
  if (refNode) refNode.textContent = `Booking reference: ${reference} | Amount: ${amount}`;
  if (whatsapp) {
    const text = `Hello FreshAndShine, I have completed payment for booking ${reference} (${amount}). Please find my proof of payment attached.`;
    whatsapp.href = `https://wa.me/27769485673?text=${encodeURIComponent(text)}`;
  }
  panel.classList.add("show");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function initBookingForm() {
  const bookingForm = document.querySelector("[data-booking-form]");
  if (!bookingForm) return;
  await loadPricing();
  populatePricingControls(bookingForm);
  setupCardFormatting(bookingForm);
  setupPaymentMethod(bookingForm);

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = bookingForm.querySelector(".status-message");
    const submit = bookingForm.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      const payload = formToObject(bookingForm);
      payload.estimatedTotal = pricingTotal(bookingForm);
      payload.paymentMethod = bookingForm.querySelector("input[name='paymentMethod']:checked")?.value || "Card";
      if (payload.paymentMethod === "Card") {
        payload.card = {
          cardName: payload.cardName,
          cardNumber: payload.cardNumber,
          cardExpiry: payload.cardExpiry,
          cardCvv: payload.cardCvv
        };
      }
      delete payload.cardName;
      delete payload.cardNumber;
      delete payload.cardExpiry;
      delete payload.cardCvv;

      const result = await postData("/api/bookings", payload);
      showMessage(message, `Payment approved. ${result.message} Reference: ${result.booking.reference}`);
      bookingForm.reset();
      setStep(0);
      populatePricingControls(bookingForm);
      setupPaymentMethod(bookingForm);
      showPaymentSuccess(result);
    } catch (error) {
      showMessage(message, error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}

async function initQuoteForm() {
  const quoteForm = document.querySelector("[data-quote-form]");
  if (!quoteForm) return;
  await loadPricing();
  populatePricingControls(quoteForm);

  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = quoteForm.querySelector(".status-message");
    const submit = quoteForm.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      const payload = formToObject(quoteForm);
      payload.estimatedTotal = pricingTotal(quoteForm);
      payload.services = Array.from(quoteForm.querySelectorAll("input[name='services']:checked")).map((input) => input.value);
      const result = await postData("/api/quotes", payload);
      showMessage(message, `${result.message} Estimated amount: ${money(result.quote.estimatedTotal)}. Reference: ${result.quote.reference}`);
      quoteForm.reset();
      populatePricingControls(quoteForm);
    } catch (error) {
      showMessage(message, error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}

Promise.all([initBookingForm(), initQuoteForm()]).catch((error) => {
  const message = document.querySelector(".status-message");
  showMessage(message, error.message, "error");
});
