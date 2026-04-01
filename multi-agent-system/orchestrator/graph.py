"""
orchestrator/graph.py
---------------------
Builds the LangGraph StateGraph that connects all four agents.

Workflow:
  START → research → code → test
  test  → (pass)  → pr  → END
  test  → (fail, retry < MAX) → code   [retry loop]
  test  → (fail, retry >= MAX) → END   [give up with error]
"""

import os
import logging
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END

from state import AgentState
from agents.research_agent import run_research_agent
from agents.coding_agent import run_coding_agent_alpha, run_coding_agent_beta
from agents.judge_agent import run_judge_agent
from agents.testing_agent import run_testing_agent
from agents.pr_agent import run_pr_agent

load_dotenv()
logger = logging.getLogger(__name__)

MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))


# ─── Conditional edge functions ───────────────────────────────────────────────

def route_after_test(state: AgentState) -> str:
    """
    Decide what happens after the Testing Agent finishes:
      - Tests passed → go to PR creation
      - Tests failed, still have retries → loop back to coding
      - Tests failed, out of retries → end with error state
    """
    retry_count = state.get("retry_count", 0)
    tests_passed = state.get("tests_passed", False)

    if tests_passed:
        logger.info("✅ Tests passed — routing to PR agent.")
        return "create_pr"

    if retry_count >= MAX_RETRIES:
        logger.warning(
            f"❌ Tests failed after {retry_count} attempt(s). Max retries reached."
        )
        return "max_retries_exceeded"

    logger.info(
        f"🔄 Tests failed (attempt {retry_count}/{MAX_RETRIES}) — retrying coding agents."
    )
    return ["retry_code_alpha", "retry_code_beta"]


# ─── Graph builder ────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Construct and compile the LangGraph workflow.

    Returns:
        A compiled LangGraph graph ready for invocation.
    """
    graph = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────
    graph.add_node("research", run_research_agent)
    graph.add_node("coder_alpha", run_coding_agent_alpha)
    graph.add_node("coder_beta", run_coding_agent_beta)
    graph.add_node("judge", run_judge_agent)
    graph.add_node("test", run_testing_agent)
    graph.add_node("create_pr", run_pr_agent)

    # ── Terminal error node (max retries exceeded) ────────────────────────
    def handle_max_retries(state: AgentState) -> AgentState:
        msg = (
            f"Stopped after {state.get('retry_count', 0)} attempt(s). "
            f"Tests still failing.\n\nLast test output:\n{state.get('test_results', '')}"
        )
        logger.error(msg)
        return {**state, "error": msg}

    graph.add_node("max_retries", handle_max_retries)

    # ── Define edges ──────────────────────────────────────────────────────

    graph.set_entry_point("research")
    
    # Fan-out from research to both coders
    graph.add_edge("research", "coder_alpha")
    graph.add_edge("research", "coder_beta")

    # Fan-in from both coders to judge
    graph.add_edge("coder_alpha", "judge")
    graph.add_edge("coder_beta", "judge")
    
    # Judge flows to Test
    graph.add_edge("judge", "test")

    # Conditional: after test, choose next step
    graph.add_conditional_edges(
        "test",
        route_after_test,
        {
            "create_pr": "create_pr",
            "retry_code_alpha": "coder_alpha",
            "retry_code_beta": "coder_beta",
            "max_retries_exceeded": "max_retries",
        },
    )

    # Terminal edges
    graph.add_edge("create_pr", END)
    graph.add_edge("max_retries", END)

    return graph.compile()
