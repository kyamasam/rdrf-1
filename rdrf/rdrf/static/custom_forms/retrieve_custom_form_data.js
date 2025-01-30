import { showNotification } from "./show_notifications.js";

export async function retrieveFormioFormData(
  formName = "testForm",
  patientId,
  registryId,
  showError = false
) {
  console.log("frm", formName, patientId);
  console.log("called");
  // Wait for Formio to be fully loaded

  return $.ajax({
    url: `/api/custom-form-data/get-custom-form-data?patient_id=${patientId}&registry_id=${registryId}&form_code=${formName}`,
    type: "GET",
    contentType: "application/json",
    success: function (response) {
      // Show success message
      const forms = window.Formio.forms;
      showNotification("success", "Form data retrieved successfully");
      console.log("Success:", response);
      return response;
    },
    error: function (xhr, status, error) {
      // Parse error response
      let errorMessage = "An error occurred while saving the form";

      try {
        const response = JSON.parse(xhr.responseText);
        console.log("res", response);
        if (response.error) {
          errorMessage = response.error;
        } else if (typeof response === "object") {
          errorMessage = "";
          console.log("here", Object.entries(response));
          // Handle field-specific errors

          Object.keys(response).forEach((key) => {
            errorMessage += `\n${key}: ${response[key]} \n`;
          });
          console.log("error", errorMessage);
          if (errorMessage === "" && response?.detail) {
            errorMessage = response?.detail;
          }
        }
      } catch (e) {
        console.error("Error parsing response:", e);
      }
      // Show error message
      if (showError) {
        showNotification("error", errorMessage);
      }
      console.error("Error:", error, xhr.responseText);
      throw error;
    },
  });
}
