const servicePrices = {
  "Standard Daily Cleaning": 520,
  "Airbnb Turnover Cleaning": 780,
  "Hotel Housekeeping": 1200,
  "Deep Cleaning": 1450,
  "Laundry & Ironing": 420,
  "Office Cleaning": 900
};

const steps = Array.from(document.querySelectorAll(".booking-step"));
const stepButtons = Array.from(document.querySelectorAll(".stepper button"));
let currentStep = 0;

function setStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === currentStep));
  stepButtons.forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === currentStep));
}

stepButtons.forEach((button, index) => button.addEventListener("click", () => setStep(index)));
document.querySelectorAll("[data-next-step]").forEach((button) => button.addEventListener("click", () => setStep(currentStep + 1)));
document.querySelectorAll("[data-prev-step]").forEach((button) => button.addEventListener("click", () => setStep(currentStep - 1)));

function selectedExtras(form) {
  return Array.from(form.querySelectorAll("input[name='extras']:checked")).map((input) => input.value);
}

function estimate(form) {
  const service = form.querySelector("[name='service']:checked")?.value || "Standard Daily Cleaning";
  const propertyType = form.querySelector("[name='propertyType']:checked")?.value || "House";
  const rooms = Math.max(Number(form.rooms?.value || 1), 1);
  const extraPrice = selectedExtras(form).length * 120;
  const roomFactor = propertyType === "Hotel" || propertyType === "Guesthouse" ? rooms * 90 : Math.max(rooms - 2, 0) * 80;
  return (servicePrices[service] || 600) + extraPrice + roomFactor;
}

const bookingForm = document.querySelector("[data-booking-form]");
if (bookingForm) {
  const estimateNode = document.querySelector("[data-estimate]");
  const updateEstimate = () => {
    estimateNode.textContent = `R${estimate(bookingForm).toLocaleString("en-ZA")}`;
  };

  const cardNumber = bookingForm.querySelector("[name='cardNumber']");
  const cardExpiry = bookingForm.querySelector("[name='cardExpiry']");
  const cardCvv = bookingForm.querySelector("[name='cardCvv']");

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

  bookingForm.addEventListener("input", updateEstimate);
  updateEstimate();

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = bookingForm.querySelector(".status-message");
    const submit = bookingForm.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      const payload = formToObject(bookingForm);
      payload.extras = selectedExtras(bookingForm);
      payload.card = {
        cardName: payload.cardName,
        cardNumber: payload.cardNumber,
        cardExpiry: payload.cardExpiry,
        cardCvv: payload.cardCvv
      };
      delete payload.cardName;
      delete payload.cardNumber;
      delete payload.cardExpiry;
      delete payload.cardCvv;
      const result = await postData("/api/bookings", payload);
      showMessage(message, `Payment approved. ${result.message} Reference: ${result.booking.reference}`);
      bookingForm.reset();
      setStep(0);
      updateEstimate();
    } catch (error) {
      showMessage(message, error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}

const quoteForm = document.querySelector("[data-quote-form]");
if (quoteForm) {
  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = quoteForm.querySelector(".status-message");
    const submit = quoteForm.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      const payload = formToObject(quoteForm);
      payload.services = Array.from(quoteForm.querySelectorAll("input[name='services']:checked")).map((input) => input.value);
      const result = await postData("/api/quotes", payload);
      showMessage(message, `${result.message} Reference: ${result.quote.reference}`);
      quoteForm.reset();
    } catch (error) {
      showMessage(message, error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });
}
