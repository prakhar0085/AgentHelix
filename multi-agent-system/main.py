"""
main.py
-------
CLI entry point for the Multi-Agent Orchestration System.

Usage:
    python main.py --repo <repo_url> --issue <issue_number> [--dry-run]

Examples:
    python main.py --repo https://github.com/myuser/myrepo --issue 42
    python main.py --repo https://github.com/myuser/myrepo --issue 42 --dry-run
"""

import argparse
import logging
import sys
import os
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

# ── Pretty logging with rich ──────────────────────────────────────────────────
try:
    from rich.logging import RichHandler
    from rich.console import Console
    from rich import print as rprint

    console = Console()
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    rprint = print

logger = logging.getLogger(__name__)


# ─── Dry-run mode ─────────────────────────────────────────────────────────────

def run_dry_run(repo_url: str, issue_number: int) -> None:
    """
    Simulate the workflow without making real LLM or GitHub calls.
    Each node is printed in order so you can verify the graph topology.
    """
    rprint("\n[bold yellow]🔍 DRY RUN MODE — No real API calls will be made.[/bold yellow]\n")
    nodes = [
        ("research",   "Research Agent  — fetch issue & analyse repo"),
        ("coder_alpha", "Coding Alpha    — generate conservative fix"),
        ("coder_beta",  "Coding Beta     — generate creative fix"),
        ("judge",      "Judge Agent     — select best candidate"),
        ("test",       "Testing Agent   — run pytest in Docker"),
        ("coder_alpha", "Coding Alpha    — retry fix (simulated failure)"),
        ("coder_beta",  "Coding Beta     — retry fix (simulated failure)"),
        ("judge",      "Judge Agent     — select best retry candidate"),
        ("test",       "Testing Agent   — run pytest again"),
        ("create_pr",  "PR Agent        — create branch, commit, open PR"),
    ]
    for node_id, description in nodes:
        rprint(f"  [bold cyan][DRY RUN][/bold cyan] Node: [green]{node_id}[/green]  →  {description}")

    rprint(f"\n[bold green]✅ Dry run complete. Repo: {repo_url}  |  Issue: #{issue_number}[/bold green]\n")


# ─── Real run ─────────────────────────────────────────────────────────────────

def run_pipeline(repo_url: str, issue_number: int) -> None:
    """Execute the full multi-agent orchestration pipeline."""

    # Validate credentials before starting
    missing: list[str] = []
    if not os.getenv("GROQ_API_KEY"):
        missing.append("GROQ_API_KEY")
    if not os.getenv("GITHUB_TOKEN"):
        missing.append("GITHUB_TOKEN")
    if missing:
        rprint(
            f"[bold red]❌ Missing environment variables: {', '.join(missing)}[/bold red]\n"
            "   Copy .env.example → .env and fill in the values."
        )
        sys.exit(1)

    from orchestrator.graph import build_graph
    from state import AgentState

    initial_state: AgentState = {
        "repo_url": repo_url,
        "issue_number": issue_number,
        "retry_count": 0,
        "error": None,
    }

    rprint(f"\n[bold blue]🚀 Starting Multi-Agent Pipeline[/bold blue]")
    rprint(f"   Repo:  [cyan]{repo_url}[/cyan]")
    rprint(f"   Issue: [cyan]#{issue_number}[/cyan]\n")

    graph = build_graph()

    # Stream node transitions (shows which node is executing)
    final_state: AgentState = {}
    for event in graph.stream(initial_state):
        for node_name, node_state in event.items():
            rprint(f"  [bold]→ Node:[/bold] [green]{node_name}[/green]")
            final_state = node_state

    # ── Print summary ──────────────────────────────────────────────────────
    rprint("\n" + "═" * 60)
    rprint("[bold]📋  PIPELINE SUMMARY[/bold]")
    rprint("═" * 60)

    if final_state.get("error"):
        rprint(f"[bold red]❌  Status: FAILED[/bold red]")
        rprint(f"   Error: {final_state['error']}")
    elif final_state.get("pr_url"):
        rprint(f"[bold green]✅  Status: SUCCESS[/bold green]")
        rprint(f"   PR URL:     [link]{final_state['pr_url']}[/link]")
        rprint(f"   Branch:     {final_state.get('branch_name', 'N/A')}")
        rprint(f"   Attempts:   {final_state.get('retry_count', 1)}")
    else:
        rprint("[bold yellow]⚠️  Status: UNKNOWN (no PR created, no error)[/bold yellow]")

    rprint("═" * 60 + "\n")

    # Print test results if available
    test_results = final_state.get("test_results", "")
    if test_results:
        rprint("[bold]🧪  Test Results:[/bold]")
        rprint(test_results[:1500])


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="Multi-Agent AI System: auto-fix GitHub issues via LangGraph + Groq + Docker",
    )
    parser.add_argument(
        "--repo",
        required=True,
        help="Full GitHub repository URL (e.g. https://github.com/owner/repo)",
    )
    parser.add_argument(
        "--issue",
        required=True,
        type=int,
        help="GitHub issue number to fix",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the pipeline without making real API calls",
    )

    args = parser.parse_args()

    if args.dry_run:
        run_dry_run(args.repo, args.issue)
    else:
        run_pipeline(args.repo, args.issue)


if __name__ == "__main__":
    main()
