# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bezier City is a video game with a programmatically generated city structure. It combines:
- A Python/FastAPI backend serving city data, buildings, and NPCs
- A React/TypeScript/Phaser 3 frontend with dual views (map and street-level)

## Essential Commands

### Frontend Development
```bash
cd frontend
npm install                # Install dependencies
npm run dev               # Start dev server on port 8080
npm run dev-nolog         # Start dev server without telemetry
npm run build             # Production build
npm test                  # Run Jest tests
```

### Backend Development
```bash
cd backend
poetry install            # Install dependencies
uvicorn server:app --reload --host 0.0.0.0 --port 8000  # Run dev server
```

## Architecture Overview

### Backend Structure
- **server.py**: FastAPI application with endpoints for city data, buildings, and NPCs
- **models/**: Pydantic models for city components (City, NPC)
- **buildings.py**: Building asset management
- NPC positions update every 100ms via asyncio background task

### Frontend Structure
- **App.tsx**: Root component integrating map view and Phaser game
- **game/PhaserGame.tsx**: React-Phaser bridge component
- **game/EventBus.ts**: Communication between React and Phaser
- **game/scenes/**: Phaser scene files (Boot, Preloader, MainMenu, Game, GameOver)
- **game/api.ts**: Backend API client
- **game/map.tsx**: Map view component

### Key API Endpoints
- GET `/blocks`, `/streets`, `/edges`, `/cells` - City structure
- GET `/building/{id}`, `/buildings` - Building assets
- GET `/npcs`, `/npc/{name}` - NPC data

### Development Notes
- Frontend and backend run on different ports (8080 and 8000)
- CORS is configured for http://localhost:8080
- City data is loaded from JSON files (bezier_city.json, bezier_city_model.json)
- NPCs move based on timestamps and paths defined in backend