const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const client = require('prom-client');

const app = express();
const port = 3000;

// Crear un registro de métricas
const register = new client.Registry();

// Crear un contador
const counter = new client.Counter({
  name: 'node_request_operations_total',
  help: 'Total number of processed requests',
});

// Registrar el contador
register.registerMetric(counter);

// Crear un endpoint para las métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Datos
let users = [];

// Ruta para agregar usuarios
app.post('/add-user', (req, res) => {
  const { name, username, favoriteGame } = req.body;
  users.push({ name, username, favoriteGame });
  counter.inc(); // Incrementar el contador en cada solicitud
  res.redirect('/');
});

// Ruta para obtener los datos
app.get('/users', (req, res) => {
  res.json(users);
});

// Servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

