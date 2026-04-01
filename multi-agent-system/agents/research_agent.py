"""
agents/research_agent.py
-------------------------
Research Agent: Fetches the GitHub issue, walks the repository file tree,
and uses Groq (Llama3) to identify the root cause and relevant files.

Output written to state:
  - issue_title, issue_body
  - repo_dir           (cloned repository location)
  - analysis           (structured LLM analysis)
  - relevant_files     (list of file paths)
"""

import os
import logging
from pathlib import Path
from typing import List

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

from state import AgentState
from utils.github_client import get_issue, clone_repo

load_dotenv()
logger = logging.getLogger(__name__)

# ─── LLM setup ───────────────────────────────────────────────────────────────

def _get_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set in .env")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(api_key=api_key, model=model, temperature=0.2)


# ─── File tree helper ─────────────────────────────────────────────────────────

_SKIP_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "env", "dist", "build", ".idea", ".vscode",
}
_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go",
    ".rb", ".rs", ".cpp", ".c", ".cs", ".php", ".swift",
    ".kt", ".scala", ".sh", ".yaml", ".yml", ".json", ".toml",
}


def _list_code_files(repo_dir: str, max_files: int = 80) -> List[str]:
    """
    Walk the repo and return relative paths of source files (up to max_files).
    """
    result: List[str] = []
    root = Path(repo_dir)
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in _CODE_EXTENSIONS:
            if not any(part in _SKIP_DIRS for part in path.parts):
                result.append(str(path.relative_to(root)))
                if len(result) >= max_files:
                    break
    return result


def _read_file_snippet(repo_dir: str, rel_path: str, max_lines: int = 120) -> str:
    """Read the first max_lines of a file for context."""
    full_path = Path(repo_dir) / rel_path
    try:
        lines = full_path.read_text(encoding="utf-8", errors="replace").splitlines()
        snippet = "\n".join(lines[:max_lines])
        if len(lines) > max_lines:
            snippet += f"\n... (truncated, {len(lines) - max_lines} more lines)"
        return snippet
    except Exception as exc:
        return f"[Could not read file: {exc}]"


# ─── Main agent function ──────────────────────────────────────────────────────

def run_research_agent(state: AgentState) -> AgentState:
    """
    LangGraph node function for the Research Agent.

    Reads: repo_url, issue_number
    Writes: issue_title, issue_body, repo_dir, analysis, relevant_files
    """
    logger.info("══════════  RESEARCH AGENT  ══════════")

    repo_url = state["repo_url"]
    issue_number = state["issue_number"]
    github_token = state["github_token"]

    # 1. Fetch issue details from GitHub
    logger.info(f"Fetching issue #{issue_number} …")
    title, body = get_issue(repo_url, issue_number, github_token)
    logger.info(f"Issue title: {title}")

    # 2. Clone the repository
    logger.info("Cloning repository …")
    repo_dir = clone_repo(repo_url, github_token)

    # 3. Build file listing for LLM context
    code_files = _list_code_files(repo_dir)
    file_list_str = "\n".join(f"  - {f}" for f in code_files)
    logger.info(f"Found {len(code_files)} code files")

    # 4. Build a short content preview of each file (for small repos)
    snippets: list[str] = []
    for rel_path in code_files[:20]:          # limit to first 20 files for prompt
        content = _read_file_snippet(repo_dir, rel_path, max_lines=60)
        snippets.append(f"### File: {rel_path}\n```\n{content}\n```")
    code_context = "\n\n".join(snippets)

    # 5. Ask Groq to analyse the issue
    llm = _get_llm()
    system_prompt = """You are an expert software engineer performing root-cause analysis.
Given a GitHub issue and the codebase file listing with snippets, produce a STRUCTURED analysis.

Your response MUST follow this exact format:

ROOT_CAUSE:
<one-paragraph explanation of why the bug occurs>

RELEVANT_FILES:
<comma-separated list of file paths that need to be changed, e.g.: src/auth.py, utils/validator.py>

SUGGESTED_FIX:
<concise description of what code change will resolve the issue>

CONTEXT_NOTES:
<any edge cases, assumptions, or additional context>"""

    user_prompt = f"""## GitHub Issue #{issue_number}: {title}

{body}

## Repository file listing
{file_list_str}

## Code snippets (first 20 files)
{code_context}

Analyse this issue and provide a structured root cause analysis."""

    logger.info("Calling Groq for analysis …")
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])
    analysis = response.content
    logger.info("Analysis complete.")

    # 6. Parse RELEVANT_FILES from the response
    relevant_files: List[str] = []
    for line in analysis.splitlines():
        if line.strip().startswith("RELEVANT_FILES:"):
            # grab the next non-empty line or inline value
            idx = analysis.splitlines().index(line)
            lines_after = analysis.splitlines()[idx + 1:]
            for candidate in [line.split(":", 1)[-1]] + lines_after:
                candidate = candidate.strip()
                if candidate:
                    relevant_files = [f.strip() for f in candidate.split(",") if f.strip()]
                    break
            break

    logger.info(f"Relevant files identified: {relevant_files}")

    return {
        **state,
        "issue_title": title,
        "issue_body": body,
        "repo_dir": repo_dir,
        "analysis": analysis,
        "relevant_files": relevant_files,
        "retry_count": state.get("retry_count", 0),
        "error": None,
    }
