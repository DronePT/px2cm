# Docker Deployment Guide

This guide explains how to build and run the px2cm application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier deployment)

## Quick Start with Docker Compose

The easiest way to run the application:

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at: **http://localhost:8080**

## Manual Docker Commands

### Build the Docker image

```bash
docker build -t px2cm:latest .
```

### Run the container

```bash
docker run -d \
  --name px2cm-app \
  -p 8080:80 \
  px2cm:latest
```

### View logs

```bash
docker logs -f px2cm-app
```

### Stop the container

```bash
docker stop px2cm-app
docker rm px2cm-app
```

## Docker Build Process

The Dockerfile uses a multi-stage build:

1. **Build Stage**:
   - Uses Node.js 20 Alpine image
   - Installs pnpm package manager
   - Installs dependencies with `pnpm install --frozen-lockfile`
   - Builds the production bundle with `pnpm build`

2. **Production Stage**:
   - Uses Nginx Alpine image (lightweight)
   - Copies built static files from build stage
   - Serves the application on port 80

## Port Configuration

By default, the container exposes port 80, which is mapped to port 8080 on your host machine. To change the host port:

**Docker Compose:**
```yaml
ports:
  - "3000:80"  # Change 3000 to your desired port
```

**Docker Run:**
```bash
docker run -d -p 3000:80 --name px2cm-app px2cm:latest
```

## Rebuild After Code Changes

If you make changes to the code:

```bash
# With Docker Compose
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Manual Docker
docker stop px2cm-app
docker rm px2cm-app
docker build --no-cache -t px2cm:latest .
docker run -d -p 8080:80 --name px2cm-app px2cm:latest
```

## Production Considerations

For production deployments, consider:

1. **Custom Nginx Configuration**: Create a custom `nginx.conf` for optimizations
2. **HTTPS**: Use a reverse proxy (like Traefik or Nginx Proxy Manager)
3. **Health Checks**: Add Docker health checks
4. **Resource Limits**: Set memory and CPU limits
5. **Volumes**: Mount configuration files as volumes for easier updates

## Troubleshooting

### Container won't start
```bash
docker logs px2cm-app
```

### Port already in use
Change the host port in docker-compose.yml or the docker run command.

### Build fails
Ensure you have enough disk space and Docker has sufficient resources allocated.

### Clear everything and start fresh
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```
