# Deploying Cook2Cart on GitHub Codespaces

This guide provides step-by-step instructions to run and deploy the **Cook2Cart** project in **GitHub Codespaces**.

The project uses a microservice architecture:
- Core databases and queue infrastructure (Kafka, Zookeeper, Redis, Elasticsearch) run in Docker Compose.
- Python services and the ffmpeg-based Video Service run in Docker.
- The primary Spring Boot microservices and API Gateway run locally on the Codespace instance.
- The Vite + React frontend runs on Node.js.

---

## Prerequisites & DevContainer Configuration
We have added a `.devcontainer/devcontainer.json` configuration file to the repository. When you launch a Codespace, it will automatically:
1. Initialize an Ubuntu environment.
2. Install **Java 21** (required for the backend).
3. Install **Node.js 20** (required for the frontend).
4. Install **Docker-in-Docker** (to support Docker Compose).
5. Pre-configure port forwarding for all microservices.

---

## Step-by-Step Deployment Guide

### Step 1: Spin up the Codespace
1. Push your changes (including the new `.devcontainer` folder) to your GitHub repository.
2. On GitHub, navigate to your repository homepage.
3. Click the green **Code** button, select the **Codespaces** tab, and click **Create codespace on main**.
4. Wait for the Codespace to build and initialize.

---

### Step 2: Build the Video Service JAR
The `video-service` Docker container copies the compiled JAR file from its `target/` directory. Therefore, we must package it before running docker-compose:
```bash
cd backend/video-service
./mvnw clean package -DskipTests
cd ../..
```

---

### Step 3: Start Docker Compose Infrastructure
Start the core databases, messaging queues, and Docker-based microservices:
```bash
docker compose up --build -d
```
This starts:
- **Zookeeper** & **Kafka** (port 2181, 9092) - Event Streaming
- **Redis** (port 6379) - Caching
- **Elasticsearch** (port 9200) - Fuzzy Video Search
- **Video Service** (port 8086 -> internal 8081) - Downloads and splits audio/video
- **Python Transcript Service** (port 8089) - Grabs YouTube transcript details

Verify all Docker containers are running:
```bash
docker compose ps
```

---

### Step 4: Run Spring Boot Services
Open separate terminal tabs in your Codespace for each of the following microservices:

1. **Service Registry (Eureka)** (Must be started first)
   ```bash
   cd backend/service-registry
   ./mvnw spring-boot:run
   ```
   *Wait until the registry is fully online at `http://localhost:8761` before proceeding.*

2. **User Service** (Runs on port `8083`)
   ```bash
   cd backend/user-service
   ./mvnw spring-boot:run
   ```

3. **Product Service** (Runs on port `8084`)
   ```bash
   cd backend/product-service
   ./mvnw spring-boot:run
   ```

4. **Cart Service** (Runs on port `8082`)
   ```bash
   cd backend/cart-service
   ./mvnw spring-boot:run
   ```

5. **AI Service** (Runs on port `8085`)
   ```bash
   cd backend/ai-service
   ./mvnw spring-boot:run
   ```

6. **API Gateway** (Runs on port `8080`)
   ```bash
   cd backend/api-gateway
   ./mvnw spring-boot:run
   ```

---

### Step 5: Start the Frontend
Open a new terminal tab to launch the React frontend:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will spin up on port `5173`.

---

## Managing Port Forwarding & CORS in Codespaces

GitHub Codespaces isolates port traffic. To access the web app successfully, pay close attention to how you connect to the Codespace:

### Option A: VS Code Desktop (Recommended & Easiest)
1. In the bottom-left corner of the web-based Codespace, click the **Codespaces** status bar button.
2. Select **Open in VS Code Desktop**.
3. VS Code Desktop will handle port forwarding seamlessly. Your browser will resolve requests to `http://localhost:5173` (Frontend) and `http://localhost:8080` (API Gateway) perfectly without any CORS issues.

### Option B: Codespaces Web Editor (In-Browser)
If you run the project entirely inside the web browser:
1. Locate the **Ports** tab next to your Terminal panel in the bottom dock.
2. Look for port `8080` (API Gateway) and port `5173` (Frontend).
3. Right-click on port `8080` and change its **Port Visibility** to **Public**. (This is necessary because browser-side JavaScript requests from the frontend will fail authentication challenges if the port remains private).
4. Ensure the port visibility of `5173` is also set to **Public** or **Private** (accessible to you).
5. Open the local address link for port `5173` (e.g. `https://<codespace-name>-5173.app.github.dev`) to launch the application.

---

## Database Configuration Info
The microservices are pre-configured to connect to a cloud-hosted Neon PostgreSQL database. There is **no need** to set up or run PostgreSQL locally on the Codespace, as all DBs connect securely over the cloud using pre-configured connection parameters.
