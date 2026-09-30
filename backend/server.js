const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

let history = [];

let state = {
  device: 'NodeMCU V3 / ESP8266',
  online: false,
  source: 'none',
  temperature: null,
  humidity: null,
  mq3: null,
  ir: null,
  buzzer: null,
  fan: null,
  fanThreshold: 33,
  updatedAt: null,
  lastDeviceUpdate: null
};

function deviceIsOnline() {
  return !!state.lastDeviceUpdate &&
    Date.now() - new Date(state.lastDeviceUpdate).getTime() < 10000;
}

app.get('/api/status', (req, res) => {
  state.online = deviceIsOnline();
  res.json(state);
});

app.post('/api/status', (req, res) => {
  const body = req.body || {};
  const isDevice =
    body.source === 'esp8266' ||
    body.device === 'NodeMCU V3 / ESP8266';

  const now = new Date().toISOString();

  state = {
    ...state,
    ...body,
    updatedAt: now
  };

  if (isDevice) {
    state.lastDeviceUpdate = now;
    history.push({time: now, temperature: body.temperature ?? null, humidity: body.humidity ?? null, mq3: body.mq3 ?? null, ir: body.ir ?? null, buzzer: body.buzzer ?? null, fan: body.fan ?? null});
    if (history.length > 500) history = history.slice(-500);
  }

  state.online = deviceIsOnline();

  res.json(state);
});

app.get('/api/history', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 120, 1), 500);
  res.json(history.slice(-limit));
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'smart-cabin-backend',
    time: new Date().toISOString(),
    deviceOnline: deviceIsOnline()
  });
});

setInterval(() => {
  state.online = deviceIsOnline();
}, 1000);

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));

app.use((req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log('Smart Cabin backend running on ' + port);
});
