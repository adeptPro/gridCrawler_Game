/**
 * @file game.controller.ts
 * @description Controller functions for handling game-related API requests (save, load).
 * These functions contain the core logic for interacting with the GameState model.
 */
import { Request, Response } from 'express';
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
export declare const saveGame: (req: Request, res: Response) => Promise<void>;
/**
 * Loads a player's game state from the database based on their player name.
 *
 * @async
 * @function loadGame
 * @param {Request} req - Express request object. The request body is expected to contain a `playerName` property.
 * @param {Response} res - Express response object used to send back the loaded game state or an error message.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
export declare const loadGame: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=game.controller.d.ts.map