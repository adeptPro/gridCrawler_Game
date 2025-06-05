"use strict";
/**
 * @file game.routes.ts
 * @description Defines the API routes for game-related actions (save, load).
 * This file uses Express Router to organize game-specific endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const game_controller_1 = require("../controllers/game.controller"); // Import controller functions
// Create a new Express router instance.
const router = (0, express_1.Router)();
/**
 * @route   POST /api/game/save
 * @desc    Save or update a player's game state.
 * The request body should contain the GameState object.
 * @access  Public (In a production application, this route should be protected by authentication)
 */
router.post('/save', game_controller_1.saveGame);
/**
 * @route   POST /api/game/load
 * @desc    Load a player's game state.
 * The request body should contain an object with the `playerName`.
 * @access  Public (In a production application, this route should be protected by authentication)
 */
router.post('/load', game_controller_1.loadGame);
// Export the router to be used in the main server setup.
exports.default = router;
//# sourceMappingURL=game.routes.js.map