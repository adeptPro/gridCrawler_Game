"use strict";
/**
 * @file server.ts
 * @description Main entry point for the backend Express server.
 * This file sets up the Express application, middleware, routes, database connection,
 * and starts listening for incoming requests.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors")); // Middleware for enabling Cross-Origin Resource Sharing.
const dotenv_1 = __importDefault(require("dotenv")); // Module for loading environment variables from a .env file.
// import bodyParser from 'body-parser'; // body-parser is deprecated, use express.json() and express.urlencoded() instead.
const game_routes_1 = __importDefault(require("./routes/game.routes")); // Import game-specific API routes.
// Load environment variables from the .env file into process.env.
dotenv_1.default.config();
// Initialize the Express application.
const app = (0, express_1.default)();
// Define the port for the server.
// It uses the PORT environment variable if set, otherwise defaults to 5001.
const PORT = process.env.PORT || 5001;
// --- Middleware Setup ---
// Enable CORS for all routes. This allows requests from different origins (e.g., your frontend running on localhost:3000).
// For production, you might want to configure CORS more restrictively.
app.use((0, cors_1.default)());
// Parse incoming requests with JSON payloads.
// This middleware is based on body-parser and handles 'Content-Type: application/json'.
// Increased limit to '10mb' to accommodate potentially large gameState objects.
app.use(express_1.default.json({ limit: '10mb' }));
// Parse incoming requests with URL-encoded payloads.
// This middleware is based on body-parser and handles 'Content-Type: application/x-www-form-urlencoded'.
// `extended: true` allows for rich objects and arrays to be encoded into the URL-encoded format.
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// --- API Routes ---
// Mount the game-specific routes under the '/api/game' path.
// All routes defined in `game.routes.ts` will be prefixed with '/api/game'.
app.use('/api/game', game_routes_1.default);
// --- Basic Error Handling Middleware ---
// This is a simple global error handler. It should be defined after all other app.use() and routes calls.
// For a production application, more sophisticated error handling (e.g., custom error classes, logging services) is recommended.
app.use((err, req, res, next) => {
    // Log the error stack trace to the console for debugging purposes.
    console.error("Unhandled error:", err.stack);
    // Send a generic 500 Internal Server Error response to the client.
    res.status(500).send('Something broke on the server!');
});
// --- MongoDB Connection ---
// Retrieve the MongoDB connection URI from environment variables.
const MONGO_URI = process.env.MONGO_URI;
// Critical check: If MONGO_URI is not defined, log an error and exit the application,
// as the backend cannot function without a database connection.
if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined in .env file. Please set it.');
    process.exit(1); // Exit with a failure code.
}
// Mongoose connection options (many are now defaults in Mongoose 6+).
const mongooseOptions = {
// useNewUrlParser: true, // Deprecated
// useUnifiedTopology: true, // Deprecated
};
// Attempt to connect to the MongoDB database using Mongoose.
mongoose_1.default.connect(MONGO_URI, mongooseOptions)
    .then(() => {
    // If the connection is successful, log a confirmation message.
    console.log('Successfully connected to MongoDB database.');
    // Start the Express server to listen for incoming requests only after the database connection is established.
    app.listen(PORT, () => {
        console.log(`Backend server is running on http://localhost:${PORT}`);
    });
})
    .catch((error) => {
    // If the MongoDB connection fails, log the error and exit the application.
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit with a failure code.
});
// --- Graceful Shutdown (Optional but Recommended for production) ---
// Handles process termination signals (like Ctrl+C) to ensure a clean shutdown,
// including disconnecting from MongoDB.
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
    process.on(signal, () => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        // Disconnect Mongoose from MongoDB.
        mongoose_1.default.disconnect().finally(() => {
            console.log('MongoDB disconnected.');
            // Perform any other cleanup tasks here if necessary.
            process.exit(0); // Exit the process cleanly.
        });
    });
});
//# sourceMappingURL=server.js.map