"""
Agentic Strategy Generator for NivoxAI
--------------------------------------
This file implements a tool-using LLM agent that:
- Reads campaign details
- Reads top recommendations
- Uses internal tools (e.g. summary extraction)
- Produces structured, actionable influencer strategy plans

This aligns with agentic-AI patterns required in real MarTech AI systems.
"""

from __future__ import annotations
from typing import List, Dict, Any
from openai import OpenAI
import json

client = OpenAI()


# -------------------------------------------------------
# TOOL 1: Extract a compact summary of top recommendations
# -------------------------------------------------------

def get_recommendation_summary(recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extracts a compact view of top influencers.
    This is the tool the LLM can call autonomously.

    Returns:
        {
            "top_creators": [
                {"id": ..., "score": ..., "reasons": [...]},
                ...
            ]
        }
    """
    top = recommendations[:3]

    return {
        "top_creators": [
            {
                "id": r["influencer_id"],
                "score": r["score"],
                "reasons": r["reasons"],
            }
            for r in top
        ]
    }


# -------------------------------------------------------
# MAIN AGENT FUNCTION
# -------------------------------------------------------

def generate_strategy_agent(
    campaign: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    question: str | None
) -> Dict[str, Any]:
    """
    Main entry point for the agent.
    Uses OpenAI's tool-calling capabilities to produce structured strategy outputs.
    """

    system_prompt = """
You are NivoxAI – an elite marketing strategy AI agent for influencer campaigns.

Your responsibilities:
- Analyze campaign details and influencer recommendations
- Use provided tools when needed (e.g., influencer summary)
- Produce structured, multi-step strategy blueprints
- Provide reasoning, justification, and data-driven decisions
- Consider demographics, content formats, platform behavior, and goals

Your output must be:
- Actionable
- Structured
- Clear enough for a marketing team to execute immediately
"""

    # Base messages for the conversation
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Campaign:\n{json.dumps(campaign, indent=2)}\n\n"
                f"Recommendations:\n{json.dumps(recommendations, indent=2)}\n\n"
                f"User Question: {question or 'Generate the best strategy.'}"
            )
        }
    ]

    # ------------------------------
    # TOOL DEFINITIONS
    # ------------------------------
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_recommendation_summary",
                "description": "Return a short summary of the top recommended influencers.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        }
    ]

    # ------------------------------
    # FIRST MODEL CALL
    # ------------------------------
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    msg = response.choices[0].message

    # If the model calls a tool, execute it
    if msg.tool_calls:
        final_messages = messages.copy()

        for tool_call in msg.tool_calls:
            if tool_call.function.name == "get_recommendation_summary":

                tool_result = get_recommendation_summary(recommendations)

                # Append tool response back to conversation
                final_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_result)
                    }
                )

        # SECOND call: Model now continues reasoning with tool output
        followup = client.chat.completions.create(
            model="gpt-4.1",
            messages=final_messages
        )

        return followup.choices[0].message.to_dict()

    # If no tool call, return first message directly
    return msg.to_dict()


# -------------------------------------------------------
# Wrapper used by FastAPI endpoint
# -------------------------------------------------------

def generate_strategy_reply(
    campaign: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    user_question: str | None
) -> str:
    """
    Simple wrapper that returns the agent's final textual reply.
    """

    result = generate_strategy_agent(
        campaign=campaign,
        recommendations=recommendations,
        question=user_question,
    )

    # LLM always returns message dict with "content"
    return result.get("content", "")
