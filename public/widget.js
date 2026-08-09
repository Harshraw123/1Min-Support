(function () {
  // Next.js <Script> / async / deferred loaders often leave document.currentScript null.
  // Fall back to the last oms widget script that carries data-id.
  function resolveScript() {
    if (document.currentScript && document.currentScript.getAttribute("data-id")) {
      return document.currentScript;
    }
    var scripts = document.querySelectorAll('script[data-id][src*="widget.js"]');
    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  var script = resolveScript();
  var widgetId = script && script.getAttribute("data-id");
  var scriptSrc = script && script.getAttribute("src");
  var baseUrl = scriptSrc
    ? new URL(scriptSrc, window.location.href).origin
    : window.location.origin;

  if (!widgetId) {
    console.error("[OneMinuteSupport] Missing data-id on script tag");
    return;
  }

  // Prevent duplicate initialization when the snippet is included twice.
  var globalKey = "__OMS_WIDGET__" + widgetId;
  if (window[globalKey] && window[globalKey].initialized) {
    console.warn("[OneMinuteSupport] Widget already initialized for", widgetId);
    return;
  }
  window[globalKey] = { initialized: true };

  var instanceId =
    "oms-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

  var bubbleSize = { width: "65px", height: "65px" };
  var chatSize = { width: "400px", height: "600px" };

  /** @returns {"light"|"dark"|"system"} */
  function resolveEmbedTheme() {
    var raw = script && script.getAttribute("data-theme");
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    // Prefer light for host pages that don't opt in — avoids painting customer
    // sites (and /test) dark via shared next-themes storage by accident.
    return "light";
  }

  var embedTheme = resolveEmbedTheme();

  fetch(baseUrl + "/api/widget/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ widgetId: widgetId }),
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Session API failed with status " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.token) {
        throw new Error("Session API did not return a token");
      }

      initializeWidget({
        token: data.token,
        config: data.config || {},
        theme: embedTheme,
      });
    })
    .catch(function (err) {
      console.error("[OneMinuteSupport] Error:", err);
      // Allow a later retry if session failed (e.g. transient network).
      try {
        delete window[globalKey];
      } catch (_) {
        window[globalKey] = undefined;
      }
    });

  function initializeWidget(options) {
    if (window[globalKey] && window[globalKey].iframe) {
      return;
    }

    var iframe = document.createElement("iframe");
    var embedUrl = new URL(baseUrl + "/embed");
    // Do not put the JWT in the iframe URL (Referer / history leakage). Pass via postMessage only.
    embedUrl.searchParams.set("widgetId", widgetId);
    embedUrl.searchParams.set("theme", options.theme || "system");
    embedUrl.searchParams.set("instanceId", instanceId);

    iframe.src = embedUrl.toString();
    iframe.title = "OneMinute Support Chat";
    iframe.setAttribute("aria-label", "OneMinute Support Chat");

    Object.assign(iframe.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: bubbleSize.width,
      height: bubbleSize.height,
      border: "0",
      zIndex: "999999",
      background: "transparent",
      backgroundColor: "transparent",
      colorScheme: "normal",
      overflow: "hidden",
      boxShadow: "none",
      outline: "none",
    });
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("frameborder", "0");

    document.body.appendChild(iframe);
    window[globalKey].iframe = iframe;

    var initPayload = {
      type: "INIT",
      token: options.token,
      config: options.config,
      theme: options.theme || "light",
      instanceId: instanceId,
    };

    function postInit() {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(initPayload, baseUrl);
      }
    }

    // load can fire before the embed React tree attaches listeners — also
    // re-send when the iframe announces READY.
    iframe.addEventListener("load", postInit);

    window.addEventListener("message", function (event) {
      if (event.origin !== baseUrl || event.source !== iframe.contentWindow || !event.data) {
        return;
      }

      if (event.data.type === "READY" && event.data.instanceId === instanceId) {
        postInit();
        return;
      }

      if (event.data.type !== "resize" || event.data.instanceId !== instanceId) {
        return;
      }

      var width = typeof event.data.width === "string" ? event.data.width : bubbleSize.width;
      var height =
        typeof event.data.height === "string" ? event.data.height : bubbleSize.height;
      var isChat = width === chatSize.width || height === chatSize.height;
      var isMobile = window.innerWidth < 500;

      iframe.style.width = isChat && isMobile ? "calc(100vw - 24px)" : width;
      iframe.style.height =
        isChat && isMobile ? "min(640px, calc(100vh - 24px))" : height;
      iframe.style.right = isChat && isMobile ? "12px" : "20px";
      iframe.style.bottom = isChat && isMobile ? "12px" : "20px";
    });
  }
})();
