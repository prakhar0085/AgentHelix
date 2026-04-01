"""
utils/github_client.py
-----------------------
All GitHub interactions: fetching issues, cloning repos,
creating branches, committing files, and opening Pull Requests.

Uses PyGithub for the REST API and GitPython for local git operations.
"""

import os
import re
import logging
import tempfile
from pathlib import Path
from typing import List, Tuple

import requests
from github import Github, GithubException
from git import Repo, GitCommandError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_github_client(token: str) -> Github:
    """Return an authenticated PyGithub client."""
    if not token:
        raise ValueError("GitHub token was not provided by the user.")
    return Github(token)


def _parse_repo_url(repo_url: str) -> str:
    """
    Convert any GitHub URL form to 'owner/repo' slug.

    Accepts:
      - https://github.com/owner/repo
      - https://github.com/owner/repo.git
      - owner/repo
    """
    repo_url = repo_url.strip().rstrip("/")
    match = re.search(r"github\.com[/:](.+?)(?:\.git)?$", repo_url)
    if match:
        return match.group(1)
    # assume already "owner/repo"
    return repo_url


# ─── Public API ───────────────────────────────────────────────────────────────

def get_issue(repo_url: str, issue_number: int, github_token: str) -> Tuple[str, str]:
    """
    Fetch an issue from GitHub.

    Returns:
        (title, body) tuple
    """
    slug = _parse_repo_url(repo_url)
    logger.info(f"Fetching issue #{issue_number} from {slug}")
    gh = _get_github_client(github_token)
    try:
        repo = gh.get_repo(slug)
        issue = repo.get_issue(number=issue_number)
        return issue.title, issue.body or ""
    except GithubException as exc:
        raise RuntimeError(
            f"Failed to fetch issue #{issue_number} from {slug}: {exc}"
        ) from exc


def clone_repo(repo_url: str, github_token: str, target_dir: str | None = None) -> str:
    """
    Clone a GitHub repository to a local directory.

    Args:
        repo_url:   Full GitHub URL of the repository.
        github_token: User github token for authenticated actions.
        target_dir: Where to clone (default: a new temp directory).

    Returns:
        Absolute path to the cloned repository.
    """
    # Inject the token into the URL for authenticated cloning
    if github_token and "github.com" in repo_url:
        authenticated_url = repo_url.replace(
            "https://", f"https://{github_token}@"
        )
    else:
        authenticated_url = repo_url

    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="agent_repo_")

    logger.info(f"Cloning {repo_url} → {target_dir}")
    try:
        Repo.clone_from(authenticated_url, target_dir)
    except GitCommandError as exc:
        raise RuntimeError(f"git clone failed: {exc}") from exc

    return target_dir


def create_branch(repo_dir: str, branch_name: str, base_branch: str = "main") -> None:
    """
    Create and checkout a new branch in the local clone.

    Args:
        repo_dir:    Path to local git repo.
        branch_name: New branch name.
        base_branch: Base branch to branch from (default: 'main').
    """
    logger.info(f"Creating branch '{branch_name}' from '{base_branch}'")
    repo = Repo(repo_dir)

    # Try 'main', fall back to 'master' if the base doesn't exist
    remote_refs = [ref.name for ref in repo.remote().refs]
    if f"origin/{base_branch}" not in remote_refs:
        base_branch = "master"
        if f"origin/{base_branch}" not in remote_refs:
            raise RuntimeError(
                "Could not find 'main' or 'master' branch in remote."
            )

    repo.git.checkout("-b", branch_name, f"origin/{base_branch}")


def push_changes(
    repo_dir: str,
    branch_name: str,
    files: List[str],
    github_token: str,
    commit_message: str = "fix: apply AI-generated patch",
) -> None:
    """
    Stage the given files, commit, and push to origin.

    Args:
        repo_dir:       Path to local git repo.
        branch_name:    Branch to push to.
        files:          List of file paths (relative to repo root) to stage.
        github_token:   The isolated token to push with.
        commit_message: Git commit message.
    """
    logger.info(f"Pushing {len(files)} file(s) to branch '{branch_name}'")
    repo = Repo(repo_dir)

    # Stage files
    repo.index.add(files)

    # Configure a bot identity for the commit
    with repo.config_writer() as cw:
        cw.set_value("user", "name", "AI Orchestrator Bot")
        cw.set_value("user", "email", "ai-bot@users.noreply.github.com")

    repo.index.commit(commit_message)

    # Push
    origin = repo.remote(name="origin")
    if github_token and "https://" in origin.url and "@" not in origin.url:
        origin.set_url(
            origin.url.replace("https://", f"https://{github_token}@")
        )

    origin.push(refspec=f"{branch_name}:{branch_name}")


def create_pull_request(
    repo_url: str,
    branch_name: str,
    title: str,
    body: str,
    github_token: str,
    base_branch: str = "main",
) -> str:
    """
    Open a Pull Request on GitHub.

    Returns:
        The HTML URL of the created PR.
    """
    slug = _parse_repo_url(repo_url)
    logger.info(f"Opening PR '{title}' on {slug}")
    gh = _get_github_client(github_token)
    repo = gh.get_repo(slug)

    # Determine correct base branch
    try:
        repo.get_branch(base_branch)
    except GithubException:
        base_branch = "master"

    try:
        pr = repo.create_pull(
            title=title,
            body=body,
            head=branch_name,
            base=base_branch,
        )
        logger.info(f"PR created: {pr.html_url}")
        return pr.html_url
    except GithubException as exc:
        raise RuntimeError(f"Failed to create PR: {exc}") from exc
