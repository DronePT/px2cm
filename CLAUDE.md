# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite project for a px2cm (pixels to centimeters) converter application. It uses React 19 with TypeScript in strict mode.

## Development Commands

**Package Manager:** This project uses `pnpm`. Always use `pnpm` instead of `npm` or `yarn`.

- **Development server:** `pnpm dev` - Starts Vite dev server with HMR
- **Build:** `pnpm build` - Runs TypeScript build check (`tsc -b`) then Vite build
- **Lint:** `pnpm lint` - Runs ESLint on all files
- **Preview:** `pnpm preview` - Preview production build locally

## Technology Stack

- **React 19.1.1** with React DOM
- **TypeScript 5.9.3** with strict mode enabled
- **Vite 7.1.7** as build tool and dev server
- **ESLint 9** with TypeScript ESLint, React Hooks, and React Refresh plugins

## Architecture Notes

### TypeScript Configuration

The project uses a split TypeScript configuration:
- `tsconfig.json` - Root configuration with references
- `tsconfig.app.json` - App source code configuration (src directory)
- `tsconfig.node.json` - Node/build tool configuration

**Key compiler options:**
- Target: ES2022
- Module resolution: bundler mode
- Strict mode enabled with additional strict flags (`noUnusedLocals`, `noUnusedParameters`)
- JSX: react-jsx (React 17+ JSX transform)

### Project Structure

- `src/main.tsx` - Application entry point, renders App component with React.StrictMode
- `src/App.tsx` - Root application component
- `src/index.css` - Global styles
- `src/App.css` - App component styles
- `index.html` - HTML entry point with root div and module script

### ESLint Configuration

Uses flat config format (eslint.config.js) with:
- JavaScript recommended rules
- TypeScript ESLint recommended rules
- React Hooks recommended-latest rules
- React Refresh for Vite
- Ignores dist directory
