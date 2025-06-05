"use strict";
/**
 * @file game.controller.ts
 * @description Controller functions for handling game-related API requests (save, load).
 * These functions contain the core logic for interacting with the GameState model.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGame = exports.saveGame = void 0;
const gameState_model_1 = __importDefault(require("../models/gameState.model"));
// Assuming IGameState from the model is sufficient for request body typing.
// For more rigorous validation, a dedicated DTO (Data Transfer Object) with validation rules could be used.
/**
 * Saves or updates a player's game state in the database.
 * If a game state for the given player name already exists, it is updated (upsert).
 * Otherwise, a new game state document is created.
 *
 * @async
 * @function saveGame
 * @param {Request} req - Express request object. The request body is expected to conform to the IGameState structure.
 * @param {Response} res - Express response object used to send back success or error messages.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
const saveGame = async (req, res) => {
    try {
        // Assert the request body to the IGameState type for type safety.
        const gameStateData = req.body;
        // Basic validation: Player name is essential for saving and identifying game states.
        if (!gameStateData.playerName) {
            res.status(400).json({ message: 'Player name is required to save game.' });
            return; // Exit if validation fails.
        }
        // Use findOneAndUpdate with upsert option:
        // - Finds a document by playerName.
        // - If found, updates it with the new gameStateData and a fresh lastSaved timestamp.
        // - If not found, creates (inserts) a new document with gameStateData.
        // - `new: true` returns the modified/new document.
        // - `setDefaultsOnInsert: true` applies schema defaults if a new document is inserted.
        const updatedGameState = await gameState_model_1.default.findOneAndUpdate({ playerName: gameStateData.playerName }, // Query to find the document.
        { ...gameStateData, lastSaved: new Date() }, // Data to update or insert, including a new save timestamp.
        { new: true, upsert: true, setDefaultsOnInsert: true } // Options for the operation.
        );
        // If the operation was successful (document created or updated).
        if (updatedGameState) {
            console.log(`Game state saved/updated for player: ${updatedGameState.playerName}`);
            // Respond with a success message and the saved/updated game state.
            res.status(200).json({ message: 'Game saved successfully!', gameState: updatedGameState });
        }
        else {
            // This case should ideally not be reached due to `upsert:true`, but serves as a fallback.
            console.error(`Error saving game state for player: ${gameStateData.playerName} - Operation returned null.`);
            res.status(500).json({ message: 'Error saving game state: Could not update or create.' });
        }
    }
    catch (error) {
        // Catch any errors during the database operation or processing.
        console.error('Error in saveGame controller:', error);
        // Provide a more specific error message if it's an instance of Error.
        if (error instanceof Error) {
            res.status(500).json({ message: 'Failed to save game state due to a server error.', error: error.message });
        }
        else {
            // For unknown error types.
            res.status(500).json({ message: 'An unknown error occurred while saving game state.' });
        }
    }
};
exports.saveGame = saveGame;
/**
 * Loads a player's game state from the database based on their player name.
 *
 * @async
 * @function loadGame
 * @param {Request} req - Express request object. The request body is expected to contain a `playerName` property.
 * @param {Response} res - Express response object used to send back the loaded game state or an error message.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
const loadGame = async (req, res) => {
    try {
        // Extract playerName from the request body.
        const { playerName } = req.body;
        // Basic validation: Player name is required to load a game.
        if (!playerName) {
            res.status(400).json({ message: 'Player name is required to load game.' });
            return; // Exit if validation fails.
        }
        // Find the game state document in MongoDB by the player's name.
        const gameState = await gameState_model_1.default.findOne({ playerName });
        // If a game state is found for the player.
        if (gameState) {
            console.log(`Game state loaded for player: ${gameState.playerName}`);
            // Respond with a success message and the loaded game state data.
            res.status(200).json({ message: 'Game loaded successfully!', gameState });
        }
        else {
            // If no game state is found for the given player name.
            console.log(`No game state found for player: ${playerName}`);
            res.status(404).json({ message: `No saved game found for player: ${playerName}.` });
        }
    }
    catch (error) {
        // Catch any errors during the database operation or processing.
        console.error('Error in loadGame controller:', error);
        // Provide a more specific error message if it's an instance of Error.
        if (error instanceof Error) {
            res.status(500).json({ message: 'Failed to load game state due to a server error.', error: error.message });
        }
        else {
            // For unknown error types.
            res.status(500).json({ message: 'An unknown error occurred while loading game state.' });
        }
    }
};
exports.loadGame = loadGame;
//# sourceMappingURL=game.controller.js.map