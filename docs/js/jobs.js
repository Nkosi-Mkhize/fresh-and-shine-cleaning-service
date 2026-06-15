const jobForm = document.querySelector("[data-job-application]");
const jobSuccess = document.querySelector("[data-job-success]");
const jobStartButtons = document.querySelectorAll("[data-job-start]");

if (jobForm) {
  const steps = [...jobForm.querySelectorAll("[data-job-step]")];
  const stepButtons = [...jobForm.querySelectorAll("[data-job-step-button]")];
  const statusMessage = jobForm.querySelector(".status-message");
  let activeStep = 0;

  function checkedValues(name) {
    return [...jobForm.querySelectorAll(`[name="${name}"]:checked`)].map((input) => input.value);
  }

  function focusFirstInvalid(step) {
    const invalid = [...step.querySelectorAll("input, select, textarea")].find((field) => !field.checkValidity());
    if (invalid) {
      invalid.focus();
      invalid.reportValidity();
      return true;
    }
    return false;
  }

  function stepError(message) {
    showMessage(statusMessage, message, "error");
    jobForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateStep(index) {
    const step = steps[index];
    if (focusFirstInvalid(step)) return false;

    if (index === 0 && checkedValues("roles").length === 0) {
      stepError("Please select at least one service you want to apply for.");
      return false;
    }

    if (index === 0 && checkedValues("eligibility").length < 5) {
      stepError("Please confirm the screening requirements before continuing.");
      return false;
    }

    if (index === 1 && checkedValues("workDays").length < 2) {
      stepError("Please select at least two days you can work.");
      return false;
    }

    if (index === 1 && checkedValues("workAreas").length === 0) {
      stepError("Please select at least one area you can work in.");
      return false;
    }

    if (index === 1 && checkedValues("workType").length === 0) {
      stepError("Please select the type of work you are looking for.");
      return false;
    }

    if (index === 2 && checkedValues("skills").length === 0) {
      stepError("Please select at least one cleaning skill.");
      return false;
    }

    if (statusMessage) statusMessage.className = "status-message";
    return true;
  }

  function setStep(index) {
    activeStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === activeStep));
    stepButtons.forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === activeStep));
    jobForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  jobForm.querySelectorAll("[data-job-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (validateStep(activeStep)) setStep(activeStep + 1);
    });
  });

  jobForm.querySelectorAll("[data-job-prev]").forEach((button) => {
    button.addEventListener("click", () => setStep(activeStep - 1));
  });

  stepButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (index <= activeStep) {
        setStep(index);
      } else if (index === activeStep + 1 && validateStep(activeStep)) {
        setStep(index);
      } else {
        stepError("Please complete each step in order.");
      }
    });
  });

  jobForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep(activeStep)) return;

    const submitButton = jobForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    showMessage(statusMessage, "Submitting your application...", "success");

    try {
      const payload = formToObject(jobForm);
      const result = await postData("/api/job-applications", payload);
      const reference = result.application?.reference || result.reference || "";
      jobForm.reset();
      jobForm.style.display = "none";
      document.querySelector("[data-job-reference]").textContent = reference ? `Application reference: ${reference}` : "";
      jobSuccess?.classList.add("show");
      jobSuccess?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showMessage(statusMessage, error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

jobStartButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const target = document.querySelector("#application");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
