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

  toggle.addEventListener('change', (event) => {
    const isEnabled = event.target.checked;
    const settings = normalizeSettings();

    updateUI(isEnabled, settings.host, settings.port);

    chrome.runtime.sendMessage({
      action: isEnabled ? 'enableProxy' : 'disableProxy',
      host: settings.host,
      port: settings.port
    });

    chrome.storage.local.set({
      proxyEnabled: isEnabled,
      host: settings.host,
      port: settings.port
    });
  });

  saveBtn.addEventListener('click', () => {
    const settings = normalizeSettings();

    chrome.storage.local.set(
      {
        host: settings.host,
        port: settings.port
      },
      () => {
        saveBtn.textContent = 'Saved';
        saveBtn.classList.add('saved');

        setTimeout(() => {
          saveBtn.textContent = defaultSaveText;
          saveBtn.classList.remove('saved');
        }, 1400);

        if (toggle.checked) {
          updateUI(true, settings.host, settings.port);
          chrome.runtime.sendMessage({
            action: 'enableProxy',
            host: settings.host,
            port: settings.port
          });
        }
      }
    );
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

