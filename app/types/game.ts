// --- File: types/game.ts ---

/**
 * Enum for the different types of spaces/cells on the game grid.
 * @enum {string} GridCellType
 */
export enum GridCellType {
    BLANK = 'blank',
    SPEEDER = 'speeder',
    LAVA = 'lava',
    MUD = 'mud',
}

/**
 * Defines the effects (health/move changes) and appearance (color, name) of a grid cell type.
 * @interface CellEffect
 */
export interface CellEffect {
    healthChange: number;
    movesChange: number;
    color: string;
    name: string;
}

/**
 * Represents a single cell in the game grid.
 * @interface GridCell
 */
export interface GridCell {
    id: string;
    type: GridCellType;
    x: number;
    z: number;
    gridX: number;
    gridZ: number;
}

/**
 * Props for the AFrameGridGame component.
 * @interface AFrameGridGameProps
 */
export interface AFrameGridGameProps {
    gridData: GridCell[][];
    isFpsView: boolean;
    playerStartPos: { x: number; y: number; z: number };
    startMarkerPos: { x: number; z: number };
    endMarkerPos: { x: number; z: number };
    gameId: number;
    currentGridIndices: { x: number; z: number };
    visitedCellTrail: Set<string>;
}

/**
 * Generic props for screen components.
 * @interface ScreenProps
 */
export interface ScreenProps {
    onToggleScreen: () => void;
}

/**
 * Props for ClickToPlayScreen.
 * @interface ClickToPlayScreenProps
 */
export interface ClickToPlayScreenProps extends ScreenProps {
    playerName: string;
    onPlayerNameChange: (name: string) => void;
    onLoadGame: (playerName: string) => Promise<GameState | null>;
}

/**
 * Props for NowPlayingScreen.
 * @interface NowPlayingScreenProps
 */
export interface NowPlayingScreenProps extends ScreenProps {
    playerName: string;
    loadedGameState?: GameState | null;
    clearLoadedGameState: () => void;
    savedGameStateFromApp: GameState | null;
    onSetSavedGameState: (gameState: GameState | null) => void;
}

/**
 * Represents the available difficulty levels.
 * @type {string} DifficultyLevel
 */
export type DifficultyLevel = "easy" | "medium" | "hell";

/**
 * Structure for debugging information.
 * @interface DebugInfo
 */
export interface DebugInfo {
    playerGridX: number;
    playerGridZ: number;
    fpsCamFwdX: number;
    fpsCamFwdZ: number;
    fpsCamYaw: number;
    arrowUpEffectX: number;

    arrowUpEffectZ: number;
    playerVelX: number;
    playerVelZ: number;
    playerPosX: number;
    playerPosZ: number;
}

/**
 * Structure for the comprehensive game state object.
 * @interface GameState
 */
export interface GameState {
    playerName: string;
    difficulty: DifficultyLevel;
    player: {
        gridX: number;
        gridZ: number;
        worldX: number;
        worldZ: number;
        health: number;
        moves: number;
    };
    game: {
        timeLeft: number;
        isFpsView: boolean;
        currentCellType: GridCellType | null;
        startCell: { x: number; z: number };
        endCell: { x: number; z: number };
        isOver: boolean;
        hasWon: boolean;
        timerGameOver: boolean;
    };
    gridData: GridCell[][];
    visitedCellTrail: string[];
}

/**
 * Structure for API messages.
 * @interface ApiMessage
 */
export interface ApiMessage {
    text: string;
    type: 'success' | 'error';
}