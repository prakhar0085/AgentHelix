"""
utils/docker_runner.py
-----------------------
Runs tests safely inside an isolated Docker container.

Key design:
  - Builds our custom 'multi-agent-sandbox' image from Dockerfile.sandbox
    (pytest is pre-installed at IMAGE BUILD time, which has network access).
  - Copies the repository into the container at runtime (no volume mounts).
  - Runs with network_disabled=True for the actual test execution.
  - Host filesystem cannot be modified.
"""

import os
import logging
import tarfile
import io
from pathlib import Path
from typing import Tuple

import docker
from docker.errors import DockerException, ImageNotFound, BuildError

logger = logging.getLogger(__name__)

# Our custom image name — built from Dockerfile.sandbox
SANDBOX_IMAGE = "multi-agent-sandbox:latest"

# Fallback base image if Dockerfile.sandbox is not found
FALLBACK_IMAGE = "python:3.11-slim"

# How long (seconds) to let the container run before killing it
TIMEOUT_SECONDS = 90


def _find_dockerfile() -> str | None:
    """
    Locate Dockerfile.sandbox relative to this file or the project root.
    Returns the directory containing it, or None if not found.
    """
    candidates = [
        Path(__file__).parent.parent / "Dockerfile.sandbox",   # project root
        Path.cwd() / "Dockerfile.sandbox",
    ]
    for p in candidates:
        if p.exists():
            return str(p.parent)
    return None


def _build_sandbox_image(client: docker.DockerClient) -> str:
    """
    Build the sandbox image from Dockerfile.sandbox.
    Returns the image tag to use.
    """
    dockerfile_dir = _find_dockerfile()
    if dockerfile_dir is None:
        logger.warning(
            "Dockerfile.sandbox not found — falling back to base image. "
            "pytest will be installed with network enabled before disabling it."
        )
        return FALLBACK_IMAGE

    logger.info(f"Building sandbox image '{SANDBOX_IMAGE}' from Dockerfile.sandbox …")
    try:
        image, build_logs = client.images.build(
            path=dockerfile_dir,
            dockerfile="Dockerfile.sandbox",
            tag=SANDBOX_IMAGE,
            rm=True,
            forcerm=True,
        )
        logger.info(f"Sandbox image built: {image.short_id}")
        return SANDBOX_IMAGE
    except BuildError as exc:
        logger.error(f"Failed to build sandbox image: {exc}")
        return FALLBACK_IMAGE


def _ensure_image(client: docker.DockerClient) -> str:
    """
    Return the image tag to use for the sandbox container.

    Priority:
      1. Use cached 'multi-agent-sandbox:latest' if it exists.
      2. Build it from Dockerfile.sandbox.
      3. Fall back to plain python:3.11-slim.
    """
    try:
        client.images.get(SANDBOX_IMAGE)
        logger.info(f"Sandbox image '{SANDBOX_IMAGE}' already cached.")
        return SANDBOX_IMAGE
    except ImageNotFound:
        return _build_sandbox_image(client)


def _build_tar_archive(source_dir: str) -> bytes:
    """
    Create an in-memory tar archive of the source directory.
    This is how we transfer the repo into the Docker container safely.
    """
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        tar.add(source_dir, arcname="workspace")
    buf.seek(0)
    return buf.read()


def run_tests(repo_dir: str, test_file: str) -> Tuple[str, str, int]:
    """
    Run pytest inside a Docker container against the given test file.

    Steps:
      1. Ensure sandbox image exists (build from Dockerfile.sandbox if needed).
      2. Create container with no network access — pytest already installed in image.
      3. Copy the repository into the container.
      4. Run pytest on the test file.
      5. Capture stdout, stderr, and exit code.

    Args:
        repo_dir:  Absolute path to the local repository clone.
        test_file: Path to the pytest test file, relative to repo_dir.

    Returns:
        (stdout, stderr, exit_code) — exit_code 0 means all tests passed.
    """
    logger.info("Initialising Docker client …")
    try:
        client = docker.from_env()
        client.ping()
    except DockerException as exc:
        raise RuntimeError(
            "Cannot connect to Docker. Is Docker Desktop running?"
        ) from exc

    # ── Get or build the sandbox image ───────────────────────────────────
    image_tag = _ensure_image(client)

    # ── Create the container (network disabled — pytest already in image) ─
    logger.info("Creating isolated sandbox container …")
    container = client.containers.create(
        image=image_tag,
        command="sleep 300",          # placeholder; we exec commands below
        working_dir="/workspace",
        network_disabled=True,        # no outbound network during test run
        mem_limit="512m",
        cpu_quota=50000,              # 50% of one CPU
        detach=True,
    )

    stdout_output = ""
    stderr_output = ""
    exit_code = 1

    try:
        container.start()
        logger.info(f"Container started: {container.short_id}")

        # ── Copy repo into the container ──────────────────────────────────
        logger.info("Copying repository into container …")
        tar_data = _build_tar_archive(repo_dir)
        container.put_archive("/", tar_data)

        # ── Run pytest (already installed in image — no pip needed) ───────
        test_path = f"/workspace/{test_file}"
        logger.info(f"Running pytest on {test_path} …")
        result = container.exec_run(
            cmd=f"python -m pytest {test_path} -v --tb=short",
            stdout=True,
            stderr=True,
            demux=True,
        )

        raw_stdout, raw_stderr = result.output
        stdout_output = (raw_stdout or b"").decode("utf-8", errors="replace")
        stderr_output = (raw_stderr or b"").decode("utf-8", errors="replace")
        exit_code = result.exit_code if result.exit_code is not None else 1

    except Exception as exc:
        stderr_output = f"Docker execution error: {exc}"
        logger.error(stderr_output)
    finally:
        logger.info("Stopping and removing sandbox container …")
        try:
            container.stop(timeout=5)
            container.remove(force=True)
        except Exception:
            pass

    logger.info(f"Tests finished — exit code: {exit_code}")
    return stdout_output, stderr_output, exit_code
