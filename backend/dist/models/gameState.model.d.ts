/**
 * @file gameState.model.ts
 * @description Defines the Mongoose schema and model for storing game state data in MongoDB.
 * This model represents the structure of a player's saved game.
 */
import mongoose, { Document } from 'mongoose';
/**
 * @enum {string} GridCellType
 * @description Enum representing the different types of cells on the game grid.
 */
export declare enum GridCellType {
    BLANK = "blank",
    SPEEDER = "speeder",
    LAVA = "lava",
    MUD = "mud"
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
    id: string;
    type: GridCellType;
    x: number;
    z: number;
    gridX: number;
    gridZ: number;
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
        gridX: number;
        gridZ: number;
        worldX: number;
        worldZ: number;
        health: number;
        moves: number;
    };
    /**
     * @property game
     * @description Object containing general game progression state.
     */
    game: {
        timeLeft: number;
        isFpsView: boolean;
        currentCellType: GridCellType | null;
        startCell: {
            x: number;
            z: number;
        };
        endCell: {
            x: number;
            z: number;
        };
        isOver: boolean;
        hasWon: boolean;
        timerGameOver: boolean;
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
 * Mongoose model for the 'GameState' collection.
 * The first argument is the singular name of the collection Mongoose will use.
 * Mongoose automatically creates/uses a collection named 'gamestates' (pluralized, lowercased).
 * @const GameStateModel
 * @type {mongoose.Model<IGameState>}
 */
declare const GameStateModel: mongoose.Model<IGameState, {}, {}, {}, mongoose.Document<unknown, {}, IGameState, {}> & IGameState & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default GameStateModel;
//# sourceMappingURL=gameState.model.d.ts.map