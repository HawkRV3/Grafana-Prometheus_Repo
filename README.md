# Monitoring System with Grafana and Prometheus

## Objective

The objective of this project is to investigate, install, and configure Grafana and Prometheus to establish a monitoring system for a software application. The monitoring system will be tested using a Node.js service. Docker and Docker-Compose will be utilized, and Git will be used to version and upload the service configurations to a GitHub repository.

## Development Steps

### 1. Preliminary Investigation

- Research the main functionalities and features of Grafana and Prometheus.
- Identify how these services can be integrated with the project's programming language.
- Explore similar examples and use cases to understand best practices and potential challenges.

### 2. Installing Docker and Docker-Compose

- Install Docker and Docker-Compose in the development environment if they are not already installed.
- Verify the correct installation by executing basic Docker and Docker-Compose commands.

### 3. Configuration of Prometheus

- Create a `docker-compose.yml` file to define the Prometheus service.
- Configure Prometheus to collect relevant project metrics.
- Create a Prometheus configuration file (`prometheus.yml`) to specify the monitoring targets.

### 4. Configuration of Grafana

- Add Grafana to the `docker-compose.yml` as an additional service.
- Configure Grafana to connect to Prometheus as a data source.
- Create basic dashboards in Grafana to visualize the metrics collected by Prometheus.

### 5. Integration with the Project

- Implement the collection of metrics in the project code using Node.js.
- Ensure that the metrics are exposed in a format compatible with Prometheus.

### 6. Versioning and Repository on GitHub

- Initialize a local Git repository for the monitoring project.
- Add all the files of the Node.js project to monitor.
- Create a `README.md` file with detailed instructions for the installation and configuration of the monitoring system.

### 7. Testing and Verification

- Run `docker-compose up` to start the Prometheus and Grafana services.
- Verify that Prometheus is collecting metrics and that Grafana is displaying them correctly.
- Make necessary adjustments based on the evidence to ensure efficient and accurate monitoring.

## Configuration Files

### .env

```env
# Configuración para Grafana
GRAFANA_EXPOSE_PORT=3001
GRAFANA_DOMAIN=localhost

# Configuración para Prometheus
PROMETHEUS_PORT=9090

# Configuración para Node Exporter
NODE_EXPORTER_PORT=9100

# Configuración para cAdvisor
CADVISOR_PORT=8080

# Configuración para Loki (si estás usando Loki para logs)
LOKI_PORT=3100

# Configuración de la red externa (asegúrate de que la red existe)
NET_EXTERNAL=true

# ID del usuario para Grafana
ID=1000
```

### docker-compose.yml

```yaml
version: "3.9"
services:
  node-app:
    build: ./node-app
    container_name: node-app
    restart: unless-stopped
    ports:
      - "3002:3000"
    networks:
      - docker-net

  grafana:
    image: grafana/grafana
    container_name: grafana
    restart: unless-stopped
    env_file:
      - ./.env
    ports:
      - ${GRAFANA_EXPOSE_PORT:-3001}:3000
    volumes:
      - ./logs:/var/log/grafana
      - grafana:/var/lib/grafana
    user: ${ID}
    environment:
      - TZ=Europe/Madrid
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
      - VIRTUAL_HOST=${GRAFANA_DOMAIN}
      - VIRTUAL_PORT=3000
    networks:
      - docker-net

  prometheus:
    image: bitnami/prometheus
    container_name: prometheus
    restart: unless-stopped
    env_file:
      - ./.env
    environment:
      - TZ=Europe/Madrid
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus:/prometheus
    networks:
      - docker-net
    ports:
      - ${PROMETHEUS_PORT:-9090}:9090

  node_exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node_exporter
    env_file:
      - ./.env
    ports:
      - ${NODE_EXPORTER_PORT:-9100}:9100
    command:
      - '--path.rootfs=/host'
    pid: host
    restart: unless-stopped
    networks:
      - docker-net
    volumes:
      - '/:/host:ro,rslave'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    env_file:
      - ./.env
    restart: unless-stopped
    expose:
      - ${CADVISOR_PORT:-8080}
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    networks:
      - docker-net

  loki:
    image: grafana/loki
    container_name: loki
    restart: unless-stopped
    ports:
      - ${LOKI_PORT:-3100}:3100
    volumes:
      - loki:/loki
    environment:
      - TZ=Europe/Madrid
    networks:
      - docker-net

networks:
  docker-net:
    external: ${NET_EXTERNAL:-false}

volumes:
  grafana:
  prometheus:
  loki:
```

### prometheus.yml

```yaml
# my global config
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: "node_exporter"
    static_configs:
      - targets: ["node_exporter:9100"]

  - job_name: "node_app"
    static_configs:
      - targets: ["node-app:3000"]
```

### Dockerfile

```dockerfile
# Dockerfile for Node.js application
FROM node:18

# Create and set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
```

### server.js

```javascript
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
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monitoring App</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
      color: #333;
    }
    .container {
      width: 50%;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      text-align: center;
      margin-bottom: 20px;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    label, input {
      margin-bottom:
```

### Acknowledgements

I want to express my gratitude to the following resources that were instrumental in the development of this project:

- docker-grafana repository: A big thank you to the creators and maintainers of this repository. The setup and documentation provided were crucial for integrating Grafana into a Docker environment.https://github.com/jetiradoro/docker-grafana 

- Caos Binario's YouTube Tutorial: I also want to extend my thanks to Caos Binario for their insightful video series on YouTube. Their clear and detailed explanations on configuring Grafana and Prometheus
greatly helped in understanding and implementing best practices in this project. https://www.youtube.com/watch?v=PCJwJpbln6Q&list=PLC-jxfv-8E7L-w6bdX61qa4ehrrgCIh4R&ab_channel=CaosBinario


