export function showNotification(type, message) {
    // Create notification element
    const notification = $(`
          <div class="notification notification-${type}" style="
              position: fixed;
              bottom: 20px;
              right: 20px;
              padding: 15px 25px;
              border-radius: 4px;
              z-index: 1000;
              display: flex;
              align-items: center;
              margin-bottom: 10px;
              animation: slideIn 0.5s ease-out;
          ">
              <span class="notification-icon">
                  ${type === "success" ? "✓" : "✕"}
              </span>
              <span class="notification-message" style="margin-left: 10px;">
                  ${message}
              </span>
          </div>
      `);
  
    // Add styles based on type
    if (type === "success") {
      notification.css({
        "background-color": "#4caf50",
        color: "white",
      });
    } else {
      notification.css({
        "background-color": "#f44336",
        color: "white",
      });
    }
  
    // Add to document
    $("body").append(notification);
  
    // Remove after 5 seconds
    setTimeout(() => {
      notification.fadeOut(300, function () {
        $(this).remove();
      });
    }, 5000);
  }
  
  // Add CSS for animations
  const style = $(`
      <style>
          @keyframes slideIn {
              from {
                  transform: translateX(100%);
                  opacity: 0;
              }
              to {
                  transform: translateX(0);
                  opacity: 1;
              }
          }
          
          .notification {
              box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          }
          
          .notification-icon {
              font-weight: bold;
          }
      </style>
  `);
  $("head").append(style);
  