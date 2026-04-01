"""
agents/testing_agent.py
------------------------
Testing Agent: Uses Groq to generate a pytest test suite for the fix,
then runs the tests inside an isolated Docker container.

Output written to state:
  - test_code      (generated test source)
  - test_results   (stdout + stderr from Docker)
  - tests_passed   (True if exit code == 0)
"""

import os
import logging
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

from state import AgentState
from utils.docker_runner import run_tests

load_dotenv()
logger = logging.getLogger(__name__)

TEST_FILE_NAME = "test_ai_generated.py"


def _get_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(api_key=api_key, model=model, temperature=0.2)


def _extract_code_block(text: str) -> str:
    """Extract content from the first ```python ... ``` block, or return raw text."""
    import re
    match = re.search(r"```(?:python)?\n(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()


def run_testing_agent(state: AgentState) -> AgentState:
    """
    LangGraph node function for the Testing Agent.

    Reads:  repo_dir, analysis, patch, issue_title, issue_body, modified_files
    Writes: test_code, test_results, tests_passed
    """
    logger.info("══════════  TESTING AGENT  ══════════")

    repo_dir = state["repo_dir"]
    analysis = state.get("analysis", "")
    patch = state.get("patch", "")
    modified_files = state.get("modified_files", [])
    issue_title = state.get("issue_title", "")
    issue_body = state.get("issue_body", "")

    # ── Read modified and relevant file contents to give LLM context ──────
    files_to_read = list(dict.fromkeys(modified_files + state.get("relevant_files", [])))
    file_snippets: list[str] = []
    for rel_path in files_to_read[:8]:   # read top 8 files for context
        try:
            content = (Path(repo_dir) / rel_path).read_text(
                encoding="utf-8", errors="replace"
            )[:3000]
            file_snippets.append(f"### FILE: {rel_path}\n```python\n{content}\n```")
        except Exception:
            pass
    code_context = "\n\n".join(file_snippets) or "No code context available."

    # ── Generate tests with Groq ───────────────────────────────────────────
    system_prompt = """You are a senior QA engineer. Write a comprehensive pytest test suite.

RULES:
1. Output ONLY valid Python code inside a single ```python ... ``` block.
2. Each test must have a clear docstring.
3. Cover the bug fix specifically, plus edge cases.
4. Use standard Python — no external test fixtures.
5. Tests should be self-contained (no real network calls, no real DB needed).
6. If testing a function that has side effects, use unittest.mock.patch."""

    user_prompt = f"""## Issue: {issue_title}

{issue_body}

## Root Cause Analysis
{analysis}

## Applied Fix (modified files)
{code_context}

Write a pytest test suite that:
1. Tests the specific bug fix described in the issue
2. Covers edge cases around {issue_title}
3. Ensures the fix doesn't break existing expected behaviour"""

    llm = _get_llm()
    logger.info("Calling Groq to generate tests …")
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    test_code = _extract_code_block(response.content)
    logger.info("Tests generated.")

    # ── Write the test file to the repo dir ───────────────────────────────
    test_file_path = Path(repo_dir) / TEST_FILE_NAME
    test_file_path.write_text(test_code, encoding="utf-8")
    logger.info(f"Test file written to {test_file_path}")

    # ── Run tests in Docker ───────────────────────────────────────────────
    logger.info("Running tests in Docker sandbox …")
    try:
        stdout, stderr, exit_code = run_tests(repo_dir, TEST_FILE_NAME)
    except RuntimeError as exc:
        # Docker unavailable: log and treat as failure so retry logic kicks in
        stdout = ""
        stderr = str(exc)
        exit_code = 1
        logger.error(f"Docker error: {exc}")

    combined_output = f"=== STDOUT ===\n{stdout}\n=== STDERR ===\n{stderr}"
    tests_passed = exit_code == 0

    if tests_passed:
        logger.info("✅ All tests PASSED.")
    else:
        logger.warning(f"❌ Tests FAILED (exit code {exit_code}).")

    return {
        **state,
        "test_code": test_code,
        "test_results": combined_output,
        "tests_passed": tests_passed,
    }
