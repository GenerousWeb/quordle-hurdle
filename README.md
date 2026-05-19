# Quordle Hurdle

A multiplayer word-puzzle game where players race to solve four simultaneous Wordle-style boards in a single round. Built with React Router, Socket.io, and Tailwind CSS.

## Stack

- **Frontend** — React Router 7, Zustand, Tailwind CSS
- **Backend** — Socket.io game server (Node.js)
- **Language** — TypeScript throughout

## Prerequisites

- Node.js 20+
- npm 10+

## Install

Install dependencies for all packages (root app, server, and client):

```bash
npm install
npm install --prefix server
npm install --prefix client
```

## Running the App

The game has two processes that must run together: the **React Router web app** and the **Socket.io game server**.

### 1. Start the game server

In one terminal:

```bash
npm run dev --prefix server
```

The game server listens on `http://localhost:3001`. It handles WebSocket connections, guess submission, validation, and scoring.

### 2. Start the web app

In a second terminal:

```bash
npm run dev
```

The web app is available at `http://localhost:5173`.

Open `http://localhost:5173/play/local` to see the game board.

---

## Tests

Run the full test suite (server unit tests + client component tests):

```bash
npm test
```

Run tests for a specific package:

```bash
npm test --prefix server   # matching engine + submitGuess handler tests
npm test --prefix client   # store unit tests and component tests
```

## Type checking

```bash
npm run typecheck:all
```

Runs TypeScript across all three packages: root app, server, and client.

## Lint

```bash
npm run lint
```

## Building for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
quordle-hurdle/
├── app/               # React Router pages and layout components
│   └── pages/
│       └── GamePage.tsx     # Mounts BoardGrid + wires socket
├── client/            # Standalone game UI package
│   └── src/
│       ├── components/      # BoardGrid, Tile
│       ├── socket/          # useGameSocket hook
│       └── store/           # boardStore (Zustand game state)
├── server/            # Socket.io game server
│   └── src/
│       ├── index.ts         # Server entry point (port 3001)
│       └── game/
│           ├── matchGuess.ts    # Pure word-matching function
│           ├── submitGuess.ts   # submit_guess handler + validation chain
│           └── wordList.ts      # Valid 5-letter word set
├── shared/            # Types shared between client and server
│   └── types/
│       └── game.ts          # TileResult, BoardStatus, BoardState
└── package.json       # Root scripts
```
