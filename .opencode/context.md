# Project Context

## Environment
- Language: TypeScript
- Runtime: Node.js (Vite)
- Build: npm run build
- Test: tsc -b && vite build
- Package Manager: npm

## Project Type
- [x] Application (BarberLozz Manager - Premium AI Virtual Receptionist SaaS for Barber Shops & Salons)
- [ ] Library/Package
- [ ] Microservice
- [ ] Monorepo

## Infrastructure
- Container: None
- Orchestration: None
- CI/CD: None
- Cloud: Supabase (Backend/Database/Auth) & OpenAI Function Calling

## Structure
- Source: src/
- Entry: src/main.tsx

## Conventions
- Naming: camelCase for variables/functions, PascalCase for React components
- Imports: standard ES Modules, with `import type` for type-only imports
- Styling: Tailwind CSS v4 (Obsidian background, Gold `#D4AF37` accent details, spacious layout)

## Phase 1 Focus
- Re-design the entire application to revolve around **WhatsApp Chat Live Feed** and the **AI Receptionist**.
- Define the 10 core AI Function Calling capabilities in a type-safe structure.
- Introduce advanced customer profiling (visit counters, total spent, favorite services).
