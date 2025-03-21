import { retrieveFormioFormData } from "./retrieve_custom_form_data.js";
// Function to show notifications
function showNotification(type, message, timeout = 5000) {
  // Check if the notification container exists, if not create it
  let notificationContainer = document.getElementById("notification-container");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notification-container";
    notificationContainer.style.position = "fixed";
    notificationContainer.style.top = "20px";
    notificationContainer.style.right = "20px";
    notificationContainer.style.zIndex = "9999";
    document.body.appendChild(notificationContainer);
  }

  // Create a notification element
  const notification = document.createElement("div");
  notification.className = `alert alert-${type} alert-dismissible fade show`;
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Add the notification to the container
  notificationContainer.appendChild(notification);

  // Remove after timeout
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, timeout);
}

// Helper function to highlight active visit
function highlightActiveVisit(visitNumber) {
  // Remove highlight from all cards
  const visitCards = document.querySelectorAll("#visits-container .card");
  visitCards.forEach((card) => {
    card.classList.remove("border-primary", "border-2");
  });

  // Add highlight to active card
  // Instead of using :contains() which is jQuery-specific, we need to iterate through the elements
  const badges = document.querySelectorAll("#visits-container .badge");
  let activeCard = null;

  badges.forEach((badge) => {
    if (badge.textContent.includes(`Visit #${visitNumber}`)) {
      activeCard = badge.closest(".card");
    }
  });

  if (activeCard) {
    activeCard.classList.add("border-primary", "border-2");
  }
}

// Function to set the current active visit in localStorage
function setCurrentVisitNumber(patientId, registryId, formName, visitNumber) {
  // Create a unique key for this patient/registry/form combination
  const storageKey = `currentVisit_${patientId}_${registryId}_${formName}`;
  localStorage.setItem(storageKey, visitNumber);

  // Also update the in-memory currentVisitData
  if (currentVisitData) {
    currentVisitData.visit_number = visitNumber;
  } else {
    currentVisitData = { visit_number: visitNumber, data: {} };
  }

  console.log(`Set current visit number to ${visitNumber} for ${storageKey}`);
}

// Function to get the current active visit from localStorage
function getCurrentVisitNumber(patientId, registryId, formName) {
  const storageKey = `currentVisit_${patientId}_${registryId}_${formName}`;
  const storedVisit = localStorage.getItem(storageKey);
  return storedVisit ? parseInt(storedVisit, 10) : null;
}

// Function to render a form with data
function renderForm(
  formName,
  patientId,
  registryId,
  formioUrl,
  visitData = null
) {
  const formContainer = document.getElementById("formio");
  if (!formContainer) return;

  Formio.createForm(formContainer, formioUrl + "/" + formName, {
    hooks: {
      beforeSubmit: (submission) => {
        return submission;
      },
    },
    options: {
      submitOnEnter: false,
    },
  })
    .then(function (form) {
      // Set form data if available
      if (visitData && visitData.data) {
        form.setSubmission({
          data: visitData.data,
        });
      } else {
        // Ensure form is blank for new visit
        form.resetValue();
        form.submission = { data: {} };
      }

      // Update currentVisitData
      currentVisitData = visitData || { visit_number: 1, data: {} };

      // If we have a valid visit_number, update localStorage
      if (currentVisitData.visit_number) {
        setCurrentVisitNumber(
          patientId,
          registryId,
          formName,
          currentVisitData.visit_number
        );
      }

      // Create debounced save handler for auto-saving changes
      const debouncedSave = debounce((data) => {
        $.ajax({
          url: `/api/custom-form-data/`,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({
            patient_id: patientId,
            registry_id: registryId,
            form_code: formName,
            visit_number: currentVisitData.visit_number,
            data: data,
          }),
          success: function (response) {
            currentVisitData = response;
            showNotification("success", "Changes auto saved", 2000);
          },
          error: function (xhr) {
            showNotification("error", "Failed to save changes");
            console.error("Auto-save error:", xhr.responseText);
          },
        });
      }, 1000);

      // Change handler with debounce for auto-saving
      form.on("change", function (changed) {
        console.log("Form data changed:", changed, form.submission);
        debouncedSave(form.submission.data);
      });

      // Submit handler
      form.on("submit", function (submission) {
        $.ajax({
          url: `/api/custom-form-data/`,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify({
            patient_id: patientId,
            registry_id: registryId,
            form_code: formName,
            visit_number: currentVisitData.visit_number,
            data: submission.data,
          }),
          success: function (response) {
            currentVisitData = response;
            showNotification("success", "Visit data saved successfully");
            refreshVisitsList(formName, patientId, registryId);
          },
          error: function (xhr) {
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
          },
        });
      });
    })
    .catch(function (error) {
      console.error("Error loading form:", error);
      formContainer.innerHTML =
        '<div class="alert alert-danger">Error loading form. Please try again later.</div>';
    });
}

