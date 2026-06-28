# Use Node.js 20 lightweight Alpine Linux image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies required for building)
RUN npm ci

# Copy application source code
COPY . .

# Build both frontend and backend
RUN npm run build

# Remove source maps and other build-time cache to save space (optional, but keep for debug if needed)
# RUN rm -rf src/ .env.example

# Ensure the upload directory exists
RUN mkdir -p tmp/flashcard-uploads

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Run the backend server
CMD ["npm", "run", "start"]

