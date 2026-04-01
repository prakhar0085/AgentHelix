"""
agents/coding_agent.py
-----------------------
Coding Agent: Reads the research analysis, then uses Groq to generate
a code fix. Applies the fix directly to files in the local clone.

Output written to state:
  - patch          (description / unified diff of changes)
  - modified_files (list of relative file paths that were changed)
"""

import os
import re
import logging
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

from state import AgentState, Candidate

load_dotenv()
logger = logging.getLogger(__name__)


def _get_llm(temperature: float = 0.1) -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(api_key=api_key, model=model, temperature=temperature)


def _read_file(repo_dir: str, rel_path: str) -> str:
    """Read a file from the local repo, return its content."""
    try:
        return (Path(repo_dir) / rel_path).read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        return f"[UNREADABLE: {exc}]"


def _parse_code_blocks(response: str) -> tuple[list[str], dict[str, str]]:
    """
    Parse the LLM response for fenced code blocks tagged with a filename:

        ### FILE: path/to/file.py
        ```python
        <full file content>
        ```

    Returns (modified_files, parsed_files_dict) without writing to disk.
    """
    # Match:  ### FILE: <path>  followed by a fenced code block
    pattern = re.compile(
        r"###\s*FILE:\s*(?P<path>[^\n]+)\n```[^\n]*\n(?P<code>.*?)```",
        re.DOTALL,
    )
    modified_files: list[str] = []
    parsed_files: dict[str, str] = {}

    for match in pattern.finditer(response):
        rel_path = match.group("path").strip()
        code = match.group("code")
        modified_files.append(rel_path)
        parsed_files[rel_path] = code
        logger.debug(f"  ✔ Parsed: {rel_path}")

    return modified_files, parsed_files


def create_coding_agent(name: str, temperature: float = 0.1):
    def _run_coding_agent(state: AgentState) -> AgentState:
        """
        LangGraph node function for the Coding Agent.
        """
        logger.info(f"══════════  CODING AGENT ({name.upper()})  ══════════")

        repo_dir = state["repo_dir"]
        analysis = state.get("analysis", "")
        relevant_files = state.get("relevant_files", [])
        retry_count = state.get("retry_count", 0)
        previous_results = state.get("test_results", "")

        logger.info(f"Attempt #{retry_count + 1}  |  Relevant files: {relevant_files}")

        # ── Read current file contents ─────────────────────────────────────────
        file_contents: list[str] = []
        files_to_edit = relevant_files[:10]           # cap to avoid huge prompts
        for rel_path in files_to_edit:
            content = _read_file(repo_dir, rel_path)
            file_contents.append(
                f"### FILE: {rel_path}\n```\n{content}\n```"
            )
        code_context = "\n\n".join(file_contents) if file_contents else "No specific files identified."

        # ── Build prompt ───────────────────────────────────────────────────────
        retry_note = ""
        if retry_count > 0 and previous_results:
            retry_note = f"""
## ⚠️ Previous Attempt Failed (attempt {retry_count})
The tests produced the following output — please address these failures:

```
{previous_results[:2000]}
```
"""

        system_prompt = """You are an expert software engineer. Fix the described bug.

CRITICAL INSTRUCTIONS:
1. Output the COMPLETE fixed content of each modified file.
2. Use EXACTLY this format for each file you modify:

### FILE: <relative/path/to/file.py>
```python
<complete file content here, not a diff>
```

3. Fix ONLY what is necessary. Do not refactor unrelated code.
4. After the file blocks, write a short PATCH_SUMMARY: section describing what changed."""

        user_prompt = f"""## Issue: {state.get('issue_title', 'Unknown')}

{state.get('issue_body', '')}

## Root Cause Analysis
{analysis}
{retry_note}
## Current File Contents
{code_context}

Please provide the complete fixed file(s) using the ### FILE: format."""

        llm = _get_llm(temperature=temperature)
        logger.info(f"Calling Groq to generate fix (temp={temperature}) …")
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        raw_output = response.content
        logger.info("Fix generated.")

        # ── Parse the fix without writing to disk ─────────────────────────────
        modified_files, parsed_files = _parse_code_blocks(raw_output)

        if not modified_files:
            logger.warning(
                f"Coding agent {name} did not produce any ### FILE: blocks."
            )

        candidate: Candidate = {
            "agent_name": name,
            "patch": raw_output,
            "parsed_files": parsed_files
        }

        # Only return the keys we actually want to update.
        # LangGraph automatically merges these with the existing state.
        state_update: dict = {
            "candidates": [candidate],
        }
        
        # Only let one branch increment the retry count to avoid collisions
        if name == "coder_alpha":
            state_update["retry_count"] = retry_count + 1
            
        return state_update

    return _run_coding_agent

run_coding_agent_alpha = create_coding_agent("coder_alpha", temperature=0.1)
run_coding_agent_beta = create_coding_agent("coder_beta", temperature=0.7)