let currentVisitData = {};

window.resetForm = function () {
  // Get the formio container
  const formContainer = document.getElementById("formio");
  if (!formContainer) {
    showNotification("error", "Form container not found");
    return;
  }

  // Get form information
  const formName = formContainer.dataset.formName;
  const patientId = formContainer.dataset.patientId;
  const registryId = formContainer.dataset.registryId;
  const formioUrl = "http://67.205.168.170:3001";

  // Remove any visit title/info alert
  const previousAlert = formContainer.parentNode.querySelector(".alert");
  if (previousAlert) {
    previousAlert.remove();
  }

  // Clear the existing form
  formContainer.innerHTML = "";

  // Reinitialize the form
  renderFormioForm(formName, patientId, registryId, formioUrl);

  showNotification("info", "Form reset to new state");
};

// Function to create a new visit
function createNewVisit() {
  // Get the formio container
  const formContainer = document.getElementById("formio");
  if (!formContainer) {
    showNotification("error", "Form container not found");
    return;
  }

  // Get form information
  const formName = formContainer.dataset.formName;
  const patientId = formContainer.dataset.patientId;
  const registryId = formContainer.dataset.registryId;
  const formioUrl = "http://67.205.168.170:3001";

  // Remove any previous visit title/info alert
  const previousAlert = formContainer.parentNode.querySelector(".alert");
  if (previousAlert) {
    previousAlert.remove();
  }

  // Clear the existing form
  formContainer.innerHTML = "";

  // Show loading notification
  showNotification("info", "Creating new visit...");

  // Determine the next visit number
  const visitsContainer = document.getElementById("visits-container");
  const visitBadges = visitsContainer
    ? visitsContainer.querySelectorAll(".badge")
    : [];
  let maxVisitNumber = 0;

  visitBadges.forEach((badge) => {
    const visitText = badge.textContent;
    const match = visitText.match(/Visit #(\d+)/);
    if (match && match[1]) {
      const visitNum = parseInt(match[1], 10);
      if (visitNum > maxVisitNumber) {
        maxVisitNumber = visitNum;
      }
    }
  });

  // Calculate next visit number
  const newVisitNumber = maxVisitNumber + 1;
  console.log("new ", newVisitNumber);

  // First create the new visit via POST request with empty data
  $.ajax({
    url: `/api/custom-form-data/`,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      patient_id: patientId,
      registry_id: registryId,
      form_code: formName,
      visit_number: newVisitNumber,
      data: {}, // Empty data for new visit
    }),
    success: function (response) {
      // Update currentVisitData with the new visit
      currentVisitData = response;

      // Update localStorage with the new visit number
      setCurrentVisitNumber(patientId, registryId, formName, newVisitNumber);

      // Update UI to indicate creating a new visit
      const visitTitle = document.createElement("div");
      visitTitle.className = "alert alert-info mt-3";
      visitTitle.innerHTML = `
        <strong>New Visit #${newVisitNumber}</strong>
        <br><small>This visit has been created and will be updated when you make changes</small>
      `;
      formContainer.parentNode.insertBefore(visitTitle, formContainer);

      // Create a new blank form
      renderFormioForm(formName, patientId, registryId, formioUrl);

      // Refresh the visits list to show the new visit card
      refreshVisitsList(formName, patientId, registryId).then(() => {
        // Highlight the active visit
        highlightActiveVisit(newVisitNumber);

        showNotification("success", `Created new visit #${newVisitNumber}`);
      });
    },
    error: function (xhr) {
      console.error("Error creating new visit:", xhr.responseText);
      showNotification("error", "Failed to create new visit");

      // Fallback to rendering a blank form
      renderFormioForm(formName, patientId, registryId, formioUrl);
    },
  });
}

// Make the function available globally
window.createNewVisit = createNewVisit;

