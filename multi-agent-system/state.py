"""
state.py
--------
Defines the central AgentState TypedDict that flows through every node
in the LangGraph workflow.  All agents read from and write back into
this single shared state object.
"""

from typing import TypedDict, Optional, List, Annotated
import operator

class Candidate(TypedDict):
    agent_name: str
    patch: str
    parsed_files: dict[str, str]

class AgentState(TypedDict, total=False):
    # ── Inputs ──────────────────────────────────────────────────────────
    issue_number: int           # GitHub issue number (from CLI)
    repo_url: str               # Full GitHub repo URL
    github_token: str           # The isolated user GitHub Token
    issue_title: str            # Issue title fetched from GitHub
    issue_body: str             # Issue description fetched from GitHub

    # ── Working directory ────────────────────────────────────────────────
    repo_dir: str               # Absolute path to the locally cloned repo

    # ── Research Agent outputs ───────────────────────────────────────────
    analysis: str               # Structured analysis produced by ResearchAgent
    relevant_files: List[str]   # File paths identified as relevant

    # ── Coding Agent outputs ─────────────────────────────────────────────
    patch: str                  # Unified diff / description of changes made
    modified_files: List[str]   # Files actually modified on disk

    # ── Testing Agent outputs ────────────────────────────────────────────
    test_code: str              # Generated pytest test suite (source)
    test_results: str           # Raw stdout+stderr from the Docker run
    tests_passed: bool          # True if all tests passed

    # ── PR Agent outputs ─────────────────────────────────────────────────
    branch_name: str            # New branch created for the fix
    pr_url: str                 # URL of the created Pull Request

    # ── Orchestration metadata ───────────────────────────────────────────
    retry_count: int            # How many times the coding loop has run
    error: Optional[str]        # Last error message (if any)
    
    # ── Debate Mode specific ─────────────────────────────────────────────
    candidates: Annotated[List[Candidate], operator.add]
    judge_reasoning: str
