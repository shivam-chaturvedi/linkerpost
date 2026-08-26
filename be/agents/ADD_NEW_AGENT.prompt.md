# How to add a new LinkerPost agent

Use this file when adding another LangGraph agent. The API does not hard-code agent IDs in the UI. It loads `agents.id` from the database, reads `agents.agent_name`, then dispatches to the Python runner registered for that name.

## 1. Implement the agent package

Create a folder under `be/agents/` using a Python package name (no spaces):

```
be/agents/my_new_agent/
  main.py          # export async def run_agent(*, user_id, user_input, run_id=None) -> dict
  graph.py         # LangGraph StateGraph
  state.py         # TypedDict state
  nodes/           # one file per graph node
  tools/           # only agent-specific helpers (prompts, scheduling, etc.)
  database/        # optional agent-specific tables
```

Shared code (do not copy into the new agent):

- LLM facade: `from agents.llm import complete_structured, complete_text, llm_usage_scope` (`agents/llm/llm.py`; providers: Gemini / Nemotron)
- Search, crawl, ranking, similarity, media: `from agents.tools.search import search_web` (and siblings)

Later LLM providers go in `agents/llm/openai.py`, `agents/llm/nemotron.py`, then register them in `agents.llm.get_llm()`.

Rules:

- `run_agent` is the only public entry. Do not add CLI argparse in `main.py`.
- Return a JSON-serializable `dict`. If the agent needs more user data first, return `status: "awaiting_input"` plus `follow_up_questions` and stop; the UI will send answers on the same `run_id`.
- Isolate runs with LangGraph `configurable.thread_id = run_id`.
- Read LLM settings from `.env` via `LLM_PROVIDER` (`gemini` or `nemotron`). For Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`. For Nemotron: `NVIDIA_API_KEY`, `NEMOTRON_MODEL`. Keep retries low and respect the provider rate-limit so a run cannot loop on 429s.

## 2. Register the runner

In `be/agents/registry.py`:

1. Add a constant, e.g. `MY_NEW_AGENT = "my_new_agent"`.
2. In `get_agent_runner()`, add a branch that lazy-imports that package's `run_agent`:

```python
if agent_name == MY_NEW_AGENT:
    from agents.my_new_agent.main import run_agent
    return run_agent
```

3. Add a catalog dict (id, agent_name, name, description, needs, persona, mode) if this agent should be seeded.

`agents.agent_name` in the database must match the string used in `get_agent_runner()` exactly.

## 3. Insert a row in the `agents` table

Add an Alembic migration that inserts one catalog row (do not seed fake demo agents):

- `id`: stable UUID (use `uuid5` like the content planner, or a documented UUID)
- `agent_name`: `my_new_agent`
- `key`: same slug as `agent_name`
- `name`: human title shown in the UI
- `description`, `needs`, `persona`, `mode`, `is_active`

`user_id` is null for catalog agents. Per-user history lives in `agent_runs`.

## 4. Do not change the FastAPI contract

The existing endpoints already dispatch dynamically:

- `POST /api/agents/{agent_id}/run` with `{ "input": "..." }`
- `GET /api/agents/{agent_id}/runs`
- `GET /api/agents/{agent_id}/runs/{run_id}`

After the catalog row exists, the web UI lists the agent and can run it. No frontend ID hard-coding.

## 5. Check the run

1. Put `GEMINI_API_KEY` and `GEMINI_MODEL` in `be/.env`.
2. Run `alembic upgrade head` from `be/`.
3. Confirm the new row in `agents`.
4. Call `POST /api/agents/{id}/run` as a signed-in user.
5. Confirm a row in `agent_runs` for that `user_id` with `input` text and `output` JSON.
6. In the Agents UI, use **View previous runs**, click the `run_id`, and confirm the JSON.
