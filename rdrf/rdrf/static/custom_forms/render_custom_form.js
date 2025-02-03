import { retrieveFormioFormData } from "./retrieve_custom_form_data.js";
import { showNotification } from "./show_notifications.js";

// Abstracted API call function
async function saveFormData(formName, patientId, registryId, data) {
  return $.ajax({
    url: "/api/custom-form-data/",
    type: "POST",
    data: JSON.stringify({
      patient_id: patientId,
      registry_id: registryId,
      form_code: formName,
      data: data,
    }),
    contentType: "application/json",
  });
}

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

async function renderFormioForm(
  formName = "testForm",
  patientId,
  registryId,
  formioUrl
) {
  if (typeof Formio !== "undefined") {
    Formio.createForm(
      document.getElementById("formio"),
      formioUrl + "/" + formName,
      {
        hooks: {
          beforeSubmit: (submission) => {
            return submission;
          },
        },
        options: {
          submitOnEnter: false,
          // allowHtmlUnsavedWarning: false,
          // skipDirtyCheck: true,
          // sanitizeConfig: {
          //   addWarning: false,
          // },
          // buttonSettings: {
          //   showCancel: false,
          // },
          // alerts: {
          //   submitMessage: false,
          // },
        },
      }
    )
      .then(async function (form) {
        // // Disable beforeunload event
        // window.onbeforeunload = null;
        // // Ensure it stays disabled
        // window.addEventListener("beforeunload", (event) => {
        //   event.preventDefault();
        //   return undefined;
        // });

        // Flag to track if initial data is loaded
        let isInitialDataLoaded = false;
        let default_form_data = {};

        try {
          default_form_data = await retrieveFormioFormData(
            formName,
            patientId,
            registryId
          );
          isInitialDataLoaded = true;
        } catch (e) {
          default_form_data = { data: {} };
          isInitialDataLoaded = true;
        }

        window.onbeforeunload = null;

        form.setSubmission({
          data: {
            ...default_form_data.data,
          },
        });

        // Create debounced save handler
        const debouncedSave = debounce((data) => {
          saveFormData(formName, patientId, registryId, data)
            .then(function (response) {
              showNotification("success", "Changes auto saved", 2000);
            })
            .catch(function (xhr) {
              showNotification("error", "Failed to save changes");
              console.error("Auto-save error:", xhr.responseText);
            });
        }, 1000);

        // Submit handler
        form.on("submit", function (submission) {
          saveFormData(formName, patientId, registryId, submission)
            .then(function (response) {
              showNotification("success", "Form data saved successfully");
              console.log("Success:", response);
            })
            .catch(function (xhr) {
              let errorMessage = "An error occurred while saving the form";
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.error) {
                  errorMessage = response.error;
                } else if (typeof response === "object") {
                  errorMessage = "";
                  Object.keys(response).forEach((key) => {
                    errorMessage += `\n${key}: ${response[key]} \n`;
                  });
                  if (errorMessage === "" && response?.detail) {
                    errorMessage = response?.detail;
                  }
                }
              } catch (e) {
                console.error("Error parsing response:", e);
              }
              showNotification("error", errorMessage);
              console.error("Error:", xhr.responseText);
            });
        });

        // Change handler with debounce that only triggers after initial data load
        form.on("change", function (changed) {
          console.log("Form data changed:", changed, form.submission);
          if (isInitialDataLoaded) {
            debouncedSave(form.submission.data);
          }
        });
      })
      .catch(function (error) {
        console.error("Error loading form:", error);
        document.getElementById("formio").innerHTML =
          '<div class="alert alert-danger">Error loading form. Please try again later.</div>';
      });
  } else {
    console.error("Form.io library not loaded");
    document.getElementById("formio").innerHTML =
      '<div class="alert alert-danger">Form.io library failed to load. Please refresh the page.</div>';
  }
}

window.onbeforeunload = function () {
  return null;
};

document.addEventListener("DOMContentLoaded", function () {
  const formContainer = document.getElementById("formio");
  const formName = formContainer.dataset.formName;
  const patientId = formContainer.dataset.patientId;
  const registryId = formContainer.dataset.registryId;
  // const formioUrl = formContainer.dataset.formioUrl || "http://localhost:3001";
  const formioUrl = "http://67.205.168.170:3001";
  renderFormioForm(formName, patientId, registryId, formioUrl);
});
