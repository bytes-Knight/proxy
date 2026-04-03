document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('proxy-toggle');
  const statusText = document.getElementById('status-text');
  const statusDetail = document.getElementById('status-detail');
  const statusBadgeText = document.getElementById('status-badge-text');
  const indicator = document.querySelector('.status-indicator');
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  const saveBtn = document.getElementById('save-btn');

  const defaultSaveText = 'Save Configuration';
  let errorResetTimer = null;

  chrome.storage.local.get(['host', 'port', 'proxyEnabled'], (result) => {
    if (typeof result.host === 'string' && result.host.trim()) {
      hostInput.value = result.host.trim();
    }

    if (Number.isInteger(result.port) && result.port > 0 && result.port <= 65535) {
      portInput.value = String(result.port);
    }

    const settings = normalizeSettings();
    const enabled = Boolean(result.proxyEnabled);

    toggle.checked = enabled;
    updateUI(enabled, settings.host, settings.port);
  });

  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    const settings = normalizeSettings();

    updateUI(isEnabled, settings.host, settings.port);
    toggle.disabled = true;

    applyProxyState(isEnabled, settings, (result) => {
      toggle.disabled = false;

      if (!result.ok) {
        toggle.checked = !isEnabled;
        updateUI(!isEnabled, settings.host, settings.port);
        showError(result.error);
        return;
      }

      chrome.storage.local.set({
        proxyEnabled: isEnabled,
        host: settings.host,
        port: settings.port
      });
    });
  });

  saveBtn.addEventListener('click', () => {
    const settings = normalizeSettings();

    chrome.storage.local.set({ host: settings.host, port: settings.port }, () => {
      if (!toggle.checked) {
        flashSaved();
        return;
      }

      saveBtn.textContent = 'Applying...';
      applyProxyState(true, settings, (result) => {
        if (!result.ok) {
          saveBtn.textContent = defaultSaveText;
          showError(result.error);
          return;
        }

        chrome.storage.local.set({ proxyEnabled: true, host: settings.host, port: settings.port });
        updateUI(true, settings.host, settings.port);
        flashSaved();
      });
    });
  });

  [hostInput, portInput].forEach((input) => {
    input.addEventListener('input', () => {
      if (!toggle.checked) {
        return;
      }

      const settings = normalizeSettings();
      updateUI(true, settings.host, settings.port);
    });
  });

  function normalizeSettings() {
    const host = hostInput.value.trim() || '127.0.0.1';
    const parsedPort = Number.parseInt(portInput.value, 10);

    const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : 8080;

    hostInput.value = host;
    portInput.value = String(port);

    return { host, port };
  }

  function applyProxyState(isEnabled, settings, callback) {
    const done = (ok, error) => callback({ ok, error });

    if (chrome.proxy && chrome.proxy.settings) {
      if (isEnabled) {
        const proxyServer = {
          scheme: 'http',
          host: settings.host,
          port: settings.port
        };

        const config = {
          mode: 'fixed_servers',
          rules: {
            singleProxy: proxyServer,
            proxyForHttp: proxyServer,
            proxyForHttps: proxyServer,
            fallbackProxy: proxyServer,
            bypassList: ['<-loopback>']
          }
        };

        chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
          if (chrome.runtime.lastError) {
            done(false, chrome.runtime.lastError.message);
            return;
          }

          done(true);
        });

        return;
      }

      chrome.proxy.settings.clear({ scope: 'regular' }, () => {
        if (chrome.runtime.lastError) {
          done(false, chrome.runtime.lastError.message);
          return;
        }

        done(true);
      });

      return;
    }

    chrome.runtime.sendMessage(
      {
        action: isEnabled ? 'enableProxy' : 'disableProxy',
        host: settings.host,
        port: settings.port
      },
      (response) => {
        if (chrome.runtime.lastError) {
          done(false, chrome.runtime.lastError.message);
          return;
        }

        if (response && response.ok === false) {
          done(false, response.error || 'Proxy apply failed');
          return;
        }

        done(true);
      }
    );
  }

  function flashSaved() {
    saveBtn.textContent = 'Saved';
    saveBtn.classList.add('saved');

    setTimeout(() => {
      saveBtn.textContent = defaultSaveText;
      saveBtn.classList.remove('saved');
    }, 1400);
  }

  function showError(errorMessage) {
    const cleanError = (errorMessage || 'Unknown proxy error').replace(/^Error:\s*/, '');

    statusBadgeText.textContent = 'Error';
    statusDetail.textContent = `Failed: ${cleanError}`;
    statusDetail.classList.remove('active');
    indicator.classList.remove('active');

    if (errorResetTimer) {
      clearTimeout(errorResetTimer);
    }

    errorResetTimer = setTimeout(() => {
      const settings = normalizeSettings();
      updateUI(toggle.checked, settings.host, settings.port);
    }, 2800);
  }

  function updateUI(isEnabled, host, port) {
    if (isEnabled) {
      statusText.textContent = 'ON';
      statusDetail.textContent = `Routing via ${host}:${port}`;
      statusBadgeText.textContent = 'Active';

      statusText.classList.add('active');
      statusDetail.classList.add('active');
      indicator.classList.add('active');
      return;
    }

    statusText.textContent = 'OFF';
    statusDetail.textContent = 'Direct connection.';
    statusBadgeText.textContent = 'Offline';

    statusText.classList.remove('active');
    statusDetail.classList.remove('active');
    indicator.classList.remove('active');
  }
});