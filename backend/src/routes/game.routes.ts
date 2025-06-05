/**
 * @file game.routes.ts
 * @description Defines the API routes for game-related actions (save, load).
 * This file uses Express Router to organize game-specific endpoints.
 */

import { Router } from 'express';
import { saveGame, loadGame } from '../controllers/game.controller'; // Import controller functions

// Create a new Express router instance.
const router = Router();

/**
 * @route   POST /api/game/save
 * @desc    Save or update a player's game state.
 * The request body should contain the GameState object.
 * @access  Public (In a production application, this route should be protected by authentication)
 */
router.post('/save', saveGame);

/**
 * @route   POST /api/game/load
 * @desc    Load a player's game state.
 * The request body should contain an object with the `playerName`.
 * @access  Public (In a production application, this route should be protected by authentication)
 */
router.post('/load', loadGame);

// Export the router to be used in the main server setup.
export default router;
