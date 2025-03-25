FROM node:20-slim

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/false appuser

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Set proper permissions
RUN chown -R appuser:appuser /app

# Use non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/.well-known/webfinger || exit 1

EXPOSE 3000

CMD ["npm", "start"] 