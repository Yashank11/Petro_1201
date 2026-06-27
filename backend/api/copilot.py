"""
PetroCopilot — Gemini AI Agent Router
Exposes POST /api/chat — receives user messages, uses Gemini function-calling
to autonomously query the backend tools, and returns a natural-language reply
along with optional map-control actions for the frontend.
"""

import os
import json
import math
import logging
from typing import Any

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Provider Keys ───────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


def _get_model():
    """Lazy-initialise the Gemini model (so the app still boots without a key)."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise Exception("GEMINI_API_KEY is not configured.")
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-3.1-flash-lite",
        system_instruction=SYSTEM_PROMPT,
        tools=PETRO_TOOLS,
    )


# ── System prompt ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are PetroCopilot, an elite AI analyst embedded inside the Petro Carbon Emissions
Intelligence Platform. Your job is to help analysts, ESG executives, and regulatory
bodies understand real-time global oil & gas flaring and emissions data.

Capabilities:
- Query live satellite-detected flare data, top emitters, anomaly alerts, oil prices,
  emission summaries, historical trends, and compare against 2024 WB baselines.
- Calculate EU CBAM carbon taxes, CORSIA offsets, or US EPA methane fee estimates.
- Issue map navigation commands so the UI automatically pans to a basin or country.
- Synthesise multi-source data into concise executive-level insights.

Rules:
1. Always call the relevant tools before answering data questions — never invent numbers.
2. Keep answers concise and scannable. Use markdown bullet points, bold numbers.
3. When a user asks about a location, ALWAYS include a fly_to_location tool call.
4. Be confident but accurate. Qualify uncertainty where appropriate.
5. Regulatory figures: EU CBAM price ~€50/t CO₂, US EPA methane fee ~$900/t CH₄ (2024).
"""

# ── Tool schemas (Gemini function declarations) ──────────────────────────────

PETRO_TOOLS = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="get_summary",
                description="Get a global KPI summary: total detections, CO₂ kt, anomaly count, detection rate, gas value, countries affected.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "days": genai.protos.Schema(
                            type=genai.protos.Type.INTEGER,
                            description="Observation window in days (1-5). Default 5.",
                        )
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_top_emitters",
                description="Get the top N companies ranked by CO₂-equivalent emissions, with risk levels, flare counts, gas values, and change percentages.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Day window (1-5)."),
                        "limit": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Number of results (1-50). Default 10."),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_alerts",
                description="Get active ESG anomaly alerts — flare sites where intensity is >2σ above baseline. Returns severity, spike %, company, basin, location.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Day window (1-5)."),
                        "limit": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Max alerts to return. Default 20."),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_oil_prices",
                description="Get live Brent crude, WTI crude, and Natural Gas prices with 10-day history and daily change %.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={},
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_compare_2024",
                description="Compare current satellite-detected flaring rates (annualised BCM) against 2024 World Bank baseline for each country. Returns deviation %, trend label, and risk.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Day window (1-5)."),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_pulse",
                description="Get the global emissions pulse — today's CO₂ kt versus rolling average, with trend label (NORMAL/ELEVATED/CRITICAL/DECLINING).",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "days": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Day window (1-5)."),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="calculate_carbon_tax",
                description="Calculate the estimated carbon tax liability for a given CO₂ quantity under a specified regulatory framework.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "co2_tonnes": genai.protos.Schema(
                            type=genai.protos.Type.NUMBER,
                            description="Quantity of CO₂-equivalent in metric tonnes.",
                        ),
                        "regime": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Regulatory regime: 'EU_CBAM', 'US_EPA_METHANE', 'CORSIA', or 'UK_ETS'.",
                        ),
                    },
                    required=["co2_tonnes", "regime"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="fly_to_location",
                description="Send a map navigation command to pan the Petro map to a specific location. Call this whenever the user mentions a country, basin, or field by name.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "location_name": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="The name of the location — basin, country, field, or city.",
                        ),
                        "lat": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Latitude of the target location."),
                        "lon": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Longitude of the target location."),
                        "zoom": genai.protos.Schema(type=genai.protos.Type.NUMBER, description="Mapbox zoom level (4-14). Use ~5 for countries, ~8 for basins, ~12 for fields."),
                    },
                    required=["location_name", "lat", "lon", "zoom"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="filter_map",
                description="Apply a country filter to the map so only flares from that country are shown.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "country": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Country name to filter to, or 'all' to show all countries.",
                        ),
                    },
                    required=["country"],
                ),
            ),
        ]
    )
]

