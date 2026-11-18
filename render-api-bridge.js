/* Auto-generated Render Cross-Service API & WebSocket Bridge */
(function () {
  var isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  var cloudBase = ("https://boda360-backend-api.onrender.com" || window.localStorage.getItem('BODA_API_BASE_URL') || 'https://boda360-backend-api.onrender.com').replace(/\/+$/, '');
  var localBase = 'http://localhost:3000';
  var activeBase = isLocalHost ? '' : cloudBase;
  window.BODA_API_BASE_URL = activeBase;

  var origFetch = window.fetch ? window.fetch.bind(window) : null;

  // Probe local USB-Serial gateway (http://localhost:3000) so if the user is viewing the Render URL
  // on the same PC where COM7 is plugged in, COM7 & Cloud MQTT both work seamlessly!
  if (!isLocalHost && origFetch) {
    origFetch(localBase + '/healthz', { mode: 'cors' })
      .then(function (r) {
        if (r && r.ok) {
          activeBase = localBase;
          window.BODA_API_BASE_URL = localBase;
        }
      })
      .catch(function () {});
  }

  if (!isLocalHost && origFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.indexOf('/api/') === 0) {
        var apiPath = input;
        init = Object.assign({}, init || {});

        // For Engine Cut / Restore commands, fire to BOTH local COM7 gateway and Cloud MQTT gateway
        if (apiPath.indexOf('/api/command/') === 0 && activeBase !== cloudBase) {
          origFetch(cloudBase + apiPath, Object.assign({}, init)).catch(function () {});
        } else if (apiPath.indexOf('/api/command/') === 0 && activeBase === cloudBase) {
          origFetch(localBase + apiPath, Object.assign({}, init)).catch(function () {});
        }

        var primaryUrl = (activeBase || cloudBase) + apiPath;
        var fallbackUrl = (activeBase === localBase ? cloudBase : localBase) + apiPath;

        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 3500) : null;
        var primaryInit = ctrl && !init.signal ? Object.assign({}, init, { signal: ctrl.signal }) : init;

        return origFetch(primaryUrl, primaryInit)
          .then(function (res) {
            if (timer) clearTimeout(timer);
            if (!res.ok && res.status >= 500) {
              return origFetch(fallbackUrl, init);
            }
            return res;
          })
          .catch(function () {
            if (timer) clearTimeout(timer);
            return origFetch(fallbackUrl, init);
          });
      }
      return origFetch(input, init);
    };
  }

  var OrigWebSocket = window.WebSocket;
  if (!isLocalHost && OrigWebSocket) {
    function PatchedWebSocket(url, protocols) {
      if (typeof url === 'string' && url.indexOf('/ws/telemetry') !== -1 && url.indexOf(window.location.host) !== -1) {
        var base = activeBase || cloudBase;
        var wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        url = wsBase + '/ws/telemetry';
      }
      return protocols !== undefined ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);
    }
    PatchedWebSocket.prototype = OrigWebSocket.prototype;
    PatchedWebSocket.CONNECTING = OrigWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = OrigWebSocket.OPEN;
    PatchedWebSocket.CLOSING = OrigWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = OrigWebSocket.CLOSED;
    window.WebSocket = PatchedWebSocket;
  }
})();
