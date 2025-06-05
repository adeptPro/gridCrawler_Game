/**
 * @file gameState.model.ts
 * @description Defines the Mongoose schema and model for storing game state data in MongoDB.
 * This model represents the structure of a player's saved game.
 */

import mongoose, { Schema, Document } from 'mongoose';

// Re-defining types here for clarity within the model file.
// In a larger project, these might be imported from a shared types package/directory.

/**
 * @enum {string} GridCellType
 * @description Enum representing the different types of cells on the game grid.
 */
export enum GridCellType { // Added export
  BLANK = 'blank',
  SPEEDER = 'speeder',
  LAVA = 'lava',
  MUD = 'mud',
}

/**
 * @type {string} DifficultyLevel
 * @description Represents the available difficulty levels for the game.
 */
type DifficultyLevel = "easy" | "medium" | "hell";

/**
 * @interface GridCellForDB
 * @description Defines the structure for a single grid cell as stored in the database.
 * This is a sub-document within the GameState.
 */
interface GridCellForDB {
  id: string;           // Unique ID for the cell (e.g., "cell-0-0").
  type: GridCellType;   // The type of the cell.
  x: number;            // A-Frame world X coordinate.
  z: number;            // A-Frame world Z coordinate.
  gridX: number;        // Grid index X.
  gridZ: number;        // Grid index Z.
}

/**
 * @interface IGameState
 * @extends {Document}
 * @description Defines the structure of a GameState document in MongoDB.
 * This interface is used by Mongoose to type-check documents.
 */
export interface IGameState extends Document {
  /**
   * @property {string} playerName - The unique name of the player. Used as an identifier for saved games.
   */
  playerName: string;
  /**
   * @property {DifficultyLevel} difficulty - The difficulty level at which the game was saved.
   */
  difficulty: DifficultyLevel;
  /**
   * @property player
   * @description Object containing player-specific state like position, health, and moves.
   */
  player: {
    gridX: number;      // Player's current X index on the grid.
    gridZ: number;      // Player's current Z index on the grid.
    worldX: number;     // Player's A-Frame world X coordinate.
    worldZ: number;     // Player's A-Frame world Z coordinate.
    health: number;     // Player's current health.
    moves: number;      // Player's remaining moves.
  };
  /**
   * @property game
   * @description Object containing general game progression state.
   */
  game: {
    timeLeft: number;   // Remaining time in seconds for the game.
    isFpsView: boolean; // Was the game in FPS view when saved?
    currentCellType: GridCellType | null; // Type of the cell the player was on.
    startCell: { x: number; z: number }; // Grid indices of the start cell for the current map.
    endCell: { x: number; z: number };   // Grid indices of the end cell for the current map.
    isOver: boolean;    // Has the game ended (due to health, moves, or time)?
    hasWon: boolean;    // Has the player won the game?
    timerGameOver: boolean; // Did the game end specifically due to the timer?
  };
  /**
   * @property {GridCellForDB[][]} gridData - The 2D array representing the game board configuration.
   */
  gridData: GridCellForDB[][];
  /**
   * @property {string[]} visitedCellTrail - An array of strings ("x,z") representing cells the player has visited.
   */
  visitedCellTrail: string[];
  /**
   * @property {Date} lastSaved - Timestamp indicating when the game state was last saved.
   */
  lastSaved: Date;
}

/**
 * @const GameStateSchema
 * @type {Schema}
 * @description Mongoose schema definition for the GameState.
 * This defines the structure, types, validation, and indexing for GameState documents in MongoDB.
 */
const GameStateSchema: Schema = new Schema({
  playerName: { 
    type: String, 
    required: [true, 'Player name is required.'], // Field is required.
    unique: true,     // Ensure player names are unique for saving/loading.
    index: true       // Create an index on playerName for faster queries.
  },
  difficulty: { 
    type: String, 
    required: [true, 'Difficulty level is required.'],
    enum: ['easy', 'medium', 'hell'] // Restrict values to defined difficulty levels.
  },
  player: { // Nested object for player-specific data.
    gridX: { type: Number, required: true },
    gridZ: { type: Number, required: true },
    worldX: { type: Number, required: true },
    worldZ: { type: Number, required: true },
    health: { type: Number, required: true },
    moves: { type: Number, required: true },
  },
  game: { // Nested object for general game state.
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
const GameStateModel = mongoose.model<IGameState>('GameState', GameStateSchema);

export default GameStateModel;
