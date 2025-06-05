"use client"; 

// For TypeScript to recognize A-Frame custom elements in JSX and global THREE object:
// Create a file named `aframe.d.ts` (or any .d.ts file) in your project root 
// or a `types` folder, and add the following content:
/*
import * as THREE from 'three'; 

declare global {
  interface Window {
    THREE?: typeof THREE; 
    AFRAME?: any;         
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-camera': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-sphere': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-cylinder': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-box': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-cone': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-plane': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-sky': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-light': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-assets': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
    'a-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [key: string]: any };
  }
}
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios'; 

// --- Type Definitions ---
// (These would ideally be in a separate types/game.ts file and imported)

/**
 * Enum for the different types of spaces/cells on the game grid.
 * @enum {string} GridCellType
 */
enum GridCellType {
  BLANK = 'blank',      
  SPEEDER = 'speeder',  
  LAVA = 'lava',        
  MUD = 'mud',          
}

/**
 * Defines the effects (health/move changes) and appearance (color, name) of a grid cell type.
 * @interface CellEffect
 */
interface CellEffect {
  healthChange: number; 
  movesChange: number;  
  color: string;        
  name: string;         
}

/**
 * Represents a single cell in the game grid.
 * @interface GridCell
 */
interface GridCell {
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
interface AFrameGridGameProps {
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
interface ScreenProps {
  onToggleScreen: () => void; 
}

/**
 * Props for ClickToPlayScreen.
 * @interface ClickToPlayScreenProps
 */
interface ClickToPlayScreenProps extends ScreenProps {
    playerName: string;                           
    onPlayerNameChange: (name: string) => void;   
    onLoadGame: (playerName: string) => Promise<GameState | null>; 
}

/**
 * Props for NowPlayingScreen.
 * @interface NowPlayingScreenProps
 */
interface NowPlayingScreenProps extends ScreenProps {
    playerName: string;                           
    loadedGameState?: GameState | null;            
    clearLoadedGameState: () => void;             
    savedGameStateFromApp: GameState | null;      
    onSetSavedGameState: (gameState: GameState | null) => void; 
}

/**
 * Represents the available difficulty levels for the game.
 * @type {string} DifficultyLevel
 */
type DifficultyLevel = "easy" | "medium" | "hell";

/**
 * Structure for debugging information displayed on screen.
 * @interface DebugInfo
 */
interface DebugInfo {
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
interface GameState {
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
interface ApiMessage {
    text: string;               
    type: 'success' | 'error';  
}


// --- Constants ---
const GRID_SIZE = 25;                               
const CELL_UNIT_SIZE = 1;                           
const PLAYER_SPHERE_RADIUS = 0.35;                  
const PLAYER_BOUNDING_BOX_RADIUS_FACTOR = 0.85;     
const PLAYER_Y_POSITION = PLAYER_SPHERE_RADIUS;     
const PLAYER_COLOR = 'blue';                        

const FPS_PLAYER_FOOTPRINT_COLOR = '#0000AA';       
const FPS_PLAYER_FOOTPRINT_OPACITY = 0.5;           
const FPS_CAMERA_Y_OFFSET = PLAYER_SPHERE_RADIUS * 0.5; 
const FPS_CAMERA_Z_OFFSET = 0;                      

const INITIAL_CAMERA_Y_POSITION = GRID_SIZE * 0.8;  
const MIN_CAMERA_ZOOM = GRID_SIZE * 0.3;            
const MAX_CAMERA_ZOOM = GRID_SIZE * 1.5;            

const INITIAL_PLAYER_HEALTH = 100;                  
const INITIAL_PLAYER_MOVES = 200;                   
const GAME_DURATION_SECONDS = 60;                   

const DIFFICULTY_SETTINGS: Record<DifficultyLevel, { blankRatio: number }> = {
    easy: { blankRatio: 0.8 },   
    medium: { blankRatio: 0.55 },
    hell: { blankRatio: 0.3 },    
};

const MARKER_COLUMN_HEIGHT = 3;                     
const MARKER_COLUMN_RADIUS = 0.2;                   
const MARKER_TEXT_Y_OFFSET = MARKER_COLUMN_HEIGHT / 2 + 0.7; 
const BORDER_THICKNESS = 0.2;                       
const BORDER_HEIGHT = PLAYER_SPHERE_RADIUS * 2.5;   

const CURRENT_CELL_HIGHLIGHT_COLOR = "#FFFF99";     
const VISITED_CELL_TRAIL_COLOR = "#32CD32";         
const CELL_HIGHLIGHT_OPACITY = 0.7;                 
const CELL_TRAIL_OPACITY = 0.6;                     
const DEFAULT_CELL_OPACITY = 1.0;                   


const CELL_EFFECTS: Record<GridCellType, CellEffect> = {
  [GridCellType.BLANK]: { healthChange: 0, movesChange: -1, color: '#DDDDDD', name: 'Blank' },
  [GridCellType.SPEEDER]: { healthChange: -5, movesChange: 0, color: '#ADD8E6', name: 'Speeder' },
  [GridCellType.LAVA]: { healthChange: -50, movesChange: -10, color: '#FF4500', name: 'Lava' },
  [GridCellType.MUD]: { healthChange: -10, movesChange: -5, color: '#A0522D', name: 'Mud' },
};

// --- Helper Functions ---

/**
 * Gets a random integer between min (inclusive) and max (exclusive).
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value (exclusive).
 * @returns {number} A random integer.
 */
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min) + min);

/**
 * Initializes grid data, and determines random start/end perimeter cell indices based on difficulty.
 * @param {DifficultyLevel} difficulty - The selected game difficulty.
 * @returns An object containing the generated grid, and the start/end cell indices.
 */
const initializeGameData = (difficulty: DifficultyLevel): { 
  grid: GridCell[][]; 
  startCellIndices: { x: number; z: number }; 
  endCellIndices: { x: number; z: number };
} => {
  const grid: GridCell[][] = []; 
  const effectCellTypes = [GridCellType.SPEEDER, GridCellType.LAVA, GridCellType.MUD]; 
  const blankCellRatio = DIFFICULTY_SETTINGS[difficulty].blankRatio; 

  const getRandomPerimeterCell = (excludeGridX = -1, excludeGridZ = -1): { x: number, z: number } => {
    let gx: number, gz: number; 
    do { 
      const edge = getRandomInt(0, 4); 
      switch (edge) {
        case 0: gz = 0; gx = getRandomInt(0, GRID_SIZE); break; 
        case 1: gz = GRID_SIZE - 1; gx = getRandomInt(0, GRID_SIZE); break; 
        case 2: gx = 0; gz = getRandomInt(0, GRID_SIZE); break; 
        case 3: default: gx = GRID_SIZE - 1; gz = getRandomInt(0, GRID_SIZE); break; 
      }
    } while (gx === excludeGridX && gz === excludeGridZ); 
    return { x: gx, z: gz };
  };

  const startCellIndices = getRandomPerimeterCell(); 
  const endCellIndices = getRandomPerimeterCell(startCellIndices.x, startCellIndices.z); 

  for (let i = 0; i < GRID_SIZE; i++) { 
    grid[i] = []; 
    for (let j = 0; j < GRID_SIZE; j++) { 
      let cellType: GridCellType;
      if ((i === startCellIndices.x && j === startCellIndices.z) || (i === endCellIndices.x && j === endCellIndices.z)) {
        cellType = GridCellType.BLANK; 
      } else if (Math.random() < blankCellRatio) { 
        cellType = GridCellType.BLANK;
      } else {
        cellType = effectCellTypes[Math.floor(Math.random() * effectCellTypes.length)];
      }
      grid[i][j] = {
        id: `cell-${i}-${j}`, type: cellType, gridX: i, gridZ: j,
        x: (i - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, 
        z: (j - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, 
      };
    }
  }
  return { grid, startCellIndices, endCellIndices }; 
};

// --- A-Frame Components ---
/**
 * AFrameGridGame Component: Renders the main 3D A-Frame scene.
 * @param {AFrameGridGameProps} props - Component props.
 * @returns {JSX.Element} The A-Frame scene.
 */
const AFrameGridGame: React.FC<AFrameGridGameProps> = ({ 
    gridData, 
    isFpsView, 
    playerStartPos, 
    startMarkerPos, 
    endMarkerPos, 
    gameId,
    currentGridIndices, 
    visitedCellTrail   
}) => {

  useEffect(() => {
    const playerSphereEl = document.getElementById('player-sphere') as any; 
    if (playerSphereEl) { 
        playerSphereEl.setAttribute('position', playerStartPos as any); 
        if (playerSphereEl.components && playerSphereEl.components['kinematic-body']) {
            playerSphereEl.setAttribute('kinematic-body', 'velocity', {x: 0, y: 0, z: 0} as any); 
        }
    }
  }, [playerStartPos, gameId]); 

  useEffect(() => {
    const fpsCamEntity = document.getElementById('fps-camera') as any; 
    const playerFootprintEntity = document.getElementById('fps-player-footprint');

    if (fpsCamEntity && fpsCamEntity.sceneEl) { 
      fpsCamEntity.setAttribute('look-controls', 'enabled', isFpsView.toString());
      if (isFpsView) { 
        if (document.pointerLockElement !== fpsCamEntity.sceneEl.canvas) {
            fpsCamEntity.sceneEl.canvas.requestPointerLock();
        }
      } else { 
        if (document.pointerLockElement === fpsCamEntity.sceneEl.canvas) {
            document.exitPointerLock();
        }
      }
    }
    if (playerFootprintEntity) {
        playerFootprintEntity.setAttribute('visible', isFpsView.toString()); 
    }

    const cameraRigEntity = document.getElementById('camera-rig') as any;
    if (cameraRigEntity) {
        cameraRigEntity.setAttribute('camera-controls', 'enabled', (!isFpsView).toString());
    }
    const playerSphereEntity = document.getElementById('player-sphere');
    if (playerSphereEntity) {
        playerSphereEntity.setAttribute('data-fps-view-active', isFpsView.toString());
    }
  }, [isFpsView]);


  return (
    <a-scene key={gameId} embedded physics="driver: ammo; debug: false;" renderer="colorManagement: true; physicallyCorrectLights: true;">
      <a-assets timeout="10000"></a-assets>

      <a-entity id="camera-rig" position={`0 ${INITIAL_CAMERA_Y_POSITION} ${GRID_SIZE * 0.05}`} rotation="-85 0 0" camera-controls={`enabled: ${(!isFpsView).toString()};`}>
        <a-camera id="main-camera" active={!isFpsView} wasd-controls="enabled: false;" look-controls="enabled: false;"></a-camera>
      </a-entity>

      <a-sphere id="player-sphere" position={`${playerStartPos.x} ${playerStartPos.y} ${playerStartPos.z}`} radius={PLAYER_SPHERE_RADIUS} color={PLAYER_COLOR} material={`shader: standard; color: ${PLAYER_COLOR}; emissive: ${PLAYER_COLOR}; emissiveIntensity: 0.2; roughness: 0.4; metalness: 0.1`} shadow="cast: true" kinematic-body={`type: kinematic; radius: ${PLAYER_SPHERE_RADIUS * PLAYER_BOUNDING_BOX_RADIUS_FACTOR}; height: ${PLAYER_SPHERE_RADIUS * 2}; enableSlopes: false; gravity: 0;`} arrow-controls="speed: 2.8;" >
        <a-camera id="fps-camera" active={isFpsView} position={`0 ${FPS_CAMERA_Y_OFFSET} ${FPS_CAMERA_Z_OFFSET}`} rotation="0 0 0" wasd-controls="enabled: false;" look-controls="pointerLockEnabled: true; magicWindowTrackingEnabled: false; enabled: false;" ></a-camera>
        <a-cylinder
            id="fps-player-footprint"
            radius={PLAYER_SPHERE_RADIUS * PLAYER_BOUNDING_BOX_RADIUS_FACTOR}
            height="0.01" 
            position={`0 ${-PLAYER_SPHERE_RADIUS + 0.005} 0`} 
            rotation="0 0 0"
            material={`shader: flat; color: ${FPS_PLAYER_FOOTPRINT_COLOR}; opacity: ${FPS_PLAYER_FOOTPRINT_OPACITY};`}
            visible="false" 
        ></a-cylinder>
      </a-sphere>

      <a-entity id="ground-direction-arrow" visible="false">
        <a-box id="arrow-shaft" color="cyan" height="0.02" width="0.08" depth="0.4" position="0 0 -0.15" material="shader: flat; opacity: 0.7;"></a-box>
        <a-cone id="arrow-head" color="cyan" radius-bottom="0.12" radius-top="0" height="0.25" position="0 0 -0.4" rotation="-90 0 0" material="shader: flat; opacity: 0.7;"></a-cone>
      </a-entity>

      <a-box id="border-top" static-body color="#333333" height={BORDER_HEIGHT} width={GRID_SIZE * CELL_UNIT_SIZE + BORDER_THICKNESS * 2} depth={BORDER_THICKNESS} position={`0 ${BORDER_HEIGHT/2} ${-GRID_SIZE * CELL_UNIT_SIZE / 2 - BORDER_THICKNESS / 2}`}></a-box>
      <a-box id="border-bottom" static-body color="#333333" height={BORDER_HEIGHT} width={GRID_SIZE * CELL_UNIT_SIZE + BORDER_THICKNESS * 2} depth={BORDER_THICKNESS} position={`0 ${BORDER_HEIGHT/2} ${GRID_SIZE * CELL_UNIT_SIZE / 2 + BORDER_THICKNESS / 2}`}></a-box>
      <a-box id="border-left" static-body color="#333333" height={BORDER_HEIGHT} width={BORDER_THICKNESS} depth={GRID_SIZE * CELL_UNIT_SIZE} position={`${-GRID_SIZE * CELL_UNIT_SIZE / 2 - BORDER_THICKNESS / 2} ${BORDER_HEIGHT/2} 0`}></a-box>
      <a-box id="border-right" static-body color="#333333" height={BORDER_HEIGHT} width={BORDER_THICKNESS} depth={GRID_SIZE * CELL_UNIT_SIZE} position={`${GRID_SIZE * CELL_UNIT_SIZE / 2 + BORDER_THICKNESS / 2} ${BORDER_HEIGHT/2} 0`}></a-box>


      <a-entity id="start-marker" position={`${startMarkerPos.x} 0 ${startMarkerPos.z}`}>
        <a-cylinder color="#4CAF50" radius={MARKER_COLUMN_RADIUS} height={MARKER_COLUMN_HEIGHT} position={`0 ${MARKER_COLUMN_HEIGHT/2} 0`} material="shader: standard; metalness: 0.2; roughness: 0.7;" shadow="cast: true"></a-cylinder>
        <a-text value="START" align="center" color="#FFFFFF" width="4" position={`0 ${MARKER_TEXT_Y_OFFSET + 0.2} 0`} look-at="[camera]" side="double"></a-text>
      </a-entity>

      <a-entity id="end-marker" position={`${endMarkerPos.x} 0 ${endMarkerPos.z}`}>
        <a-cylinder color="#F44336" radius={MARKER_COLUMN_RADIUS} height={MARKER_COLUMN_HEIGHT} position={`0 ${MARKER_COLUMN_HEIGHT/2} 0`} material="shader: standard; metalness: 0.2; roughness: 0.7;" shadow="cast: true"></a-cylinder>
        <a-text value="END" align="center" color="#FFFFFF" width="4" position={`0 ${MARKER_TEXT_Y_OFFSET + 0.2} 0`} look-at="[camera]" side="double"></a-text>
      </a-entity>

      <a-sky color="#C0E4F0"></a-sky>
      <a-light type="ambient" color="#AAA"></a-light>
      <a-light type="directional" color="#FFF" intensity="0.8" position={`-5 ${INITIAL_CAMERA_Y_POSITION * 0.8} 5`} shadow-camera-automatic="#player-sphere, .grid-cell, #ground-direction-arrow, #start-marker, #end-marker"></a-light>
      <a-light type="directional" color="#FFF" intensity="0.4" position={`5 ${INITIAL_CAMERA_Y_POSITION * 0.8} -5`}></a-light>

      {gridData.flat().map((cell) => {
        const baseEffect = CELL_EFFECTS[cell.type]; 
        let cellColor = baseEffect.color;
        let cellOpacity = DEFAULT_CELL_OPACITY;
        const cellKey = `${cell.gridX},${cell.gridZ}`; 
        
        const isStartCell = cell.gridX === Math.round(startMarkerPos.x / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5) && 
                            cell.gridZ === Math.round(startMarkerPos.z / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5);
        const isEndCell = cell.gridX === Math.round(endMarkerPos.x / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5) && 
                          cell.gridZ === Math.round(endMarkerPos.z / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5);


        if (cell.gridX === currentGridIndices.x && cell.gridZ === currentGridIndices.z && !isStartCell && !isEndCell) {
          cellColor = CURRENT_CELL_HIGHLIGHT_COLOR;
          cellOpacity = CELL_HIGHLIGHT_OPACITY;
        } else if (visitedCellTrail.has(cellKey) && !isStartCell && !isEndCell) { 
          cellColor = VISITED_CELL_TRAIL_COLOR;
          cellOpacity = CELL_TRAIL_OPACITY;
        }

        return ( 
            <a-plane 
                key={cell.id} 
                class="grid-cell" 
                position={`${cell.x} 0 ${cell.z}`} 
                rotation="-90 0 0" 
                width={CELL_UNIT_SIZE * 0.98} 
                height={CELL_UNIT_SIZE * 0.98} 
                material={`shader: standard; color: ${cellColor}; opacity: ${cellOpacity}; roughness: 0.8;`}
                shadow="receive: true">
            </a-plane> 
        );
      })}
    </a-scene>
  );
};
// --- End File: components/AFrameGridGame.tsx (Conceptual) ---


// ================================================================================================
// --- File: components/ClickToPlayScreen.tsx (Conceptual) ---
// ================================================================================================
/**
 * ClickToPlayScreen Component: Initial screen for starting or loading a game.
 * @param {ClickToPlayScreenProps} props - Component props.
 * @returns {JSX.Element} The click-to-play screen UI.
 */
const ClickToPlayScreen: React.FC<ClickToPlayScreenProps> = ({ onToggleScreen, playerName, onPlayerNameChange, onLoadGame }) => { 
  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState<ApiMessage | null>(null);

  const handleLoadGameClick = async () => {
    if (!playerName.trim()) {
        setApiMessage({ text: "Please enter a player name to load.", type: 'error' });
        setTimeout(() => setApiMessage(null), 3000); 
        return; 
    }
    setIsLoading(true); 
    setApiMessage(null); 

    const loadedState = await onLoadGame(playerName); 
    
    if (loadedState) {
        if (loadedState.playerName === playerName) {
            setApiMessage({ text: `Game for ${playerName} loaded successfully!`, type: 'success' });
            setTimeout(() => {
                setApiMessage(null);
                onToggleScreen(); 
            }, 1500);
        } else {
            setApiMessage({ text: `Saved data for player '${loadedState.playerName}' found, but you entered '${playerName}'. Starting new game.`, type: 'error' });
            setTimeout(() => { setApiMessage(null); onToggleScreen(); }, 4000); 
        }
    } else {
        setApiMessage({ text: `No saved game found for ${playerName}. Starting new game.`, type: 'error' });
        setTimeout(() => { setApiMessage(null); onToggleScreen(); }, 3000);
    }
    setIsLoading(false); 
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#2c3e50', color: 'white', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", textAlign: 'center', padding: '20px', }}>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '25px' }}>Grid Runner</h1>
      <div style={{marginBottom: '20px'}}>
        <label htmlFor="playerNameInput" style={{marginRight: '10px', fontSize: '1.1rem'}}>Player Name:</label>
        <input 
            type="text" 
            id="playerNameInput" 
            value={playerName} 
            onChange={(e) => onPlayerNameChange(e.target.value)}
            style={{padding: '8px', fontSize: '1rem', borderRadius: '5px', border: '1px solid #ccc', color: '#000000'}} 
        />
      </div>
      <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', marginBottom: '15px', lineHeight: '1.6' }}> ARROW KEYS: Move Player <br /> WASD: Pan Camera | Z/X: Zoom Camera <br /> C: Toggle Camera View (Bird&apos;s-Eye / FPS) <br /> Reach the <strong style={{color: '#F44336'}}>END</strong> marker from the <strong style={{color: '#4CAF50'}}>START</strong> marker! </p>
      <div style={{display: 'flex', gap: '20px', marginBottom: '20px'}}>
        <button onClick={onToggleScreen} style={{ padding: '15px 35px', fontSize: 'clamp(1.1rem, 2.8vw, 1.6rem)', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.25)', transition: 'background-color 0.3s ease, transform 0.1s ease', }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2980b9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3498db'} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} > Start New Game </button>
        <button onClick={handleLoadGameClick} disabled={isLoading} style={{ padding: '15px 35px', fontSize: 'clamp(1.1rem, 2.8vw, 1.6rem)', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', cursor: isLoading? 'not-allowed' : 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.25)', transition: 'background-color 0.3s ease', opacity: isLoading ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#229954'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27ae60'} > {isLoading ? "Loading..." : "Load Game"} </button>
      </div>
      {apiMessage && (
        <div style={{ marginTop: '15px', padding: '10px', borderRadius: '5px', backgroundColor: apiMessage.type === 'error' ? 'rgba(255,0,0,0.7)' : 'rgba(0,255,0,0.7)', color: 'white' }}>
          {apiMessage.text}
        </div>
      )}
      <p style={{ marginTop: '30px', fontSize: '0.9rem', color: '#bdc3c7' }}> (Or press Spacebar to Start/Exit) </p>
    </div>
  );
};
// --- End File: components/ClickToPlayScreen.tsx (Conceptual) ---


// ================================================================================================
// --- File: components/NowPlayingScreen.tsx (Conceptual) ---
// ================================================================================================
/**
 * NowPlayingScreen Component: Main game screen where A-Frame scene is rendered and game logic runs.
 * @param {NowPlayingScreenProps} props - Component props.
 * @returns {JSX.Element} The main game screen UI.
 */
const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({ onToggleScreen, playerName, loadedGameState, clearLoadedGameState, savedGameStateFromApp, onSetSavedGameState }) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [gameId, setGameId] = useState(0); 

  const [gridData, setGridData] = useState<GridCell[][]>([]);
  const [playerStartPos, setPlayerStartPos] = useState({ x: 0, y: PLAYER_Y_POSITION, z: 0 });
  const [startMarkerPos, setStartMarkerPos] = useState({ x: 0, z: 0 });
  const [endMarkerPos, setEndMarkerPos] = useState({ x: 0, z: 0 });
  const [currentGridIndices, setCurrentGridIndices] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [actualStartCellIndices, setActualStartCellIndices] = useState<{ x: number; z: number }>({ x: 0, z: 0 }); 
  const [endCell, setEndCell] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [visitedCellTrail, setVisitedCellTrail] = useState<Set<string>>(new Set());


  const [playerHealth, setPlayerHealth] = useState(INITIAL_PLAYER_HEALTH);
  const [playerMoves, setPlayerMoves] = useState(INITIAL_PLAYER_MOVES);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [gameOver, setGameOver] = useState(false);
  const [timerGameOver, setTimerGameOver] = useState(false); 
  const [hasWon, setHasWon] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("Game Started!");
  const [isFpsView, setIsFpsView] = useState(false);
  const [showHealthFlash, setShowHealthFlash] = useState(false); 
  const [showDifficultyChangeFlash, setShowDifficultyChangeFlash] = useState(false);
  const [showGameStateDebugger, setShowGameStateDebugger] = useState(false); 
  const [apiMessage, setApiMessage] = useState<ApiMessage | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({ playerGridX:0, playerGridZ:0, fpsCamFwdX:0, fpsCamFwdZ:0, fpsCamYaw:0, arrowUpEffectX:0, arrowUpEffectZ:0, playerVelX:0, playerVelZ:0, playerPosX:0, playerPosZ:0 });
  const animationFrameId = useRef<number | null>(null); 
  const [gameState, setGameState] = useState<GameState>({
    playerName: playerName,
    difficulty: difficulty,
    player: { gridX: 0, gridZ: 0, worldX: 0, worldZ: 0, health: INITIAL_PLAYER_HEALTH, moves: INITIAL_PLAYER_MOVES },
    game: { timeLeft: GAME_DURATION_SECONDS, isFpsView: false, currentCellType: null, startCell: { x: 0, z: 0 }, endCell: { x: 0, z: 0 }, isOver: false, hasWon: false, timerGameOver: false },
    gridData: [],
    visitedCellTrail: []
  });


  const resetGame = useCallback((newDifficulty: DifficultyLevel, stateToLoad?: GameState | null) => {
    if (stateToLoad) {
        setGridData(stateToLoad.gridData); 
        const pStartPos = { x: stateToLoad.player.worldX, y: PLAYER_Y_POSITION, z: stateToLoad.player.worldZ };
        setPlayerStartPos(pStartPos);
        setStartMarkerPos({ x: (stateToLoad.game.startCell.x - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, z: (stateToLoad.game.startCell.z - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE });
        setEndMarkerPos({ x: (stateToLoad.game.endCell.x - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, z: (stateToLoad.game.endCell.z - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE });
        setCurrentGridIndices({x: stateToLoad.player.gridX, z: stateToLoad.player.gridZ});
        setActualStartCellIndices(stateToLoad.game.startCell);
        setEndCell(stateToLoad.game.endCell);
        setVisitedCellTrail(new Set(stateToLoad.visitedCellTrail || []));
        setPlayerHealth(stateToLoad.player.health);
        setPlayerMoves(stateToLoad.player.moves);
        setTimeLeft(stateToLoad.game.timeLeft);
        setDifficulty(stateToLoad.difficulty); 
        setIsFpsView(stateToLoad.game.isFpsView);
        setLastMessage("Game Loaded!");
    } else {
        const { grid, startCellIndices, endCellIndices } = initializeGameData(newDifficulty);
        setGridData(grid);
        const pStartPos = { x: (startCellIndices.x - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, y: PLAYER_Y_POSITION, z: (startCellIndices.z - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, };
        setPlayerStartPos(pStartPos);
        setStartMarkerPos({ x: (startCellIndices.x - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, z: (startCellIndices.z - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE });
        setEndMarkerPos({ x: (endCellIndices.x - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE, z: (endCellIndices.z - GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE });
        setCurrentGridIndices(startCellIndices);
        setActualStartCellIndices(startCellIndices);
        setEndCell(endCellIndices);
        setVisitedCellTrail(new Set<string>()); 
        setPlayerHealth(INITIAL_PLAYER_HEALTH);
        setPlayerMoves(INITIAL_PLAYER_MOVES);
        setTimeLeft(GAME_DURATION_SECONDS);
        setIsFpsView(false); 
        setLastMessage("Game Reset! Good luck!");
        setShowDifficultyChangeFlash(true);
        setTimeout(() => { setShowDifficultyChangeFlash(false); setTimeout(() => { setShowDifficultyChangeFlash(true); setTimeout(() => { setShowDifficultyChangeFlash(false); }, 75); }, 75); }, 75);
    }
    setGameOver(false);
    setTimerGameOver(false);
    setHasWon(false);
    setGameId(prevId => prevId + 1); 
    const playerSphere = document.getElementById('player-sphere') as any; if (playerSphere) playerSphere.setAttribute('arrow-controls', 'enabled', true);
    const cameraRig = document.getElementById('camera-rig') as any; if (cameraRig) cameraRig.setAttribute('camera-controls', 'enabled', true);
  }, []);

  useEffect(() => { 
    if (loadedGameState) {
        resetGame(loadedGameState.difficulty, loadedGameState);
        clearLoadedGameState(); 
    } else {
        resetGame(difficulty); 
    }
  }, [difficulty, resetGame, loadedGameState, clearLoadedGameState]);

  useEffect(() => {
    if (gameOver || hasWon || timerGameOver) return; 
    if (timeLeft <= 0) {
        setLastMessage("Time&apos;s Up! YOU LOSE!"); setTimerGameOver(true); setGameOver(true); 
        const playerSphere = document.getElementById('player-sphere') as any; if (playerSphere) playerSphere.setAttribute('arrow-controls', 'enabled', false);
        const cameraRig = document.getElementById('camera-rig') as any; if (cameraRig) cameraRig.setAttribute('camera-controls', 'enabled', false);
        const fpsCam = document.getElementById('fps-camera') as any; if (fpsCam) fpsCam.setAttribute('look-controls', 'enabled', false);
        if (document.pointerLockElement) { document.exitPointerLock(); }
        return;
    }
    const intervalId = setInterval(() => { setTimeLeft(prevTime => prevTime - 1); }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, gameOver, hasWon, timerGameOver]);

  useEffect(() => {
    if (gameOver || hasWon) return; 
    const playerSphere = document.getElementById('player-sphere') as any;
    if (!playerSphere) return;
    const gameTickInterval = setInterval(() => {
      const position = playerSphere.getAttribute('position') as { x: number; y: number; z: number } | null;
      if (!position) return;
      const gridX = Math.round(position.x / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5);
      const gridZ = Math.round(position.z / CELL_UNIT_SIZE + GRID_SIZE / 2 - 0.5);
      const clampedGridX = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
      const clampedGridZ = Math.max(0, Math.min(GRID_SIZE - 1, gridZ));

      if (clampedGridX !== currentGridIndices.x || clampedGridZ !== currentGridIndices.z) {
        if (gridData[currentGridIndices.x]?.[currentGridIndices.z]) { 
            const prevCellKey = `${currentGridIndices.x},${currentGridIndices.z}`;
            const isPrevStart = currentGridIndices.x === actualStartCellIndices.x && currentGridIndices.z === actualStartCellIndices.z;
            const isPrevEnd = currentGridIndices.x === endCell.x && currentGridIndices.z === endCell.z;
            if (!isPrevStart && !isPrevEnd) {
                setVisitedCellTrail(prevTrail => new Set(prevTrail).add(prevCellKey));
            }
        }
        setCurrentGridIndices({ x: clampedGridX, z: clampedGridZ });
        const currentCellData = gridData[clampedGridX]?.[clampedGridZ]; 
        if (currentCellData) {
          if (clampedGridX === endCell.x && clampedGridZ === endCell.z) {
            setHasWon(true); setGameOver(true); setLastMessage("You Win! Congratulations!");
            playerSphere.setAttribute('arrow-controls', 'enabled', false);
            const cameraRig = document.getElementById('camera-rig') as any; if (cameraRig) cameraRig.setAttribute('camera-controls', 'enabled', false);
            const fpsCam = document.getElementById('fps-camera') as any; if (fpsCam) fpsCam.setAttribute('look-controls', 'enabled', false);
            if (document.pointerLockElement) { document.exitPointerLock(); }
            return; 
          }
          const effect = CELL_EFFECTS[currentCellData.type];
          let newHealth = playerHealth + effect.healthChange; let newMoves = playerMoves + effect.movesChange;
          setPlayerHealth(newHealth); setPlayerMoves(newMoves);
          if (effect.healthChange < 0) {
            setShowHealthFlash(true); setTimeout(() => { setShowHealthFlash(false); setTimeout(() => { setShowHealthFlash(true); setTimeout(() => { setShowHealthFlash(false); }, 75); }, 75); }, 75); 
          }
          let message = `Player on ${effect.name}: Health ${effect.healthChange >= 0 ? '+' : ''}${effect.healthChange}, Moves ${effect.movesChange >= 0 ? '+' : ''}${effect.movesChange}.`;
          if (newHealth <= 0 || newMoves <= 0) {
            if (!timerGameOver) { 
                message = newHealth <= 0 ? "Game Over: Health depleted!" : "Game Over: Ran out of moves!";
                setGameOver(true);
            }
            playerSphere.setAttribute('arrow-controls', 'enabled', false);
            const cameraRig = document.getElementById('camera-rig') as any; if (cameraRig) cameraRig.setAttribute('camera-controls', 'enabled', false);
            const fpsCam = document.getElementById('fps-camera') as any; if (fpsCam) fpsCam.setAttribute('look-controls', 'enabled', false);
            if (document.pointerLockElement) { document.exitPointerLock(); }
          }
          if (!gameOver && !hasWon && !timerGameOver) setLastMessage(message); 
        }
      }
    }, 100);
    return () => clearInterval(gameTickInterval);
  }, [playerHealth, playerMoves, gridData, currentGridIndices, gameOver, hasWon, endCell, timerGameOver, actualStartCellIndices]); 

  useEffect(() => {
    const handleKeyControls = (event: KeyboardEvent) => {
      if (gameOver || hasWon) return; 

      if (event.code === 'KeyC') { 
        setIsFpsView(prev => { const nextIsFpsView = !prev; setLastMessage(nextIsFpsView ? "Switched to FPS View." : "Switched to Bird&apos;s-Eye View."); return nextIsFpsView; });
      }
      if (event.code === 'KeyQ') {
        setShowGameStateDebugger(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyControls);
    return () => window.removeEventListener('keydown', handleKeyControls);
  }, [gameOver, hasWon]);

  useEffect(() => {
    const groundArrow = document.getElementById('ground-direction-arrow') as any; 
    const playerSphereEl = document.getElementById('player-sphere') as any; 
    const fpsCameraEl = document.getElementById('fps-camera') as any; 

    const updateDebugAndArrow = () => {
        let playerWorldX = 0, playerWorldZ = 0, playerVelX = 0, playerVelZ = 0;
        if (playerSphereEl && playerSphereEl.object3D) { 
            const playerObjectPosition = playerSphereEl.object3D.position;
            playerWorldX = parseFloat(playerObjectPosition.x.toFixed(2));
            playerWorldZ = parseFloat(playerObjectPosition.z.toFixed(2));
            
            const kinBody = playerSphereEl.components['kinematic-body'];
            if (kinBody && kinBody.data.velocity) { 
                playerVelX = parseFloat(kinBody.data.velocity.x.toFixed(2)); 
                playerVelZ = parseFloat(kinBody.data.velocity.z.toFixed(2)); 
            }
        }
        
        let currentCellType: GridCellType | null = null;
        if(gridData.length > 0 && gridData[currentGridIndices.x] && gridData[currentGridIndices.x][currentGridIndices.z]){
            currentCellType = gridData[currentGridIndices.x][currentGridIndices.z].type;
        }

        const newGameState: GameState = {
            playerName: playerName,
            difficulty: difficulty,
            player: {
                gridX: currentGridIndices.x, gridZ: currentGridIndices.z,
                worldX: playerWorldX, worldZ: playerWorldZ,
                health: playerHealth, moves: playerMoves,
            },
            game: {
                timeLeft: timeLeft, isFpsView: isFpsView, currentCellType: currentCellType,
                startCell: actualStartCellIndices, 
                endCell: endCell,
                isOver: gameOver, hasWon: hasWon, timerGameOver: timerGameOver,
            },
            gridData: gridData, 
            visitedCellTrail: Array.from(visitedCellTrail) 
        };
        setGameState(newGameState);

        if (!groundArrow) { 
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        }
        if (gameOver || hasWon) {
            groundArrow.setAttribute('visible', 'false');
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        }
        
        groundArrow.setAttribute('position', { x: playerWorldX, y: 0.02, z: playerWorldZ } as any); 
        
        let newDebug: Partial<DebugInfo> = {
            playerGridX: currentGridIndices.x, playerGridZ: currentGridIndices.z,
            playerPosX: playerWorldX, playerPosZ: playerWorldZ,
            playerVelX: playerVelX, playerVelZ: playerVelZ,
        };
        
        if (typeof window !== 'undefined' && window.THREE) { 
            const tempForwardVector = new window.THREE.Vector3(); 

            if (isFpsView && fpsCameraEl?.object3D) { 
                const worldQuaternion = new window.THREE.Quaternion(); 
                fpsCameraEl.object3D.getWorldQuaternion(worldQuaternion);
                const euler = new window.THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ');
                groundArrow.setAttribute('rotation', { x: 0, y: window.THREE.MathUtils.radToDeg(euler.y), z: 0 } as any); 
                
                fpsCameraEl.object3D.getWorldDirection(tempForwardVector); 
                newDebug.fpsCamFwdX = parseFloat(tempForwardVector.x.toFixed(2)); 
                newDebug.fpsCamFwdZ = parseFloat(tempForwardVector.z.toFixed(2));
                newDebug.fpsCamYaw = parseFloat(window.THREE.MathUtils.radToDeg(euler.y).toFixed(1));
                newDebug.arrowUpEffectX = parseFloat((-tempForwardVector.x).toFixed(2)); 
                newDebug.arrowUpEffectZ = parseFloat((-tempForwardVector.z).toFixed(2));
            } else { 
                let birdEyeArrowRotationY = 0;
                if (playerSphereEl) {
                    const lastMove = playerSphereEl.getAttribute('data-last-birds-eye-move');
                    if (lastMove === 'up') birdEyeArrowRotationY = 0;
                    else if (lastMove === 'down') birdEyeArrowRotationY = 180;
                    else if (lastMove === 'left') birdEyeArrowRotationY = 90;  
                    else if (lastMove === 'right') birdEyeArrowRotationY = -90; 
                }
                groundArrow.setAttribute('rotation', { x: 0, y: birdEyeArrowRotationY, z: 0 } as any); 
                newDebug.fpsCamFwdX = 0; newDebug.fpsCamFwdZ = -1; newDebug.fpsCamYaw = 0;
                newDebug.arrowUpEffectX = 0; newDebug.arrowUpEffectZ = -1; 
            }
        }
        groundArrow.setAttribute('visible', 'true'); 
        setDebugInfo(prev => ({...prev, ...newDebug})); 

        if (isFpsView && !(gameOver || hasWon)) { 
            animationFrameId.current = requestAnimationFrame(updateDebugAndArrow);
        }
    };

    if (isFpsView && !(gameOver || hasWon)) {
        animationFrameId.current = requestAnimationFrame(updateDebugAndArrow);
    } else {
        updateDebugAndArrow(); 
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    }
    
    return () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    };
  }, [currentGridIndices, isFpsView, gameOver, hasWon, gridData, playerName, difficulty, playerHealth, playerMoves, timeLeft, endCell, timerGameOver, actualStartCellIndices, visitedCellTrail]); 


  useEffect(() => {
    const handleOverlayKeys = (event: KeyboardEvent) => {
        if ((gameOver || hasWon || timerGameOver) && (event.code === 'Enter' || event.code === 'Space')) {
            event.preventDefault();
            event.stopPropagation(); 
            resetGame(difficulty);
        }
    };
    window.addEventListener('keydown', handleOverlayKeys);
    return () => window.removeEventListener('keydown', handleOverlayKeys);
  }, [gameOver, hasWon, timerGameOver, difficulty, resetGame]);


  const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => { setDifficulty(event.target.value as DifficultyLevel); };
  
  const handleSaveGame = async () => {
    setApiMessage(null); 
    const currentGameStateForSave: GameState = { 
        playerName: playerName,
        difficulty: difficulty,
        player: {
            gridX: currentGridIndices.x, gridZ: currentGridIndices.z,
            worldX: debugInfo.playerPosX, worldZ: debugInfo.playerPosZ, 
            health: playerHealth, moves: playerMoves,
        },
        game: {
            timeLeft: timeLeft, isFpsView: isFpsView, 
            currentCellType: gridData[currentGridIndices.x]?.[currentGridIndices.z]?.type || null,
            startCell: actualStartCellIndices, 
            endCell: endCell,
            isOver: gameOver, hasWon: hasWon, timerGameOver: timerGameOver,
        },
        gridData: gridData, 
        visitedCellTrail: Array.from(visitedCellTrail) 
    };
    console.log("Attempting to save game state:", currentGameStateForSave);
    try {
        localStorage.setItem(`gameState_${playerName}`, JSON.stringify(currentGameStateForSave));
        await new Promise(resolve => setTimeout(resolve, 700)); 
        
        onSetSavedGameState(currentGameStateForSave); 
        setApiMessage({ text: 'Game Saved Successfully!', type: 'success' });
    } catch (error) {
        console.error('Error saving game:', error);
        setApiMessage({ text: 'Error saving game. Please try again.', type: 'error' });
    }
    setTimeout(() => setApiMessage(null), 3000); 
  };

  const handleLoadFromSavedState = () => {
    if (savedGameStateFromApp) { 
        resetGame(savedGameStateFromApp.difficulty, savedGameStateFromApp); 
        setApiMessage({ text: 'Game loaded from last save point!', type: 'success' });
    } else { 
        setApiMessage({ text: 'No game saved in this session to load.', type: 'error' });
    }
    setTimeout(() => setApiMessage(null), 3000); 
  };


  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#1A1A1A' }}>
      {showHealthFlash && ( <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(255, 0, 0, 0.25)', zIndex: 2000, pointerEvents: 'none', }}></div> )}
      {showDifficultyChangeFlash && ( <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 255, 0, 0.25)', zIndex: 2000, pointerEvents: 'none', }}></div> )}
      
      <div style={{ padding: '8px 15px', backgroundColor: 'rgba(0,0,0,0.9)', color: 'white', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '0.9em', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '5px' }}>
          <div> 
            <span style={{marginRight: '10px'}}>{playerName || "Player"}:</span>
            <span>H: <strong style={{color: showHealthFlash ? '#FF4136' : (playerHealth < 25 ? '#FF4136' : playerHealth < 50 ? '#FF851B' : '#2ECC40')}}>{playerHealth}</strong></span> 
            <span style={{ marginLeft: '10px' }}>M: <strong style={{color: playerMoves < 25 ? '#FF4136' : playerMoves < 50 ? '#FF851B' : '#7FDBFF'}}>{playerMoves}</strong></span> 
            <span style={{ marginLeft: '10px' }}>T: <strong style={{color: timeLeft < 10 ? '#FF4136' : timeLeft < 30 ? '#FF851B' : '#0074D9'}}>{timeLeft}s</strong></span> 
          </div>
          <div style={{display: 'flex', alignItems: 'center'}}> 
            <label htmlFor="difficulty-select" style={{marginRight: '5px', fontSize: '0.9em'}}>Difficulty:</label>
            <select id="difficulty-select" value={difficulty} onChange={handleDifficultyChange} disabled={gameOver || hasWon || timerGameOver} style={{marginRight: '10px', padding: '3px', fontSize: '0.9em', backgroundColor: '#555', color: 'white', border: '1px solid #777', borderRadius: '3px'}}> <option value="easy">Easy</option> <option value="medium">Medium</option> <option value="hell">Hell</option> </select> 
            <div style={{fontSize: '0.65em', marginRight: '10px', border: '1px solid #444', padding: '2px 4px', borderRadius: '3px', minWidth: '250px', textAlign: 'left', lineHeight: '1.1' }}> 
                Dbg: Grid({debugInfo.playerGridX},{debugInfo.playerGridZ}) P({debugInfo.playerPosX},{debugInfo.playerPosZ})<br/>V({debugInfo.playerVelX},{debugInfo.playerVelZ}) CF({debugInfo.fpsCamFwdX},{debugInfo.fpsCamFwdZ}) CYaw:{debugInfo.fpsCamYaw}°<br/>UpDir({debugInfo.arrowUpEffectX},{debugInfo.arrowUpEffectZ}) 
            </div> 
            <button onClick={handleSaveGame} disabled={gameOver || hasWon || timerGameOver} style={{padding: '5px 10px', fontSize: '0.9em', cursor: (gameOver || hasWon || timerGameOver) ? 'not-allowed' : 'pointer', backgroundColor: '#5cb85c', border: '1px solid #4cae4c', borderRadius: '4px', color: 'white', opacity: (gameOver || hasWon || timerGameOver) ? 0.6 : 1, marginRight: '5px'}} > Save </button>
            <button onClick={handleLoadFromSavedState} disabled={!savedGameStateFromApp || gameOver || hasWon || timerGameOver} style={{padding: '5px 10px', fontSize: '0.9em', cursor: (!savedGameStateFromApp || gameOver || hasWon || timerGameOver) ? 'not-allowed' : 'pointer', backgroundColor: '#f0ad4e', border: '1px solid #eea236', borderRadius: '4px', color: 'white', opacity: (!savedGameStateFromApp || gameOver || hasWon || timerGameOver) ? 0.6 : 1, marginRight: '5px'}} > Load </button>
            <button onClick={onToggleScreen} disabled={gameOver || hasWon || timerGameOver} style={{padding: '5px 10px', fontSize: '0.9em', cursor: (gameOver || hasWon || timerGameOver) ? 'not-allowed' : 'pointer', backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', color: 'white', opacity: (gameOver || hasWon || timerGameOver) ? 0.6 : 1}} > Exit </button> 
          </div>
        </div>
        <div style={{fontSize: '0.85em', textAlign: 'left', width: '100%', marginBottom: '5px' }}> Controls: [Arrows: Player] [WASD: Cam Pan] [Z/X: Cam Zoom] [C: Toggle View ({isFpsView ? "FPS" : "Bird&apos;s-Eye"})] [Q: Toggle GameState Debug] </div>
        <div style={{ fontSize: '0.8em', textAlign: 'left', width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}> <strong style={{marginRight: '5px'}}>Legend: </strong> {Object.entries(CELL_EFFECTS).map(([key, {name, color, healthChange, movesChange}]) => { const effectsString = []; if (healthChange !== 0) effectsString.push(`H:${healthChange}`); if (movesChange !== 0) effectsString.push(`M:${movesChange}`); return ( <span key={key} style={{ marginRight: '10px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}> <span style={{ width: '10px', height: '10px', backgroundColor: color, marginRight: '4px', border: '1px solid #444', display: 'inline-block' }}></span> {name} {effectsString.length > 0 ? `(${effectsString.join(', ')})` : ''} </span> ); })} </div>
      </div>
      
      {showGameStateDebugger && (
        <div style={{ position: 'fixed', top: '120px', left: '10px', backgroundColor: 'rgba(40,40,40,0.9)', color: '#E0E0E0', padding: '10px', borderRadius: '5px', zIndex: 998, fontSize: '0.6em', fontFamily: "'Consolas', 'Courier New', monospace", maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', width: '350px', border: '1px solid #666', boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <pre style={{margin: 0}}><strong>Current GameState:</strong><br/>
            {JSON.stringify(gameState, null, 2)}</pre>
        </div>
      )}
       {showGameStateDebugger && savedGameStateFromApp && (
        <div style={{ position: 'fixed', top: '120px', left: '370px', backgroundColor: 'rgba(50,50,60,0.9)', color: '#E0E0E0', padding: '10px', borderRadius: '5px', zIndex: 998, fontSize: '0.6em', fontFamily: "'Consolas', 'Courier New', monospace", maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', width: '350px', border: '1px solid #666', boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <pre style={{margin: 0}}><strong>Saved GameState (Session):</strong><br/>
            {JSON.stringify(savedGameStateFromApp, null, 2)}</pre>
        </div>
      )}

      {apiMessage && ( <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '5px', backgroundColor: apiMessage.type === 'error' ? 'rgba(220,53,69,0.9)' : 'rgba(40,167,69,0.9)', color: 'white', zIndex: 2000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}> {apiMessage.text} </div> )}
      <div style={{ position: 'fixed', bottom: '8px', left: '8px', right: '8px', padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#DDD', textAlign: 'center', zIndex: 1000, borderRadius: '4px', fontSize: '0.8em', fontFamily: "'Consolas', 'Courier New', monospace", }}> {lastMessage} </div>
      {(gameOver && !hasWon && !timerGameOver) && ( <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '25px 35px', backgroundColor: 'rgba(30, 30, 30, 0.97)', color: 'white', textAlign: 'center', zIndex: 1001, borderRadius: '12px', border: '1px solid #444', boxShadow: '0 0 25px rgba(0,0,0,0.6)' }}> <h2 style={{fontSize: '1.8em', color: '#FF4136', margin: '0 0 12px 0'}}>Game Over!</h2> <p style={{fontSize: '1em', margin: '0 0 18px 0'}}>{lastMessage.startsWith("Game Over:") ? lastMessage.substring(10) : "Try again!"}</p> <button onClick={() => resetGame(difficulty)} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#3498db', border: 'none', borderRadius: '7px', color: 'white', marginRight: '10px'}} > Try Again </button> <button onClick={onToggleScreen} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#555', border: 'none', borderRadius: '7px', color: 'white'}} > Menu </button> </div> )}
      {timerGameOver && ( <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '25px 35px', backgroundColor: 'rgba(200, 0, 0, 0.97)', color: 'white', textAlign: 'center', zIndex: 1001, borderRadius: '12px', border: '1px solid #8B0000', boxShadow: '0 0 25px rgba(0,0,0,0.6)' }}> <h2 style={{fontSize: '2em', color: '#FFFFFF', margin: '0 0 12px 0'}}>Time&apos;s Up!</h2> <h3 style={{fontSize: '1.5em', color: '#FFD700', margin: '0 0 18px 0'}}>YOU LOSE!</h3> <button onClick={() => resetGame(difficulty)} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#3498db', border: 'none', borderRadius: '7px', color: 'white', marginRight: '10px'}} > Try Again </button> <button onClick={onToggleScreen} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#555', border: 'none', borderRadius: '7px', color: 'white'}} > Menu </button> </div> )}
      {hasWon && ( <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '25px 35px', backgroundColor: 'rgba(30, 144, 30, 0.97)', color: 'white', textAlign: 'center', zIndex: 1001, borderRadius: '12px', border: '1px solid #2E8B57', boxShadow: '0 0 25px rgba(0,0,0,0.6)' }}> <h2 style={{fontSize: '1.8em', color: '#90EE90', margin: '0 0 12px 0'}}>You Win!</h2> <p style={{fontSize: '1em', margin: '0 0 18px 0'}}>Congratulations on reaching the end!</p> <button onClick={() => resetGame(difficulty)} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#3498db', border: 'none', borderRadius: '7px', color: 'white', marginRight: '10px'}} > Play Again </button> <button onClick={onToggleScreen} style={{padding: '10px 22px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#555', border: 'none', borderRadius: '7px', color: 'white'}} > Menu </button> </div> )}
      
      <div style={{marginTop: '0px', height: '100vh'}}> {gridData.length > 0 && <AFrameGridGame gridData={gridData} isFpsView={isFpsView} playerStartPos={playerStartPos} startMarkerPos={startMarkerPos} endMarkerPos={endMarkerPos} gameId={gameId} currentGridIndices={currentGridIndices} visitedCellTrail={visitedCellTrail} />} </div>
    </div>
  );
};

// --- Main Application Component ---
enum ScreenType { CLICK_TO_PLAY = 'clickToPlay', NOW_PLAYING = 'nowPlaying',}
const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(ScreenType.CLICK_TO_PLAY);
  const [areScriptsReady, setAreScriptsReady] = useState(false);
  const [playerName, setPlayerName] = useState<string>(""); 
  const [loadedGameState, setLoadedGameState] = useState<GameState | null>(null);
  const [savedGameStateForApp, setSavedGameStateForApp] = useState<GameState | null>(null); 


  const toggleScreen = useCallback(() => { setCurrentScreen((prevScreen) => prevScreen === ScreenType.CLICK_TO_PLAY ? ScreenType.NOW_PLAYING : ScreenType.CLICK_TO_PLAY ); }, []);
  
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
  };

  const clearLoadedGameState = () => {
    setLoadedGameState(null);
  }

  const handleSetSavedGameState = (gameStateToSave: GameState | null) => {
    setSavedGameStateForApp(gameStateToSave);
  };

  const handleLoadGame = async (pName: string): Promise<GameState | null> => {
    console.log(`Attempting to load game for player: ${pName}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        const savedGameString = localStorage.getItem(`gameState_${pName}`);
        if (savedGameString) { 
            const loadedData = JSON.parse(savedGameString) as GameState;
            if (loadedData.playerName === pName) { 
                loadedData.visitedCellTrail = Array.isArray(loadedData.visitedCellTrail) ? loadedData.visitedCellTrail : [];
                console.log('Game loaded successfully:', loadedData);
                setLoadedGameState(loadedData); 
                return loadedData;
            } else {
                console.warn(`Player name mismatch. Found data for '${loadedData.playerName}', expected '${pName}'.`);
                return null;
            }
        } else {
            console.log('No saved game found for player:', pName);
            return null;
        }
    } catch (error) {
        console.error('Error loading game:', error);
        return null;
    }
  };


  const handleGlobalKeyDown = useCallback( (event: KeyboardEvent) => { 
      if (event.code === 'Space') { 
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') { return; } 
          
          const playerSphereEl = document.getElementById('player-sphere') as any;
          const cameraRigEl = document.getElementById('camera-rig') as any;
          const fpsCameraEl = document.getElementById('fps-camera') as any;

          const arrowControlsEnabled = playerSphereEl?.components?.['arrow-controls']?.data.enabled ?? (currentScreen === ScreenType.NOW_PLAYING);
          const cameraControlsEnabled = cameraRigEl?.components?.['camera-controls']?.data.enabled ?? (currentScreen === ScreenType.NOW_PLAYING);
          const fpsCamLookControlsEnabled = fpsCameraEl?.components?.['look-controls']?.data.enabled ?? false;

          if (currentScreen === ScreenType.CLICK_TO_PLAY) { 
              event.preventDefault(); toggleScreen(); 
          } else if (currentScreen === ScreenType.NOW_PLAYING) { 
              if (!arrowControlsEnabled || !cameraControlsEnabled || (fpsCamLookControlsEnabled && document.pointerLockElement) || (!fpsCamLookControlsEnabled && !document.pointerLockElement)) { 
                  if (!(fpsCamLookControlsEnabled && document.pointerLockElement)) { 
                      event.preventDefault(); toggleScreen(); 
                  } 
              } 
          } 
      } 
  }, [toggleScreen, currentScreen] );
  
  useEffect(() => { window.addEventListener('keydown', handleGlobalKeyDown); return () => window.removeEventListener('keydown', handleGlobalKeyDown); }, [handleGlobalKeyDown]);
  
  useEffect(() => {
    const loadScript = (src: string, async = true, onLoad?: () => void, onError?: () => void) => { const script = document.createElement('script'); script.src = src; script.async = async; if (onLoad) script.onload = onLoad; if (onError) script.onerror = onError || (() => console.error(`Failed to load script: ${src}`)); document.head.appendChild(script); return script; };
    
    // Define registerAFrameComponents in a scope accessible to all parts of this useEffect
    const registerAFrameComponents = () => {
      if (!window.AFRAME) {
        console.error("AFRAME global not found, cannot register components.");
        return;
      }
      if (!window.AFRAME.components['arrow-controls']) {
          window.AFRAME.registerComponent('arrow-controls', { schema: { speed: { default: 2.8 }, enabled: { default: true } }, init: function () { 
              if (typeof window !== 'undefined' && window.THREE) {
                  this.velocity = new window.THREE.Vector3(); 
                  this.worldUp = new window.THREE.Vector3(0, 1, 0); 
                  this.forwardVector = new window.THREE.Vector3(); 
                  this.rightVector = new window.THREE.Vector3();   
              } else {
                  console.error("THREE.js not available for arrow-controls init");
                  this.velocity = { set: () => {}, add: () => {}, sub: () => {}, normalize: () => ({ multiplyScalar: () => {} }), lengthSq: () => 0 }; // Mock methods
                  this.worldUp = {x:0,y:1,z:0};
                  this.forwardVector = {x:0,y:0,z:0, copy: () => this.forwardVector, applyAxisAngle: () => this.forwardVector, normalize: () => this.forwardVector};
                  this.rightVector = {x:0,y:0,z:0, copy: () => this.rightVector, applyAxisAngle: () => this.rightVector};
              }
              this.keys = {}; 
              this.lastBirdseyeMove = 'up'; 
              this.onKeyDown = this.onKeyDown.bind(this); this.onKeyUp = this.onKeyUp.bind(this); window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); 
          }, remove: function () { window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); }, onKeyDown: function (event: KeyboardEvent) { if (!this.data.enabled) return; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) { if (this.el.sceneEl && this.el.sceneEl.isPlaying && this.data.enabled) { event.preventDefault(); } const isFpsActive = this.el.getAttribute('data-fps-view-active') === 'true'; if(!isFpsActive) { if(event.code === 'ArrowUp') this.el.setAttribute('data-last-birds-eye-move', 'up'); else if(event.code === 'ArrowDown') this.el.setAttribute('data-last-birds-eye-move', 'down'); else if(event.code === 'ArrowLeft') this.el.setAttribute('data-last-birds-eye-move', 'left'); else if(event.code === 'ArrowRight') this.el.setAttribute('data-last-birds-eye-move', 'right');} } this.keys[event.code] = true; }, onKeyUp: function (event: KeyboardEvent) { if (!this.data.enabled) return; this.keys[event.code] = false; }, tick: function (time: number, deltaTime: number) { if (!this.data.enabled || !this.el.sceneEl || !this.el.sceneEl.hasLoaded || !window.THREE || !this.velocity ) { if(this.el.components['kinematic-body']) { this.el.setAttribute('kinematic-body', 'velocity', {x: 0, y: 0, z: 0}); } return; } const dt = deltaTime / 1000; const speed = this.data.speed; this.velocity.set(0, 0, 0); const isFpsActive = this.el.getAttribute('data-fps-view-active') === 'true'; if (isFpsActive) { const fpsCameraEl = document.getElementById('fps-camera') as any; if (fpsCameraEl && fpsCameraEl.object3D) { fpsCameraEl.object3D.getWorldDirection(this.forwardVector); this.forwardVector.y = 0; this.forwardVector.normalize(); this.rightVector.copy(this.forwardVector).applyAxisAngle(this.worldUp, -Math.PI / 2); if (this.keys['ArrowUp'])    this.velocity.sub(this.forwardVector); if (this.keys['ArrowDown'])  this.velocity.add(this.forwardVector); if (this.keys['ArrowLeft'])  this.velocity.add(this.rightVector);  if (this.keys['ArrowRight']) this.velocity.sub(this.rightVector);  } } else { if (this.keys['ArrowUp'])    this.velocity.z -= 1; if (this.keys['ArrowDown'])  this.velocity.z += 1; if (this.keys['ArrowLeft'])  this.velocity.x -= 1; if (this.keys['ArrowRight']) this.velocity.x += 1; } if (this.velocity.lengthSq() > 0) { this.velocity.normalize().multiplyScalar(speed); } const currentPosition = this.el.getAttribute('position'); const radius = (this.el.getAttribute('radius') || PLAYER_SPHERE_RADIUS) * PLAYER_BOUNDING_BOX_RADIUS_FACTOR; const maxPos = (GRID_SIZE / 2 - 0.5) * CELL_UNIT_SIZE - radius; const minPos = (-GRID_SIZE / 2 + 0.5) * CELL_UNIT_SIZE + radius; let nextX = currentPosition.x + this.velocity.x * dt; let nextZ = currentPosition.z + this.velocity.z * dt; let actualVelocityX = this.velocity.x; let actualVelocityZ = this.velocity.z; if ((this.velocity.x > 0 && nextX > maxPos) || (this.velocity.x < 0 && nextX < minPos)) { actualVelocityX = 0; } if ((this.velocity.z > 0 && nextZ > maxPos) || (this.velocity.z < 0 && nextZ < minPos)) { actualVelocityZ = 0; } if (this.el.components['kinematic-body']) { this.el.setAttribute('kinematic-body', 'velocity', {x: actualVelocityX, y:0, z: actualVelocityZ}); } else { const clampedX = Math.max(minPos, Math.min(maxPos, nextX)); const clampedZ = Math.max(minPos, Math.min(maxPos, nextZ)); this.el.setAttribute('position', { x: clampedX, y: currentPosition.y, z: clampedZ }); } } }); }
        if (!window.AFRAME.components['camera-controls']) { window.AFRAME.registerComponent('camera-controls', { schema: { panSpeed: { default: 5 }, zoomSpeed: { default: 8 }, minZoom: { default: MIN_CAMERA_ZOOM }, maxZoom: { default: MAX_CAMERA_ZOOM }, enabled: { default: true } }, init: function () { 
            if (typeof window !== 'undefined' && window.THREE) {
                this.panVector = new window.THREE.Vector3(); 
            } else {
                console.error("THREE.js not available for camera-controls init");
                this.panVector = {set: () => {}, normalize: () => ({multiplyScalar: () => {} }), lengthSq: () => 0, add: () => {}}; // Mock methods
            }
            this.keys = {}; 
            this.onKeyDown = this.onKeyDown.bind(this); this.onKeyUp = this.onKeyUp.bind(this); window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); 
        }, remove: function () { window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); }, onKeyDown: function (event: KeyboardEvent) { if (!this.data.enabled) return; if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX'].includes(event.code)) { if (this.el.sceneEl && this.el.sceneEl.isPlaying && this.data.enabled) { event.preventDefault(); } } this.keys[event.code] = true; }, onKeyUp: function (event: KeyboardEvent) { if (!this.data.enabled) return; this.keys[event.code] = false; }, tick: function (time: number, deltaTime: number) { if (!this.data.enabled || !this.el.sceneEl || !this.el.sceneEl.hasLoaded || !this.panVector || !window.THREE) return; const dt = deltaTime / 1000; const panSpeed = this.data.panSpeed; const zoomSpeed = this.data.zoomSpeed; const currentPosition = (this.el as any).object3D.position; this.panVector.set(0, 0, 0); if (this.keys['KeyW']) this.panVector.z -= 1; if (this.keys['KeyS']) this.panVector.z += 1; if (this.keys['KeyA']) this.panVector.x -= 1; if (this.keys['KeyD']) this.panVector.x += 1; if (this.panVector.lengthSq() > 0) { this.panVector.normalize().multiplyScalar(panSpeed * dt); (this.el as any).object3D.position.add(this.panVector); } let currentY = currentPosition.y; if (this.keys['KeyZ']) { currentY -= zoomSpeed * dt; } if (this.keys['KeyX']) { currentY += zoomSpeed * dt; } currentY = Math.max(this.data.minZoom, Math.min(this.data.maxZoom, currentY)); (this.el as any).object3D.position.y = currentY; } }); }
        if(window.AFRAME.components['arrow-controls'] && window.AFRAME.components['camera-controls']) { console.log('Custom A-Frame components registered/verified.'); }
      };

    if (typeof window !== 'undefined' && !window.AFRAME) {
      loadScript('https://aframe.io/releases/1.5.0/aframe.min.js', true, () => { console.log('A-Frame script loaded.'); registerAFrameComponents(); loadScript('https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.2.0/dist/aframe-extras.min.js', true, () => { console.log('A-Frame Extras loaded.'); loadScript('https://unpkg.com/aframe-event-set-component@5.0.0/dist/aframe-event-set-component.min.js', true, () => { console.log('A-Frame Event Set Component loaded.'); setAreScriptsReady(true); }); }); });
    } else if (window.AFRAME) { 
        if (!window.AFRAME.components['arrow-controls'] || !window.AFRAME.components['camera-controls']) { 
            registerAFrameComponents(); 
        } 
        if (window.AFRAME.extras && window.AFRAME.components['event-set'] && window.AFRAME.components['arrow-controls'] && window.AFRAME.components['camera-controls']) { 
            if (!areScriptsReady) setAreScriptsReady(true); 
        } else if (!areScriptsReady) { 
            setTimeout(() => { 
                 if (window.AFRAME.components['arrow-controls'] && window.AFRAME.components['camera-controls']) { 
                    if (!areScriptsReady) { setAreScriptsReady(true); console.log("Scripts marked ready (fallback)."); } 
                 } else { 
                    console.error("Fallback check: Custom components not registered."); 
                 } 
            }, 1000); 
        } 
    }
    return () => { window.removeEventListener('keydown', handleGlobalKeyDown); };
  }, [handleGlobalKeyDown, areScriptsReady]); // Removed currentScreen from deps as it's handled by handleGlobalKeyDown's own dependencies
  
  const renderScreen = () => { 
    switch (currentScreen) { 
      case ScreenType.NOW_PLAYING: 
        if (areScriptsReady) { 
          return <NowPlayingScreen 
                    onToggleScreen={toggleScreen} 
                    playerName={playerName} 
                    loadedGameState={loadedGameState} 
                    clearLoadedGameState={clearLoadedGameState}
                    savedGameStateFromApp={savedGameStateForApp} 
                    onSetSavedGameState={handleSetSavedGameState} 
                 />; 
        } 
        return ( <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1A1A1A', color: 'white', fontFamily: "'Segoe UI', sans-serif"}}> Loading Grid Runner Experience... Please Wait. </div> ); 
      case ScreenType.CLICK_TO_PLAY: 
      default: 
        return <ClickToPlayScreen onToggleScreen={toggleScreen} playerName={playerName} onPlayerNameChange={handlePlayerNameChange} onLoadGame={handleLoadGame} />; 
    } 
  };
  return ( <div className="AppContainer" style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', userSelect: 'none' }}> {renderScreen()} </div> );
};
export default App;

/**
 * --- JSDoc & Unit Testing Notes (Final Polish) ---
 *
 * FPS Player Footprint (`AFrameGridGame`):
 * - An `<a-cylinder>` child of `player-sphere` acts as a visual ground indicator in FPS mode.
 * - Its visibility is toggled with `isFpsView`.
 * - Its radius matches the player's collision bounding box factor.
 *
 * Difficulty Dropdown & Reset (`NowPlayingScreen`):
 * - Dropdown now has a "Difficulty:" label.
 * - `resetGame` now triggers a green screen flash for visual feedback.
 * - Dropdown is disabled when game is over/won, otherwise enabled.
 *
 * Debug Legend (`NowPlayingScreen`):
 * - Layout adjusted in the top bar for better visibility.
 * - `requestAnimationFrame` loop updates FPS camera debug info live when in FPS view and game is active.
 * - Displays player grid position and the effective "Up Arrow" direction vector.
 * - Includes a separate display for the stringified `gameState` object (full gridData included).
 * - Includes a display for `savedGameState` (full gridData included).
 *
 * Perimeter Borders (`AFrameGridGame`):
 * - Four `<a-box>` entities with `static-body` create a physical perimeter, preventing player from moving off-grid.
 *
 * FPS Movement (`arrow-controls`):
 * - Up/Down arrows in FPS mode are reversed: Up moves backward, Down moves forward relative to camera.
 * - Left/Right arrows in FPS mode are reversed: Left moves right, Right moves left relative to camera.
 *
 * Overlay Key Handling (`NowPlayingScreen`):
 * - 'Enter' or 'Spacebar' on game over/win overlays calls `resetGame(difficulty)`.
 *
 * Cell Highlighting (`AFrameGridGame` & `NowPlayingScreen`):
 * - Current cell gets a light yellow transparent highlight.
 * - Visited cells (excluding start/end) get a lime green trail.
 * - `VISITED_CELL_TRAIL_COLOR` is now `#32CD32` (brighter lime green).
 * - `CELL_TRAIL_OPACITY` is now `0.6`.
 *
 * Player Name (`App`, `ClickToPlayScreen`, `NowPlayingScreen`):
 * - Input field on start screen now has `color: '#000000'` for visible text.
 * - Name displayed in game UI.
 * - Included in `gameState`.
 *
 * `gameState` Object (`NowPlayingScreen`):
 * - Centralized state object holding key game variables.
 * - Updated in a `useEffect` hook.
 *
 * Start/End Markers (`AFrameGridGame`):
 * - Text labels now use `look-at="[camera]"` for better visibility.
 * - Text Y-offset slightly increased.
 *
 * Ground Direction Arrow (`AFrameGridGame` & `NowPlayingScreen`):
 * - Positioned directly under the player sphere's world coordinates.
 * - Rotation in Bird's-Eye view now reflects the last arrow key pressed in that mode, with left/right visual swapped.
 *
 * Save/Load Game:
 * - "Save Game" button in `NowPlayingScreen` (mock) POSTs `gameState` and updates `savedGameState` in App.
 * - "Load Game" button in `ClickToPlayScreen` (mock) POSTs `playerName`, expects `gameState`, and verifies `playerName` match.
 * - "Load" button in `NowPlayingScreen` loads from `savedGameStateFromApp`.
 * - `App` component manages `loadedGameState` and `savedGameStateForApp`.
 * - `resetGame` in `NowPlayingScreen` can initialize from `loadedGameState` or `savedGameStateFromApp`.
 * - API messages for success/failure are displayed.
 *
 * Toggle GameState Debugger (Q Key):
 * - `showGameStateDebugger` state in `NowPlayingScreen` toggled by 'Q' key.
 * - Controls visibility of the `gameState` and `savedGameState` JSON displays.
 *
 * TypeScript Error Fix:
 * - `setAttribute` calls with object values are cast to `any` to satisfy TypeScript when A-Frame's dynamic typing is used.
 * - Guarded `window.THREE` access in A-Frame component `init` methods.
 *
 * --- End Notes ---
 */
