# AI World — Field Observatory

A local-first 3D world for observing whether language, customs, relationships, rituals, and conflict emerge among four LLM-driven inhabitants without assigned goals or a narrative director.

**Preserved design source:** [docs/DESIGN_BIBLE.md](docs/DESIGN_BIBLE.md) contains the original 58-page project bible. Implementation defaults are documented below and can be tuned without changing the inhabitants' instructions.

## Windows quick start

**Requirements:** Node.js 22 LTS and npm.

1. Clone or download this repository and open PowerShell in the project folder.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create your local configuration:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

4. Set `NVIDIA_API_KEY` in `.env`. Do not paste it into source code or commit `.env`.
5. Start the development server:

   ```powershell
   npm run dev
   ```

6. Open **http://127.0.0.1:5173**. The API runs at `http://127.0.0.1:4174`.

The simulation starts paused. Confirm your local API key is configured, then use **Resume**. If inference fails, the simulation pauses and records the error; it never fabricates a substitute inhabitant action.

### Production build

```powershell
npm run build
npm start
```

Open **http://127.0.0.1:4174**. The local Node server serves both the built browser app and the API.

## NVIDIA / Kimi configuration

The default is `moonshotai/kimi-k2-instruct` via NVIDIA's OpenAI-compatible endpoint:

- Base URL: `https://integrate.api.nvidia.com/v1`
- Chat endpoint: `/chat/completions`
- Model ID: `NVIDIA_MODEL` in `.env`

If this model is unavailable for your account, set `NVIDIA_MODEL` to another model ID available to your NVIDIA API account. Restart the server after editing `.env`.

**Credential safety:** the key is read only by the local Node server and is never bundled into browser JavaScript. If a key has been pasted into chat, a ticket, or a public location, revoke it and create a replacement before use.

## Interface

- Interactive 3D valley with orbit and zoom controls.
- Four inhabitant cards with body condition and last action.
- Simulation clock, pause/resume, single-beat stepping, and adjustable pace.
- Live field notes with search, cave marks, book entries, and researcher-only inference audit.
- Brief model-generated self-reports. These are not chain-of-thought or verified access to inner cognition.
- Automatic SQLite persistence, run IDs, and JSON export of state, events, prompts, and model outputs.

## Research integrity contract

- Four active inhabitant slots; each awake inhabitant receives one decision per beat.
- No assigned goals, jobs, quests, mandatory rituals, or narrative director.
- The world engine owns physical state. LLM outputs are structured proposals validated by the engine.
- Hidden temperament is never named in an inhabitant-facing prompt. Differences are conveyed only through sensory experience and available affordances.
- Prompts contain the acting inhabitant's own body state, observations, and bounded personal memories. Private memories and researcher-only self-reports are not shared with other inhabitants.
- Each life can leave at most two durable cave marks. Text marks are limited to 280 characters; drawings are limited to 24 strokes with bounded points.
- The blank book and resonant stone are affordances, not instructions to form a religion or perform a ritual.
- Survival pressure is deliberately gentle: food and water are easy to obtain, passive upkeep is low, and reflective/social activities do not incur special energy penalties. Violence remains possible, never an objective.
- If any model inference fails during a beat, **no agent actions from that beat are applied**. The run pauses and records the failure.
- Prompt text, raw model response content, parsed proposals, validation outcome, timing, events, and world snapshots are persisted. Each reset starts a new run ID for analysis.

## Cost and cadence

The default beat interval is 6 seconds, with one model request per active inhabitant per beat (normally four requests in a full beat). A 100-day life at 40 beats/day is approximately 6.7 hours of simulation time and can require many thousands of model requests. This may incur meaningful API usage. Set `BEAT_INTERVAL_MS=12000` or a higher value in `.env` to slow the simulation and reduce request frequency. Simulation speed controls multiply this interval.

## Commands

```powershell
npm run dev      # local browser app + API with hot reload
npm test         # simulation invariant and prompt-boundary tests
npm run build    # type-check and compile frontend and server
npm start        # serve production app and API on 127.0.0.1:4174
```

## Data and privacy

- SQLite database: `data/ai-world.sqlite` by default.
- Local config: `.env` (ignored by Git).
- Export: use the download icon in the observatory to save a JSON audit bundle.
- The app binds to loopback (127.0.0.1), not a public network interface.
- The model provider receives the inhabitant prompt and its context. Do not include personal or sensitive information in the simulated world.

## Limitations

AI World is an experimental instrument, not evidence that LLMs possess human-like consciousness. Emergent behavior depends on the chosen model, prompt, simulation rules, and stochastic inference. Record those settings when comparing runs. The current UI self-report is a brief generated impression, not a privileged window into hidden reasoning.
