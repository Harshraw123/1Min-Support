(function () {
    /**
     * ================================
     * 1. CONFIGURATION
     * ================================
     */
  
    const script = document.currentScript;
    const widgetId = script.getAttribute("data-id");
  
    // 🔥 Change this in production
    const BASE_URL = "https://yourdomain.com";
  
    if (!widgetId) {
      console.error("[OneMinuteSupport] Missing data-id on script tag");
      return;
    }
  
    /**
     * ================================
     * 2. FETCH SESSION (token + config)
     * ================================
     */
  
    fetch(`${BASE_URL}/api/widget/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ widgetId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Session API failed");
        return res.json();
      })
      .then((data) => {
        if (data.token) {
          initializeWidget({
            token: data.token,
            botImage: data.botImage, // 👈 user selected image
          });
        }
      })
      .catch((err) => {
        console.error("[OneMinuteSupport] Error:", err);
      });
  
    /**
     * ================================
     * 3. INITIALIZE WIDGET
     * ================================
     */
  
    function initializeWidget({ token, botImage }) {
      const isMobile = window.innerWidth < 500;
  
      /**
       * ================================
       * 3.1 CREATE CHAT IFRAME (hidden initially)
       * ================================
       */
  
      const iframe = document.createElement("iframe");
      iframe.src = `${BASE_URL}/chatbot/${widgetId}`; // ❌ no token in URL
  
      Object.assign(iframe.style, {
        position: "fixed",
        bottom: "20px",
        right: isMobile ? "5%" : "20px",
        width: isMobile ? "90%" : "400px",
        height: isMobile ? "80%" : "600px",
        border: "none",
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        zIndex: "999999",
        display: "none", // 👈 hidden initially
        overflow: "hidden",
      });
  
      document.body.appendChild(iframe);
  
      /**
       * ================================
       * 3.2 SEND TOKEN SECURELY
       * ================================
       */
  
      iframe.onload = () => {
        iframe.contentWindow.postMessage(
          {
            type: "INIT",
            token: token,
          },
          BASE_URL
        );
      };
  
      /**
       * ================================
       * 3.3 CREATE BUBBLE BUTTON (with image)
       * ================================
       */
  
      const bubble = document.createElement("div");
  
      Object.assign(bubble.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundImage: `url(${botImage})`, // 👈 dynamic image
        backgroundSize: "cover",
        backgroundPosition: "center",
        cursor: "pointer",
        zIndex: "999999",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      });
  
      document.body.appendChild(bubble);
  
      /**
       * ================================
       * 3.4 OPEN CHAT ON CLICK
       * ================================
       */
  
      bubble.addEventListener("click", () => {
        iframe.style.display = "block";
        bubble.style.display = "none";
      });
  
      /**
       * ================================
       * 3.5 LISTEN FOR CLOSE EVENT (from iframe)
       * ================================
       */
  
      window.addEventListener("message", (event) => {
        // 🔐 Security check
        if (event.origin !== BASE_URL) return;
  
        if (event.data.type === "CLOSE_WIDGET") {
          iframe.style.display = "none";
          bubble.style.display = "block";
        }
      });
    }
  })();