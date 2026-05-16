FROM node:18-alpine

WORKDIR /app

# Install system dependencies for git and security tools
RUN apk add --no-cache git curl wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

# Made with Bob
