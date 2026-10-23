# CareOps AI - Backend Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production and development dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose Express server port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL=mongodb://mongodb:27017/careops

# Start server (auto-seeds demo users on fresh database)
CMD ["node", "server.js"]
