# --- Stage 1: Build the application ---
# Use an official Node.js runtime as a parent image (choose a version compatible with your project)
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install ALL dependencies (including devDependencies like typescript) for the build stage
RUN npm install

# Copy the rest of the application code
COPY . .

# Transpile TypeScript to JavaScript (this runs `tsc`)
# This will create the 'dist' directory if successful
RUN npm run build

# Prune devDependencies after build to reduce size for the next stage, if desired.
# This step is optional if your node_modules are copied selectively or if size isn't a major concern for this layer.
# RUN npm prune --production

# --- Stage 2: Production Environment ---
# Use a smaller, more secure base image for the production stage
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy only the necessary files from the builder stage
# This includes the compiled JavaScript (dist), production node_modules, and package.json

# Copy compiled code from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Re-install production dependencies or copy pruned node_modules
# Option 1: Re-install production dependencies (cleaner, but might take longer)
COPY package*.json ./
# --ignore-scripts can be added if no postinstall scripts are needed for prod
RUN npm install --omit=dev --ignore-scripts 

# Option 2: Copy pruned node_modules (faster if prune was effective)
# Ensure `npm prune --production` was run in the builder stage if using this.
# COPY --from=builder /usr/src/app/node_modules ./node_modules 
# COPY --from=builder /usr/src/app/package.json ./package.json


# Important: Copy the .env file if it's not handled by Docker Compose volumes
COPY .env ./.env 

# Expose the port the app runs on (should match the PORT in your .env or server.ts)
EXPOSE 5001

# Define the command to run the application
CMD [ "npm", "start" ]