# ── Tool execution (backend logic) ──────────────────────────────────────────

# Shared reference to the main app's _build_df and cache — imported lazily
# to avoid circular imports at module load time.

async def _execute_tool(name: str, args: dict) -> Any:
    """Dispatch a Gemini tool call to the actual backend logic."""

    # Lazy imports to avoid circular dependencies
    from main import _build_df, _get, _set
    from processing.anomaly import detect_anomalies

    if name == "get_summary":
        days = int(args.get("days", 5))
        cached = _get(f"summary_{days}")
        if cached:
            return cached
        df = await _build_df(days)
        df = detect_anomalies(df)
        return {
            "total_detections": int(len(df)),
            "active_sites": int(df["cluster_id"].nunique()) if "cluster_id" in df.columns else 0,
            "total_co2_kt": round(float(df["co2_eq_t"].sum() / 1000), 2) if "co2_eq_t" in df.columns else 0,
            "anomaly_count": int(df["is_anomaly"].sum()) if "is_anomaly" in df.columns else 0,
            "countries_affected": int(df["country"].nunique()) if "country" in df.columns else 0,
            "total_gas_value_usd": round(float(df["gas_value_usd"].sum()), 0) if "gas_value_usd" in df.columns else 0,
            "days": days,
        }

    elif name == "get_top_emitters":
        days  = int(args.get("days", 5))
        limit = int(args.get("limit", 10))
        cached = _get(f"emitters_{days}_{limit}")
        if cached:
            return cached[:limit]
        # Re-use the endpoint logic inline
        df = await _build_df(days)
        if df.empty:
            return []
        df = detect_anomalies(df)
        grouped = (
            df.groupby(["company", "country", "basin"])
            .agg(
                co2_eq_kt=("co2_eq_t", lambda x: round(x.sum() / 1000, 3)),
                flare_count=("frp", "count"),
                avg_frp=("frp", lambda x: round(x.mean(), 2)),
                gas_value_usd=("gas_value_usd", lambda x: round(x.sum(), 0)),
                anomaly_flag=("is_anomaly", lambda x: bool(x.any())),
            )
            .reset_index()
            .sort_values("co2_eq_kt", ascending=False)
            .head(limit)
            .reset_index(drop=True)
        )
        grouped["rank"] = grouped.index + 1
        return grouped.to_dict("records")

    elif name == "get_alerts":
        days  = int(args.get("days", 5))
        limit = int(args.get("limit", 20))
        cached = _get(f"alerts_{days}")
        if cached:
            return cached[:limit]
        df = await _build_df(days)
        df = detect_anomalies(df)
        alerts_df = df[df["is_anomaly"] == True].copy()
        if alerts_df.empty:
            return []
        alerts_df["severity"] = alerts_df["anomaly_score"].apply(
            lambda s: "critical" if s > 3 else ("high" if s > 2.5 else "medium")
        )
        keep = ["basin", "company", "well_name", "country", "frp", "co2_eq_t",
                "anomaly_score", "severity", "acq_date"]
        keep = [c for c in keep if c in alerts_df.columns]
        return alerts_df[keep].head(limit).to_dict("records")

    elif name == "get_oil_prices":
        cached = _get("oil_prices")
        if cached:
            return cached
        import httpx
        symbols = {"WTI": "CL=F", "Brent": "BZ=F", "NatGas": "NG=F"}
        result = {}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                for commodity, sym in symbols.items():
                    try:
                        resp = await client.get(
                            f"https://query2.finance.yahoo.com/v8/finance/chart/{sym}",
                            params={"interval": "1d", "range": "5d"},
                            headers={"User-Agent": "Mozilla/5.0"},
                        )
                        data = resp.json()
                        meta = data["chart"]["result"][0]["meta"]
                        price = meta.get("regularMarketPrice", 0)
                        prev  = meta.get("chartPreviousClose", price)
                        result[commodity] = {
                            "price": round(price, 2),
                            "change": round(price - prev, 2),
                            "change_pct": round(((price - prev) / prev * 100) if prev else 0, 2),
                        }
                    except Exception:
                        result[commodity] = {"price": 0, "change": 0, "change_pct": 0}
        except Exception:
            pass
        return result

    elif name == "get_compare_2024":
        days = int(args.get("days", 5))
        cached = _get(f"compare_2024_{days}")
        if cached:
            return cached
        # delegate to the full endpoint logic; re-use cached result if warm
        from api.climatetrace import fetch_country_emissions  # noqa — local
        # Use the same logic as the main endpoint — simplified return
        df = await _build_df(days)
        if df.empty:
            return []
        df = detect_anomalies(df)
        live_agg = (
            df.groupby("country")
            .agg(
                co2_kt=("co2_eq_t", lambda x: round(x.sum() / 1000, 3)),
                flare_count=("frp", "count"),
            )
            .reset_index()
        )
        scale = 365.0 / days
        live_agg["live_bcm_annual"] = live_agg["co2_kt"] * 1000 / (0.8 * 2.86) * scale / 1e9
        from data.worldbank_flaring import _ECONOMY
        wb_2024 = {c: y.get(2024, 0.0) for c, y in _ECONOMY.items()}
        result = []
        for _, row in live_agg.iterrows():
            country = row["country"]
            wb_bcm = wb_2024.get(country)
            if wb_bcm is None:
                cl = country.lower()
                for k, v in wb_2024.items():
                    if cl == k.lower() or cl in k.lower():
                        wb_bcm = v
                        break
            if not wb_bcm:
                continue
            dev_pct = round(((row["live_bcm_annual"] - wb_bcm) / wb_bcm) * 100, 1)
            result.append({
                "country": country,
                "live_bcm_annual": round(float(row["live_bcm_annual"]), 4),
                "wb_2024_bcm": round(float(wb_bcm), 4),
                "deviation_pct": dev_pct,
            })
        result.sort(key=lambda x: abs(x["deviation_pct"]), reverse=True)
        return result

    elif name == "get_pulse":
        days = int(args.get("days", 5))
        cached = _get(f"pulse_{days}")
        if cached:
            return cached
        df = await _build_df(days)
        if df.empty:
            return {"trend": "normal", "label": "NORMAL"}
        df["date_str"] = df["acq_date"].astype(str).str[:10]
        daily = df.groupby("date_str")["co2_eq_t"].sum() / 1000
        total_kt  = round(float(daily.sum()), 2)
        today_kt  = round(float(daily.iloc[-1]), 3) if len(daily) else 0
        prior_avg = round(float(daily.iloc[:-1].mean()), 3) if len(daily) > 1 else today_kt
        change_pct = round(((today_kt - prior_avg) / prior_avg * 100) if prior_avg > 0 else 0, 1)
        trend = "critical" if change_pct > 20 else ("elevated" if change_pct > 8 else ("declining" if change_pct < -10 else "normal"))
        label = trend.upper()
        return {"total_kt": total_kt, "today_kt": today_kt, "prior_avg_kt": prior_avg, "change_pct": change_pct, "trend": trend, "label": label, "days": days}

    elif name == "calculate_carbon_tax":
        co2_tonnes = float(args.get("co2_tonnes", 0))
        regime     = str(args.get("regime", "EU_CBAM")).upper()

        RATES = {
            "EU_CBAM":        {"rate_eur": 50.0,  "currency": "EUR", "desc": "EU Carbon Border Adjustment Mechanism (~€50/t CO₂)"},
            "US_EPA_METHANE": {"rate_usd": 900.0, "currency": "USD", "desc": "US EPA Methane Fee — Inflation Reduction Act (~$900/t CH₄, ~$900/t CO₂-eq)"},
            "CORSIA":         {"rate_usd": 15.0,  "currency": "USD", "desc": "CORSIA aviation offset price (~$15/t CO₂)"},
            "UK_ETS":         {"rate_gbp": 45.0,  "currency": "GBP", "desc": "UK Emissions Trading Scheme (~£45/t CO₂)"},
        }
        cfg = RATES.get(regime, RATES["EU_CBAM"])
        rate_key = [k for k in cfg if k.startswith("rate_")][0]
        rate     = cfg[rate_key]
        currency = cfg["currency"]
        liability = round(co2_tonnes * rate, 2)
        return {
            "co2_tonnes": co2_tonnes,
            "regime": regime,
            "rate_per_tonne": rate,
            "currency": currency,
            "estimated_liability": liability,
            "description": cfg["desc"],
        }

    elif name == "fly_to_location":
        # This is a UI-only command — return the action dict for the frontend.
        return {
            "__map_action": True,
            "type": "FLY_TO",
            "lat": float(args.get("lat", 0)),
            "lon": float(args.get("lon", 0)),
            "zoom": float(args.get("zoom", 5)),
            "label": str(args.get("location_name", "")),
        }

    elif name == "filter_map":
        return {
            "__map_action": True,
            "type": "FILTER_COUNTRY",
            "country": str(args.get("country", "all")),
        }

    return {"error": f"Unknown tool: {name}"}