// Function to refresh the visits list
function refreshVisitsList(formName, patientId, registryId) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById("visits-container");
    const loadingElement = document.getElementById("loading-visits");

    if (container) {
      // Show loading indicator if it exists
      if (loadingElement) {
        loadingElement.classList.remove("d-none");
      }

      // Clear existing cards
      container.innerHTML = "";

      // Fetch and display updated visits
      retrieveAllVisitsFormioFormData(formName, patientId, registryId, true)
        .then(function (data) {
          displayVisitCards(data);
          resolve(data);
        })
        .catch(function (error) {
          console.error("Error refreshing visits:", error);
          if (loadingElement) {
            loadingElement.classList.add("d-none");
          }

          const errorDiv = document.createElement("div");
          errorDiv.className = "alert alert-danger";
          errorDiv.textContent = "Failed to refresh visits data.";
          container.appendChild(errorDiv);
          reject(error);
        });
    } else {
      resolve([]); // No container, no error
    }
  });
}

// Modified API call function to use localStorage for visit number tracking
async function saveFormData(
  formName,
  patientId,
  registryId,
  data,
  visit_number = null
) {
  // First check if a visit_number was explicitly provided
  let visitNum = visit_number;
  console.log("curre", getCurrentVisitNumber(patientId, registryId, formName));
  // If not provided, try to get it from currentVisitData
  if (!visitNum && currentVisitData && currentVisitData.visit_number) {
    visitNum = currentVisitData.visit_number;
  }

  // If still not found, try localStorage
  if (!visitNum) {
    visitNum = getCurrentVisitNumber(patientId, registryId, formName);
  }

  // If we still don't have a visit number, default to 1
  if (!visitNum) {
    visitNum = 1;
    // Store this default in localStorage for consistency
    setCurrentVisitNumber(patientId, registryId, formName, visitNum);
  }

  console.log(
    "Saving form data with visit number:",
    getCurrentVisitNumber(patientId, registryId, formName)
  );

  return $.ajax({
    url: "/api/custom-form-data/",
    type: "POST",
    data: JSON.stringify({
      patient_id: patientId,
      registry_id: registryId,
      form_code: formName,
      visit_number: visitNum,
      data: data,
    }),
    contentType: "application/json",
  }).then((response) => {
    // Update currentVisitData with the response
    currentVisitData = response;
    return response;
  });
}

// Function to retrieve all visits form data
async function retrieveAllVisitsFormioFormData(
  formName = "testForm",
  patientId = null,
  registryId = null,
  showError = false
) {
  try {
    // Build query parameters
    let url = "/api/custom-form-data/get-custom-form-data/";
    const params = new URLSearchParams();

    if (formName) {
      params.append("form_code", formName);
    }

    if (patientId) {
      params.append("patient_id", patientId);
    }

    if (registryId) {
      params.append("registry_id", registryId);
    }
    params.append("all_visits", "true");

    // Add params to URL if any exist
    if (params.toString()) {
      url += "?" + params.toString();
    }

    const response = await $.ajax({
      url: url,
      type: "GET",
      contentType: "application/json",
    });

    console.log("Retrieved all visits data:", response);
    return response;
  } catch (error) {
    console.error("Error retrieving visits data:", error);
    if (showError) {
      showNotification("error", "Failed to load visits data");
    }
    throw error;
  }
}

