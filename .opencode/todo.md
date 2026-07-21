# Mission: BarberLozz Manager - Laboratorio IA (Qwen3:8B Local Migration)

## FASE 2.5: Qwen3:8B Local Migration & Status Monitors | status: completed

### T1: Centralized Configuration & Defaults | status: completed
- [x] S1.1: Edit `server/ollamaService.ts` to swap the default model to `qwen3:8b` and default host to `http://127.0.0.1:11434` | priority:high
- [x] S1.2: Update `.env` in the root folder with `OLLAMA_MODEL=qwen3:8b` and `OLLAMA_BASE_URL=http://127.0.0.1:11434` | priority:high

### T2: Health checks & Connection tests | status: completed
- [x] S2.1: Implement automatic model checking in `OllamaService.isAvailable()` using the `/api/tags` endpoint | priority:high
- [x] S2.2: Add `/api/test-connection` endpoint in the backend to measure latency and return model validation | priority:high
- [x] S2.3: Build "Proveedor IA" section inside "Configuración IA" tab with dynamic "Probar conexión" button | priority:high

### T3: Dashboard & Lab Status Indicators | status: completed
- [x] S3.1: Add "Estado IA" card in the Dashboard metrics grid, displaying real-time connection status (🟢 Online / 🔴 Offline) and latencies | priority:high
- [x] S3.2: Re-style "Laboratorio IA" references in the frontend (`IaLab.tsx`, `api.ts`, `Assistant.tsx`) to show `qwen3:8b` as the active default model | priority:high

### T4: Compilation & Flawless Verification | status: completed
- [x] S4.1: Run simultaneous frontend + backend verification, test compilation, and ensure clean build | priority:high