# ── Request / Response models ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict = {}  # Optional extra context from the UI (e.g., current days filter)


class ChatResponse(BaseModel):
    reply: str
    mapAction: dict | None = None
    toolsUsed: list[str] = []


# ── Main chat endpoint ───────────────────────────────────────────────────────

@router.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    PetroCopilot — Gemini multi-turn agent with function calling.
    Accepts a conversation history, runs the agentic loop (model → tool → model),
    and returns the final reply plus optional map actions for the frontend.
    Fallback to Groq, Mistral, or OpenRouter if Gemini fails.
    """
    # 1. Try Gemini
    try:
        model = _get_model()

        # Build Gemini conversation history (excluding last user message)
        history = []
        for msg in req.messages[:-1]:
            history.append({"role": msg.role, "parts": [msg.content]})

        # Inject current dashboard context into the very first system turn
        if req.context:
            ctx_str = "\n".join([f"- {k}: {v}" for k, v in req.context.items()])
            context_note = f"\n\n[Dashboard context: {ctx_str}]"
        else:
            context_note = ""

        # Last message is the current user query
        user_query = req.messages[-1].content + context_note

        chat_session = model.start_chat(history=history)

        map_action = None
        tools_used = []
        MAX_ITERATIONS = 6  # prevent runaway loops

        current_message = user_query

        for _iteration in range(MAX_ITERATIONS):
            response = chat_session.send_message(current_message)
            candidate = response.candidates[0]

            # Check if model wants to call a function
            function_calls = [
                part.function_call
                for part in candidate.content.parts
                if hasattr(part, "function_call") and part.function_call.name
            ]

            if not function_calls:
                # Model produced a text response — we're done
                text_parts = [
                    part.text
                    for part in candidate.content.parts
                    if hasattr(part, "text") and part.text
                ]
                final_reply = " ".join(text_parts).strip()
                return ChatResponse(reply=final_reply, mapAction=map_action, toolsUsed=tools_used)

            # Execute all requested tool calls
            tool_results = []
            for fc in function_calls:
                tool_name = fc.name
                tool_args = dict(fc.args) if fc.args else {}
                tools_used.append(tool_name)

                logger.info("PetroCopilot executing tool: %s(%s)", tool_name, tool_args)

                try:
                    result = await _execute_tool(tool_name, tool_args)
                except Exception as exc:
                    logger.error("Tool %s failed: %s", tool_name, exc)
                    result = {"error": str(exc)}

                # Extract map actions before feeding back to Gemini
                if isinstance(result, dict) and result.get("__map_action"):
                    map_action = {k: v for k, v in result.items() if k != "__map_action"}
                    # Feed a simplified confirmation back to the model
                    result = {"status": "ok", "map_navigated_to": result.get("label", result.get("country", ""))}

                tool_results.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=tool_name,
                            response={"result": _json_safe(result)},
                        )
                    )
                )

            # Send tool results back so the model can continue
            current_message = tool_results  # type: ignore[assignment]

        # Fallback if we hit the iteration cap
        return ChatResponse(
            reply="I reached my analysis limit for this query. Please try a more specific question.",
            mapAction=map_action,
            toolsUsed=tools_used,
        )

    except Exception as gemini_exc:
        logger.warning("Gemini failed, trying fallbacks. Error: %s", gemini_exc)

        # Build message history in OpenAI format
        if req.context:
            ctx_str = "\n".join([f"- {k}: {v}" for k, v in req.context.items()])
            context_note = f"\n\n[Dashboard context: {ctx_str}]"
        else:
            context_note = ""
        user_query = req.messages[-1].content + context_note
        openai_messages = _to_openai_messages(req.messages, user_query)

        # 2. Try Groq
        if GROQ_API_KEY and GROQ_API_KEY != "your_groq_api_key_here":
            logger.info("Trying Groq fallback...")
            res = await _execute_openai_fallback(
                provider_name="Groq",
                api_key=GROQ_API_KEY,
                endpoint="https://api.groq.com/openai/v1/chat/completions",
                model="llama-3.3-70b-versatile",
                messages=openai_messages
            )
            if res:
                return res

        # 3. Try Mistral
        if MISTRAL_API_KEY and MISTRAL_API_KEY != "your_mistral_api_key_here":
            logger.info("Trying Mistral fallback...")
            res = await _execute_openai_fallback(
                provider_name="Mistral",
                api_key=MISTRAL_API_KEY,
                endpoint="https://api.mistral.ai/v1/chat/completions",
                model="mistral-small-latest",
                messages=openai_messages
            )
            if res:
                return res

        # 4. Try OpenRouter
        if OPENROUTER_API_KEY and OPENROUTER_API_KEY != "your_openrouter_api_key_here":
            logger.info("Trying OpenRouter fallback...")
            res = await _execute_openai_fallback(
                provider_name="OpenRouter",
                api_key=OPENROUTER_API_KEY,
                endpoint="https://openrouter.ai/api/v1/chat/completions",
                model="google/gemini-2.5-flash",
                messages=openai_messages,
                extra_headers={
                    "HTTP-Referer": "https://github.com/Yashank11/Petro_1201",
                    "X-Title": "Petro Dashboard"
                }
            )
            if res:
                return res

        # If all fail, raise the original exception
        raise HTTPException(
            status_code=500,
            detail=f"All LLM providers failed. Original Gemini error: {str(gemini_exc)}"
        )


# ── Helpers ─────────────────────────────────────────────────────────────────

def _json_safe(obj: Any) -> Any:
    """Recursively convert non-JSON-serialisable types to safe primitives."""
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if hasattr(obj, "item"):  # numpy scalar
        return obj.item()
    return obj


# ── OpenAI-compatible fallback implementation ───────────────────────────────

def _to_openai_messages(messages: list[ChatMessage], user_query: str) -> list[dict]:
    """Convert Gemini ChatMessage history to OpenAI-compatible dict list."""
    res = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in messages[:-1]:
        role = "assistant" if m.role == "model" else m.role
        res.append({"role": role, "content": m.content})
    res.append({"role": "user", "content": user_query})
    return res


async def _execute_openai_fallback(
    provider_name: str,
    api_key: str,
    endpoint: str,
    model: str,
    messages: list[dict],
    extra_headers: dict = None
) -> ChatResponse | None:
    """Execute an agentic tool-calling loop using an OpenAI-compatible provider."""
    import httpx

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    if extra_headers:
        headers.update(extra_headers)

    client_timeout = httpx.Timeout(45.0, connect=10.0)
    current_messages = list(messages)
    map_action = None
    tools_used = []

    async with httpx.AsyncClient(timeout=client_timeout) as client:
        for _iteration in range(6):  # MAX_ITERATIONS = 6
            payload = {
                "model": model,
                "messages": current_messages,
                "tools": OPENAI_TOOLS
            }
            try:
                resp = await client.post(endpoint, headers=headers, json=payload)
                if resp.status_code != 200:
                    logger.error(
                        "Fallback provider %s returned status %d: %s",
                        provider_name, resp.status_code, resp.text
                    )
                    return None

                data = resp.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})

                # Check for tool calls
                tool_calls = message.get("tool_calls")
                if not tool_calls:
                    reply = message.get("content", "") or ""
                    return ChatResponse(
                        reply=reply.strip(),
                        mapAction=map_action,
                        toolsUsed=tools_used
                    )

                # Append assistant message with tool_calls back to history
                current_messages.append(message)

                # Execute each tool call
                for tc in tool_calls:
                    tc_id = tc.get("id")
                    func = tc.get("function", {})
                    name = func.get("name")
                    raw_args = func.get("arguments", "{}")

                    try:
                        args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                    except Exception:
                        args = {}

                    tools_used.append(name)
                    logger.info("Fallback %s executing tool: %s(%s)", provider_name, name, args)

                    try:
                        result = await _execute_tool(name, args)
                    except Exception as exc:
                        logger.error("Tool %s failed: %s", name, exc)
                        result = {"error": str(exc)}

                    # Extract map actions
                    if isinstance(result, dict) and result.get("__map_action"):
                        map_action = {k: v for k, v in result.items() if k != "__map_action"}
                        result = {"status": "ok", "map_navigated_to": result.get("label", result.get("country", ""))}

                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "name": name,
                        "content": json.dumps(_json_safe(result))
                    })

            except Exception as e:
                logger.error("Exception in fallback provider %s: %s", provider_name, e)
                return None

    return None


OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_summary",
            "description": "Get a global KPI summary: total detections, CO₂ kt, anomaly count, detection rate, gas value, countries affected.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Observation window in days (1-5). Default 5."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_emitters",
            "description": "Get the top N companies ranked by CO₂-equivalent emissions, with risk levels, flare counts, gas values, and change percentages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Day window (1-5)."},
                    "limit": {"type": "integer", "description": "Number of results (1-50). Default 10."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_alerts",
            "description": "Get active ESG anomaly alerts — flare sites where intensity is >2σ above baseline. Returns severity, spike %, company, basin, location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Day window (1-5)."},
                    "limit": {"type": "integer", "description": "Max alerts to return. Default 20."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_oil_prices",
            "description": "Get live Brent crude, WTI crude, and Natural Gas prices with 10-day history and daily change %.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_compare_2024",
            "description": "Compare current satellite-detected flaring rates (annualised BCM) against 2024 World Bank baseline for each country. Returns deviation %, trend label, and risk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Day window (1-5)."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pulse",
            "description": "Get the global emissions pulse — today's CO₂ kt versus rolling average, with trend label (NORMAL/ELEVATED/CRITICAL/DECLINING).",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Day window (1-5)."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_carbon_tax",
            "description": "Calculate the estimated carbon tax liability for a given CO₂ quantity under a specified regulatory framework.",
            "parameters": {
                "type": "object",
                "properties": {
                    "co2_tonnes": {"type": "number", "description": "Quantity of CO₂-equivalent in metric tonnes."},
                    "regime": {
                        "type": "string",
                        "description": "Regulatory regime: 'EU_CBAM', 'US_EPA_METHANE', 'CORSIA', or 'UK_ETS'."
                    }
                },
                "required": ["co2_tonnes", "regime"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fly_to_location",
            "description": "Send a map navigation command to pan the Petro map to a specific location. Call this whenever the user mentions a country, basin, or field by name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {"type": "string", "description": "The name of the location — basin, country, field, or city."},
                    "lat": {"type": "number", "description": "Latitude of the target location."},
                    "lon": {"type": "number", "description": "Longitude of the target location."},
                    "zoom": {"type": "number", "description": "Mapbox zoom level (4-14). Use ~5 for countries, ~8 for basins, ~12 for fields."}
                },
                "required": ["location_name", "lat", "lon", "zoom"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "filter_map",
            "description": "Apply a country filter to the map so only flares from that country are shown.",
            "parameters": {
                "type": "object",
                "properties": {
                    "country": {"type": "string", "description": "Country name to filter to, or 'all' to show all countries."}
                },
                "required": ["country"]
            }
        }
    }
]
