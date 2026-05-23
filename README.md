# Vibemod

A tool for building and iterating on web apps through chat. Describe what you want, see a live preview, and publish when ready.

## Setup

```
npm run install:all
npm run dev
```

## Architecture

The user chats with an AI to describe a web app. The server manages a **draft** — a self-contained app directory with its own dependencies and dev server. Each chat message triggers the AI to edit the draft's source files, and the running dev server hot-reloads so the user sees changes in a live preview iframe. When satisfied, the user can publish the draft.

Key server services:
- **ChatService** — streams AI responses over WebSocket, translates them into file edits
- **DraftService / DraftRepo** — manages draft lifecycle (create, reset, persist)
- **ServerManager** — spawns and supervises the draft's dev server process
- **BuildService** — bundles a draft for publishing

## Stack

- **Client:** React, Vite, Tailwind, shadcn
- **Server:** Express, WebSockets, TypeScript
