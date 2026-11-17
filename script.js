const form = document.getElementById('qrForm');
const contentType = document.getElementById('contentType');
const contentInput = document.getElementById('qrContent');
const expirySelect = document.getElementById('expiry');
const sizeSelect = document.getElementById('size');
const qrContainer = document.getElementById('qrcode');
const emptyState = document.getElementById('emptyState');
const expiredState = document.getElementById('expiredState');
const resultMeta = document.getElementById('resultMeta');
const countdown = document.getElementById('countdown');
const expiryLabel = document.getElementById('expiryLabel');
const statusText = document.getElementById('statusText');
const downloadButton = document.getElementById('downloadButton');
const contentHint = document.getElementById('contentHint');

let expiryAt = null;
let countdownTimer = null;
let qrDataUrl = null;

const hints = {
  text: 'Puedes introducir cualquier texto.',
  url: 'Introduce una dirección que comience con https:// o http://.',
  phone: 'Introduce el número con su prefijo de país si es necesario.',
  email: 'Introduce una dirección de correo válida.'
};

contentType.addEventListener('change', () => {
  contentHint.textContent = hints[contentType.value];
  contentInput.placeholder = {
    text: 'Escribe aquí tu mensaje...',
    url: 'https://ejemplo.com',
    phone: '+18091234567',
    email: 'correo@ejemplo.com'
  }[contentType.value];
});

function getPayload() {
  const raw = contentInput.value.trim();
  const type = contentType.value;
  if (!raw) throw new Error('Introduce el contenido que deseas convertir.');

  if (type === 'url') {
    let parsed;
    try { parsed = new URL(raw); } catch { throw new Error('Introduce una URL válida.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('La URL debe usar HTTP o HTTPS.');
    return parsed.href;
  }
  if (type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new Error('Introduce un correo electrónico válido.');
    return `mailto:${raw}`;
  }
  if (type === 'phone') {
    if (!/^\+?[0-9\s().-]{6,20}$/.test(raw)) throw new Error('Introduce un número de teléfono válido.');
    return `tel:${raw.replace(/[\s().-]/g, '')}`;
  }
  return raw;
}

function formatRemaining(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

function expirePreview() {
  stopCountdown();
  qrContainer.hidden = true;
  qrContainer.innerHTML = '';
  expiredState.hidden = false;
  statusText.textContent = 'Caducado';
  statusText.classList.remove('active-label');
  countdown.textContent = '00:00';
  downloadButton.disabled = true;
  downloadButton.textContent = 'Código caducado';
  qrDataUrl = null;
}

function startCountdown(seconds) {
  stopCountdown();
  if (seconds === 0) {
    countdown.textContent = 'Sin caducidad';
    expiryLabel.textContent = 'Nunca';
    return;
  }

  expiryAt = Date.now() + seconds * 1000;
  const tick = () => {
    const remaining = Math.max(0, Math.ceil((expiryAt - Date.now()) / 1000));
    countdown.textContent = formatRemaining(remaining);
    if (remaining <= 0) expirePreview();
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function getQrImage() {
  const canvas = qrContainer.querySelector('canvas');
  if (canvas) return canvas.toDataURL('image/png');
  const image = qrContainer.querySelector('img');
  return image ? image.src : null;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    if (typeof QRCode === 'undefined') {
      throw new Error('No se pudo cargar la biblioteca QR. Comprueba tu conexión a Internet y recarga la página.');
    }

    const payload = getPayload();
    stopCountdown();
    qrContainer.innerHTML = '';
    qrContainer.hidden = false;
    emptyState.hidden = true;
    expiredState.hidden = true;
    resultMeta.hidden = false;
    statusText.textContent = 'Activo';
    statusText.classList.add('active-label');
    downloadButton.disabled = false;
    downloadButton.textContent = '↓  Descargar PNG';

    const size = Number(sizeSelect.value);
    new QRCode(qrContainer, {
      text: payload,
      width: size,
      height: size,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    const seconds = Number(expirySelect.value);
    const selectedText = expirySelect.options[expirySelect.selectedIndex].text;
    expiryLabel.textContent = seconds === 0 ? 'Nunca' : selectedText;
    startCountdown(seconds);

    // QRCode.js dibuja el canvas de forma asíncrona en algunos navegadores.
    setTimeout(() => { qrDataUrl = getQrImage(); }, 100);
  } catch (error) {
    alert(error.message);
  }
});

downloadButton.addEventListener('click', () => {
  if (!qrContainer.hidden && qrDataUrl) {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'mi-codigo-qr.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    alert('Genera un código QR activo antes de descargarlo.');
  }
});

form.addEventListener('reset', () => {
  stopCountdown();
  expiryAt = null;
  qrDataUrl = null;
  qrContainer.innerHTML = '';
  qrContainer.hidden = true;
  emptyState.hidden = false;
  expiredState.hidden = true;
  resultMeta.hidden = true;
  countdown.textContent = '—';
  expiryLabel.textContent = '—';
  statusText.textContent = 'Activo';
  statusText.classList.add('active-label');
  downloadButton.disabled = false;
  downloadButton.textContent = '↓  Descargar PNG';
  contentHint.textContent = hints.text;
});
