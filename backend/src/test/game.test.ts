/**
 * @file game.test.ts
 * @description Unit and integration tests for the game API endpoints (/api/game).
 * Uses Mocha as the test runner, Chai for assertions, and Supertest for HTTP requests.
 */

import chai from 'chai';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { Express } from 'express'; 
import dotenv from 'dotenv';

// Load environment variables for test environment
// Ensure you have a .env.test file in your backend directory or configure TEST_MONGO_URI appropriately
dotenv.config({ path: '.env.test' }); 

// Import the model and necessary types, including GridCellType
import GameStateModel, { IGameState } from '../models/gameState.model'; 
// Correctly import GridCellType from its definition file
import { GridCellType } from '../models/gameState.model'; // Ensure this path is correct and GridCellType is exported


import gameRoutes from '../routes/game.routes'; 
import express from 'express';

const expect = chai.expect;

// Create a test Express app instance
const testApp: Express = express();
testApp.use(express.json({ limit: '10mb' })); // Middleware to parse JSON bodies
testApp.use('/api/game', gameRoutes); // Mount the game routes under /api/game prefix

const request = supertest(testApp); // Create a supertest agent for making HTTP requests

/**
 * @description Test suite for Game API Endpoints.
 */
describe('Game API Endpoints', function() { // Use a regular function to allow `this.timeout()`
  // MongoDB connection URI for testing.
  // It's crucial this points to a SEPARATE test database to avoid data conflicts.
  const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/aframeGameDB_test_suite_unique'; 
  
  // Increase timeout for the entire suite, especially for before/after hooks involving DB connection.
  this.timeout(15000); // 15 seconds timeout for the whole suite

  /**
   * @description Hook to run before all tests in this suite.
   * Establishes a connection to the test MongoDB database.
   */
  before(async function() { 
    // Check if mongoose connection is already open, opening, or closing.
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) { 
      try {
        await mongoose.connect(TEST_MONGO_URI);
        console.log('Successfully connected to Test MongoDB for game.test.ts');
      } catch (err) {
        console.error('Test MongoDB connection error during beforeAll:', err);
        throw err; // Fail fast if DB connection cannot be established.
      }
    }
  });

  /**
   * @description Hook to run after all tests in this suite.
   * Clears the GameState collection and disconnects from the test MongoDB.
   */
  after(async function() { 
    try {
      // Check if the model and its collection property exist before trying to operate on it.
      if (GameStateModel && GameStateModel.collection) { 
        await GameStateModel.collection.deleteMany({}); // Clear all documents from the collection.
        console.log('Test GameState collection cleared.');
      }
    } catch (error) {
      console.warn('Warning: Could not clear GameState collection after tests:', error);
    } finally {
      // Only attempt to disconnect if Mongoose is currently connected or connecting.
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) { 
        await mongoose.disconnect();
        console.log('Disconnected from Test MongoDB after game.test.ts');
      }
    }
  });

  /**
   * @description Hook to run before each individual test case.
   * Ensures the GameState collection is empty to provide a clean slate.
   */
  beforeEach(async function() { 
    try {
      // Check if the model and its collection property exist.
      if (GameStateModel && GameStateModel.collection) {
        await GameStateModel.collection.deleteMany({}); // Clear documents.
      }
    } catch (error) {
      // It's possible the collection doesn't exist yet on the very first run, 
      // or if MongoDB had an issue. Suppress "ns not found" which is common in such cases.
      if (!(error as any).message.includes('ns not found')) {
        console.warn('Warning: Could not clear GameState collection before a test:', error);
      }
    }
  });

  // --- Test Suite for POST /api/game/save ---
  describe('POST /api/game/save', () => {
    /**
     * @test {Should save a new game state successfully}
     * Verifies that a valid new game state can be posted and saved.
     */
    it('should save a new game state successfully', async () => {
      // Define a sample new game state object.
      // Ensure all required fields from IGameState are present.
      const newGameState: Partial<IGameState> = { 
        playerName: 'testPlayerSave',
        difficulty: 'medium',
        player: { gridX: 1, gridZ: 1, worldX: 0.5, worldZ: 0.5, health: 100, moves: 200 },
        game: { 
          timeLeft: 60, isFpsView: false, currentCellType: GridCellType.BLANK, 
          startCell: { x: 1, z: 1 }, endCell: { x: 10, z: 10 },
          isOver: false, hasWon: false, timerGameOver: false 
        },
        gridData: [[{id: 'cell-0-0', type: GridCellType.BLANK, x:0, z:0, gridX:0, gridZ:0 } as any]], 
        visitedCellTrail: [],
      };

      // Make a POST request to the save endpoint.
      const res = await request
        .post('/api/game/save')
        .send(newGameState);

      // Assertions for a successful response.
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body.message).to.equal('Game saved successfully!');
      expect(res.body.gameState).to.include.keys('playerName', 'difficulty', 'player', 'game', 'gridData', 'lastSaved');
      expect(res.body.gameState.playerName).to.equal(newGameState.playerName);
    });

    /**
     * @test {Should update an existing game state successfully}
     * Verifies that an existing game state is updated when data for the same player is posted.
     */
    it('should update an existing game state successfully', async () => {
      // Create and save an initial game state.
      const initialGameStateData: Partial<IGameState> = {
        playerName: 'testPlayerUpdate',
        difficulty: 'easy',
        player: { gridX: 2, gridZ: 2, worldX: 1.5, worldZ: 1.5, health: 90, moves: 190 },
        game: { 
            timeLeft: 50, isFpsView: false, currentCellType: GridCellType.BLANK, 
            startCell: { x: 1, z: 1 }, endCell: { x: 10, z: 10 },
            isOver: false, hasWon: false, timerGameOver: false 
        },
        gridData: [[{id: 'cell-0-0', type: GridCellType.BLANK, x:0, z:0, gridX:0, gridZ:0 } as any]],
        visitedCellTrail: [],
      };
      await new GameStateModel(initialGameStateData).save();

      // Prepare data to update the existing game state.
      const updatedGameStateData: Partial<IGameState> = {
        ...initialGameStateData, // Spread initial data to keep non-updated fields.
        player: { ...initialGameStateData.player, health: 75, moves: 150 } as IGameState['player'], // Update player health and moves.
        game: { ...initialGameStateData.game, timeLeft: 40 } as IGameState['game'] // Update game timeLeft.
      };

      // Make a POST request to update the game state.
      const res = await request
        .post('/api/game/save')
        .send(updatedGameStateData);

      // Assertions for a successful update.
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('Game saved successfully!');
      expect(res.body.gameState.player.health).to.equal(75);
      expect(res.body.gameState.player.moves).to.equal(150);
      expect(res.body.gameState.game.timeLeft).to.equal(40);
      expect(res.body.gameState.playerName).to.equal('testPlayerUpdate'); // Ensure it's the same player.
    });

    /**
     * @test {Should return 400 if playerName is missing}
     * Verifies that the API returns a 400 Bad Request if playerName is not provided.
     */
    it('should return 400 if playerName is missing', async () => {
      // Create an invalid game state object missing the playerName.
      const invalidGameState = { 
        difficulty: 'medium',
        player: { gridX: 1, gridZ: 1, worldX: 0.5, worldZ: 0.5, health: 100, moves: 200 },
        game: { 
            timeLeft: 60, isFpsView: false, currentCellType: GridCellType.BLANK, 
            startCell: { x: 1, z: 1 }, endCell: { x: 10, z: 10 },
            isOver: false, hasWon: false, timerGameOver: false 
        },
        gridData: [[]] as any[][], // Provide minimal valid structure for other fields.
        visitedCellTrail:[]
    }; 
      // Make a POST request with the invalid data.
      const res = await request
        .post('/api/game/save')
        .send(invalidGameState);
      
      // Assertions for the expected error response.
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Player name is required to save game.');
    });
  });

  // --- Test Suite for POST /api/game/load ---
  describe('POST /api/game/load', () => {
    /**
     * @test {Should load an existing game state successfully}
     * Verifies that a previously saved game state can be loaded.
     */
    it('should load an existing game state successfully', async () => {
      // First, save a game state to be loaded in this test.
      const savedGameStateData: Partial<IGameState> = {
        playerName: 'testPlayerLoad',
        difficulty: 'hell',
        player: { gridX: 5, gridZ: 5, worldX: 4.5, worldZ: 4.5, health: 50, moves: 100 },
        game: { 
            timeLeft: 30, isFpsView: true, currentCellType: GridCellType.LAVA, 
            startCell: { x: 1, z: 1 }, endCell: { x: 10, z: 10 },
            isOver: false, hasWon: false, timerGameOver: false 
        },
        gridData: [[{id: 'cell-0-0', type: GridCellType.BLANK, x:0, z:0, gridX:0, gridZ:0 } as any]],
        visitedCellTrail: ["1,2", "1,3"],
      };
      await new GameStateModel(savedGameStateData).save();

      // Make a POST request to load the game state.
      const res = await request
        .post('/api/game/load')
        .send({ playerName: 'testPlayerLoad' });

      // Assertions for a successful load.
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('Game loaded successfully!');
      expect(res.body.gameState).to.be.an('object');
      expect(res.body.gameState.playerName).to.equal('testPlayerLoad');
      expect(res.body.gameState.difficulty).to.equal('hell');
      expect(res.body.gameState.player.health).to.equal(50);
    });

    /**
     * @test {Should return 404 if game state for playerName is not found}
     * Verifies that the API returns a 404 Not Found if no game state exists for the player.
     */
    it('should return 404 if game state for playerName is not found', async () => {
      const res = await request
        .post('/api/game/load')
        .send({ playerName: 'nonExistentPlayer' });

      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('No saved game found for player: nonExistentPlayer.');
    });

    /**
     * @test {Should return 400 if playerName is missing in load request}
     * Verifies that the API returns a 400 Bad Request if playerName is not provided in the load request.
     */
    it('should return 400 if playerName is missing in load request', async () => {
      const res = await request
        .post('/api/game/load')
        .send({}); // Send an empty body (missing playerName).

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Player name is required to load game.');
    });
  });
});