// Make the function available globally for direct use in templates
window.retrieveAllVisitsFormioFormData = retrieveAllVisitsFormioFormData;

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
        },
      }
    )
      .then(async function (form) {
        // Flag to track if initial data is loaded
        let isInitialDataLoaded = false;
        let default_form_data = {};

        try {
          // Check if we have a visit number in localStorage
          const storedVisitNumber = getCurrentVisitNumber(
            patientId,
            registryId,
            formName
          );

          if (storedVisitNumber) {
            // We have a stored visit, try to load that specific one
            try {
              const response = await $.ajax({
                url: `/api/custom-form-data/get-custom-form-data?visit_number=${storedVisitNumber}&form_code=${formName}&patient_id=${patientId}&registry_id=${registryId}/`,
                type: "GET",
                contentType: "application/json",
              });

              default_form_data = response;
              currentVisitData = response;
              console.log("Loaded stored visit data:", default_form_data);
            } catch (error) {
              // If we couldn't load the stored visit, fall back to the default behavior
              console.error(
                "Error loading stored visit, falling back to default:",
                error
              );
              default_form_data = await retrieveFormioFormData(
                formName,
                patientId,
                registryId
              );
            }
          } else {
            // No stored visit, use default behavior
            default_form_data = await retrieveFormioFormData(
              formName,
              patientId,
              registryId
            );

            // Store this visit number for future reference
            if (default_form_data && default_form_data.visit_number) {
              setCurrentVisitNumber(
                patientId,
                registryId,
                formName,
                default_form_data.visit_number
              );
            }
          }

          isInitialDataLoaded = true;
          console.log("Default form data:", default_form_data);

          // Store the full response object in currentVisitData
          currentVisitData = default_form_data;
        } catch (e) {
          console.error("Error retrieving form data:", e);
          default_form_data = { data: {}, visit_number: 1 };
          currentVisitData = default_form_data;

          // Store this visit number for future reference
          setCurrentVisitNumber(patientId, registryId, formName, 1);

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
              // Update the currentVisitData with the response
              currentVisitData = response;
              showNotification("success", "Changes auto saved", 2000);
            })
            .catch(function (xhr) {
              showNotification("error", "Failed to save changes");
              console.error("Auto-save error:", xhr.responseText);
            });
        }, 1000);

        // Submit handler
        form.on("submit", function (submission) {
          saveFormData(formName, patientId, registryId, submission.data)
            .then(function (response) {
              showNotification("success", "Form data saved successfully");
              console.log("Success: form", response);
              currentVisitData = response;

              // After successful save, refresh the visits list
              refreshVisitsList(formName, patientId, registryId);
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
          console.log(
            "Form data changed:",
            changed,
            form.submission,
            currentVisitData
          );
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
  if (formContainer) {
    const formName = formContainer.dataset.formName;
    const patientId = formContainer.dataset.patientId;
    const registryId = formContainer.dataset.registryId;
    const formioUrl = "http://67.205.168.170:3001";

    // Initialize the default form
    renderFormioForm(formName, patientId, registryId, formioUrl);
  }

  // Initialize visits display if the container exists
  const visitsContainer = document.getElementById("visits-container");
  if (visitsContainer) {
    initializeVisitsDisplay();
  }

  // Attach click event to the create new visit button
  const createNewVisitBtn = document.getElementById("create-new-visit-btn");
  if (createNewVisitBtn) {
    createNewVisitBtn.addEventListener("click", createNewVisit);
  }
});

// Function to initialize visits display
// Function to initialize visits display
function initializeVisitsDisplay() {
  const loadingElement = document.getElementById("loading-visits");

  // Get form name, patient ID and registry ID from the page if available
  const formContainer = document.getElementById("formio");
  const formName = formContainer?.dataset.formName || "testForm";
  const patientId = formContainer?.dataset.patientId;
  const registryId = formContainer?.dataset.registryId;

  retrieveAllVisitsFormioFormData(formName, patientId, registryId, true)
    .then(function (data) {
      displayVisitCards(data);

      // If no visits were found, automatically create a new visit
      if (!data || data.length === 0) {
        console.log("No visits found. Creating initial visit automatically.");
        // Hide the no-visits message if it exists
        const noDataElement = document.getElementById("no-visits");
        if (noDataElement) {
          noDataElement.classList.add("d-none");
        }

        // Create new visit automatically
        createNewVisit();
      } else {
        // Get current visit number from localStorage
        const currentVisitNumber = getCurrentVisitNumber(
          patientId,
          registryId,
          formName
        );

        // Highlight the active visit if we have one
        if (currentVisitNumber) {
          highlightActiveVisit(currentVisitNumber);
        } else if (data.length > 0) {
          // If no current visit is set but we have visits, set the most recent one as current
          const mostRecentVisit = [...data].sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
          )[0];

          if (mostRecentVisit) {
            setCurrentVisitNumber(
              patientId,
              registryId,
              formName,
              mostRecentVisit.visit_number
            );
            highlightActiveVisit(mostRecentVisit.visit_number);
          }
        }
      }
    })
    .catch(function (error) {
      console.error("Error fetching visits data:", error);

      if (loadingElement) {
        loadingElement.classList.add("d-none");
      }

      const errorDiv = document.createElement("div");
      errorDiv.className = "alert alert-danger";
      errorDiv.textContent =
        "Failed to load visits data. Please try again later.";

      const container = document.getElementById("visits-container");
      if (container) {
        container.appendChild(errorDiv);
      }
    });
}
// Function to display visit cards
function displayVisitCards(data) {
  const container = document.getElementById("visits-container");
  const loadingElement = document.getElementById("loading-visits");
  const noDataElement = document.getElementById("no-visits");

  if (loadingElement) {
    loadingElement.classList.add("d-none");
  }

  if (!data || data.length === 0) {
    if (noDataElement) {
      noDataElement.classList.remove("d-none");
    }
    return;
  }

  if (!container) return;

  // Clear existing content before adding new cards
  container.innerHTML = "";

  // Create a card for each visit
  data.forEach(function (visit) {
    const visitDate = new Date(visit.created_at).toLocaleDateString();

    // Check current visit from localStorage if available
    const currentVisitNumber = getCurrentVisitNumber(
      visit.patient_id || "",
      visit.registry_id || "",
      visit.form_code || ""
    );

    const isActive = currentVisitNumber === visit.visit_number;

    const cardCol = document.createElement("div");
    cardCol.className = "col-md-4 col-lg-3 mb-3";

    // Format form data preview
    let dataPreview = "";
    if (visit.data && typeof visit.data === "object") {
      const entries = Object.entries(visit.data).slice(0, 2);
      if (entries.length > 0) {
        dataPreview = '<small class="d-block mt-2"><strong>Data:</strong> ';
        dataPreview += entries
          .map(([key, value]) => {
            return `${key}: ${truncateText(value, 15)}`;
          })
          .join(", ");

        if (Object.keys(visit.data).length > 2) {
          dataPreview += "...";
        }
        dataPreview += "</small>";
      }
    }

    cardCol.innerHTML = `
      <div class="card h-100 shadow-sm ${
        isActive ? "border-primary border-2" : ""
      }">
        <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
          <span class="badge bg-primary">Visit #${
            visit.visit_number || "N/A"
          }</span>
          <small>${visitDate}</small>
        </div>
        <div class="card-body">
          <h6 class="card-title mb-1">
            ${
              visit.patient
                ? visit.patient.family_name + " " + visit.patient.given_names
                : "Unknown Patient"
            }
          </h6>
          <small class="text-muted d-block">
            Form: ${visit.form_code || "Unknown"}
          </small>
          <small class="text-muted d-block">
            Registry: ${visit.registry ? visit.registry.name : "Unknown"}
          </small>
          ${dataPreview}
        </div>
        <div class="card-footer bg-white border-top-0 p-2">
          <button type="button" class="btn btn-sm btn-outline-primary view-details" 
                  data-visit-number="${visit.visit_number}" 
                  onclick="return viewVisitDetails(${
                    visit.visit_number
                  }, event);">
            View Details
          </button>
        </div>
      </div>
    `;

    container.appendChild(cardCol);
  });
}

// Function to truncate text
function truncateText(text, maxLength) {
  if (text === null || text === undefined) return "";

  // Convert to string
  const str = String(text);

  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

// Function to view visit details
window.viewVisitDetails = function (visitId, event) {
  // Prevent any default behavior and stop event propagation
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log("Viewing details for visit number:", visitId);
  showNotification("info", `Loading visit #${visitId} data...`);

  // Get the formio container
  const formContainer = document.getElementById("formio");
  if (!formContainer) {
    showNotification("error", "Form container not found");
    return false;
  }

  // Get form information
  const formName = formContainer.dataset.formName;
  const patientId = formContainer.dataset.patientId;
  const registryId = formContainer.dataset.registryId;
  const formioUrl = "http://67.205.168.170:3001";

  // Update localStorage with the current visit number
  setCurrentVisitNumber(patientId, registryId, formName, visitId);

  // Highlight the active visit card
  highlightActiveVisit(visitId);

  // Fix: Use the correct API URL format with proper query parameters
  $.ajax({
    url: `/api/custom-form-data/get-custom-form-data?visit_number=${visitId}&form_code=${formName}&patient_id=${patientId}&registry_id=${registryId}`,
    type: "GET",
    contentType: "application/json",
    success: function (visitData) {
      // Clear the existing form
      formContainer.innerHTML = "";
      currentVisitData = visitData;
      console.log("got data", visitData);

      // Remove any previous visit title/info alert
      const previousAlert = formContainer.parentNode.querySelector(".alert");
      if (previousAlert) {
        previousAlert.remove();
      }

      // Update UI to indicate which visit is being viewed
      const visitTitle = document.createElement("div");
      visitTitle.className = "alert alert-info mt-3";
      visitTitle.innerHTML = `
      <strong>Viewing Visit #${visitData.visit_number || "N/A"}</strong>
      <br><small>Created: ${new Date(
        visitData.created_at
      ).toLocaleString()}</small>
      <br><small>Last Updated: ${new Date(
        visitData.updated_at
      ).toLocaleString()}</small>
      <button type="button" class="btn btn-sm btn-outline-secondary float-end" 
              onclick="resetForm()">New Form</button>
      `;
      formContainer.parentNode.insertBefore(visitTitle, formContainer);

      // Create a new form with the visit data
      renderForm(formName, patientId, registryId, formioUrl, visitData);

      showNotification(
        "success",
        `Loaded visit #${visitData.visit_number || "N/A"} data`
      );
    },
    error: function (xhr) {
      showNotification("error", "Failed to load visit data");
      console.error("Error fetching visit data:", xhr.responseText);
    },
  });

  return false; // Prevent default behavior
};
