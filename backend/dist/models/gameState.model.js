"use strict";
/**
 * @file gameState.model.ts
 * @description Defines the Mongoose schema and model for storing game state data in MongoDB.
 * This model represents the structure of a player's saved game.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GridCellType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Re-defining types here for clarity within the model file.
// In a larger project, these might be imported from a shared types package/directory.
/**
 * @enum {string} GridCellType
 * @description Enum representing the different types of cells on the game grid.
 */
var GridCellType;
(function (GridCellType) {
    GridCellType["BLANK"] = "blank";
    GridCellType["SPEEDER"] = "speeder";
    GridCellType["LAVA"] = "lava";
    GridCellType["MUD"] = "mud";
})(GridCellType || (exports.GridCellType = GridCellType = {}));
/**
 * @const GameStateSchema
 * @type {Schema}
 * @description Mongoose schema definition for the GameState.
 * This defines the structure, types, validation, and indexing for GameState documents in MongoDB.
 */
const GameStateSchema = new mongoose_1.Schema({
    playerName: {
        type: String,
        required: [true, 'Player name is required.'], // Field is required.
        unique: true, // Ensure player names are unique for saving/loading.
        index: true // Create an index on playerName for faster queries.
    },
    difficulty: {
        type: String,
        required: [true, 'Difficulty level is required.'],
        enum: ['easy', 'medium', 'hell'] // Restrict values to defined difficulty levels.
    },
    player: {
        gridX: { type: Number, required: true },
        gridZ: { type: Number, required: true },
        worldX: { type: Number, required: true },
        worldZ: { type: Number, required: true },
        health: { type: Number, required: true },
        moves: { type: Number, required: true },
    },
    game: {
        timeLeft: { type: Number, required: true },
        isFpsView: { type: Boolean, required: true },
        currentCellType: { type: String, enum: Object.values(GridCellType), default: null },
        startCell: {
            x: { type: Number, required: true },
            z: { type: Number, required: true }
        },
        endCell: {
            x: { type: Number, required: true },
            z: { type: Number, required: true }
        },
        isOver: { type: Boolean, required: true, default: false },
        hasWon: { type: Boolean, required: true, default: false },
        timerGameOver: { type: Boolean, required: true, default: false },
    },
    // Schema for the 2D gridData array, containing GridCellForDB sub-documents.
    gridData: [[{
                id: String,
                type: { type: String, enum: Object.values(GridCellType) },
                x: Number,
                z: Number,
                gridX: Number,
                gridZ: Number,
            }]],
    visitedCellTrail: [{ type: String }], // Array of strings representing visited cell coordinates.
    lastSaved: { type: Date, default: Date.now }, // Timestamp, defaults to current time on creation/update.
});
/**
 * Mongoose model for the 'GameState' collection.
 * The first argument is the singular name of the collection Mongoose will use.
 * Mongoose automatically creates/uses a collection named 'gamestates' (pluralized, lowercased).
 * @const GameStateModel
 * @type {mongoose.Model<IGameState>}
 */
const GameStateModel = mongoose_1.default.model('GameState', GameStateSchema);
exports.default = GameStateModel;
//# sourceMappingURL=gameState.model.js.map