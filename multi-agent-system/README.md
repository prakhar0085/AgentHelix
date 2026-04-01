# 🤖 Multi-Agent Orchestration System

A production-ready AI system that automatically **fixes GitHub issues** using a pipeline of specialized agents orchestrated by [LangGraph](https://github.com/langchain-ai/langgraph).

```
Issue → Research → Code → Test → PR
             ↑___________|  (retry on fail)
```

---

## ✨ What It Does

1. **Research Agent** — Fetches the GitHub issue, clones the repository, and uses **Groq (Llama3-70B)** to identify the root cause and relevant files.
2. **Coding Agent** — Generates a complete code fix using Groq and writes it to disk.
3. **Testing Agent** — Writes a pytest test suite and runs it inside an **isolated Docker container**.
4. **PR Agent** — On passing tests, creates a branch, commits changes, and opens a Pull Request with an LLM-generated description.

Includes an automatic **retry loop** (up to 3 attempts) if tests fail — the coding agent sees the failure output and self-corrects.

---

## 📁 Project Structure

```
multi-agent-system/
│
├── agents/
│   ├── research_agent.py   # Fetch issue, analyse repo, find root cause
│   ├── coding_agent.py     # Generate & apply code fix
│   ├── testing_agent.py    # Generate tests, run in Docker
│   └── pr_agent.py         # Create branch, commit, open PR
│
├── orchestrator/
│   └── graph.py            # LangGraph StateGraph with conditional routing
│
├── utils/
│   ├── github_client.py    # GitHub REST API + GitPython wrapper
│   └── docker_runner.py    # Docker sandbox runner
│
├── state.py                # Shared AgentState TypedDict
├── main.py                 # CLI entry point
├── requirements.txt
├── Dockerfile.sandbox      # Base image for test sandbox
└── .env.example
```

---

## 🚀 Setup

### 1. Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Docker Desktop | Latest |
| Git | Any |

### 2. Install Dependencies

```bash
cd multi-agent-system
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY=your_groq_key_here     # Free at console.groq.com
GITHUB_TOKEN=your_github_token      # Needs repo scope
GROQ_MODEL=llama3-70b-8192          # Or: mixtral-8x7b-32768
MAX_RETRIES=3
```

> **Get a free Groq API key** at [console.groq.com](https://console.groq.com) — no credit card needed.

> **Create a GitHub token** at [github.com/settings/tokens](https://github.com/settings/tokens) — enable the **repo** scope.

---

## ▶️ Usage

### Real Run

```bash
python main.py --repo https://github.com/owner/repo --issue 42
```

### Dry Run (no API calls, just shows graph traversal)

```bash
python main.py --repo https://github.com/owner/repo --issue 42 --dry-run
```

### Example Output

```
🚀 Starting Multi-Agent Pipeline
   Repo:  https://github.com/myuser/myrepo
   Issue: #42

  → Node: research
  → Node: code
  → Node: test
  → Node: create_pr

════════════════════════════════════════════════════════════
📋  PIPELINE SUMMARY
════════════════════════════════════════════════════════════
✅  Status: SUCCESS
   PR URL:   https://github.com/myuser/myrepo/pull/15
   Branch:   fix/issue-42-login-fails-special-chars
   Attempts: 1
════════════════════════════════════════════════════════════
```

---

## 🔄 Workflow Graph

```
START
  │
  ▼
[research]  ← fetch issue, clone repo, analyse
  │
  ▼
[code]      ← generate fix with Groq
  │
  ▼
[test]      ← generate tests, run in Docker
  │
  ├── PASS ──────────────▶ [create_pr] ──▶ END
  │
  └── FAIL
        ├── retry < 3 ──▶ [code]      (retry loop)
        └── retry ≥ 3 ──▶ END (error)
```

---

## 🐳 Docker Sandbox

The Testing Agent runs a **fully isolated container** with:
- No network access
- 512 MB memory cap
- 90-second timeout
- The repo is **copied** in (not mounted) — host filesystem is safe

---

## 🧪 Example Scenario

```bash
python main.py \
  --repo https://github.com/myuser/webapp \
  --issue 17
```

**Issue #17**: "Login fails when password contains special characters like `@#$`"

**Flow**:
1. Research Agent → identifies `auth/validator.py` as root cause  
2. Coding Agent → patches special-character handling in password validation  
3. Testing Agent → writes and runs tests: `test_password_special_chars`, etc.  
4. PR Agent → opens: *"fix: Handle special characters in password validation (#17)"*

---

## 🔧 Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key (required) | — |
| `GROQ_MODEL` | Model name | `llama3-70b-8192` |
| `GITHUB_TOKEN` | GitHub PAT with repo scope (required) | — |
| `MAX_RETRIES` | Max coding retry attempts | `3` |

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to Docker` | Ensure Docker Desktop is running |
| `GROQ_API_KEY not set` | Add key to `.env` |
| `git clone failed` | Check `GITHUB_TOKEN` has `repo` scope |
| `PR already exists` | Issue was already processed; check GitHub |

---

## 📜 License

MIT



🧪 Real End-to-End Test — Step by Step
Step 1 — Create a Test Repo on GitHub
Go to github.com/new
Name it: test-ai-fix
Check ✅ "Add a README file"
Click Create repository
Step 2 — Add a Buggy Python File
In your new repo, click "Add file" → "Create new file"

Filename: auth.py

Content:

python
def validate_password(password):
    # BUG: special characters like @#$ break this check
    if password.isalnum():
        return True
    return False
def login(username, password):
    if validate_password(password):
        return f"Welcome, {username}!"
    return "Login failed"
Click Commit changes → Commit directly to 

main
.

Step 3 — Create an Issue
In your repo, go to Issues → New Issue

Title:

Login fails when password contains special characters
Description:

When a user tries to login with a password containing special characters 
like @, #, $, !, the login always fails even if the password is correct.
Example:
- Username: john
- Password: secret@123
- Expected: "Welcome, john!"
- Actual: "Login failed"
Root cause seems to be in the password validation logic.
Click Submit new issue — note the issue number (probably #1).

Step 4 — Fill In Your .env
In VS Code, create .env from the example:

powershell
cd C:\Users\tiwar\Downloads\AiOrch\multi-agent-system
copy .env.example .env
Open .env and fill in:

env
GROQ_API_KEY=gsk_your_actual_groq_key
GITHUB_TOKEN=ghp_your_actual_github_token
GROQ_MODEL=llama3-70b-8192
MAX_RETRIES=3
Step 5 — Start Docker Desktop
Open Docker Desktop and wait for the green "Engine running" status in the bottom left corner. (This is required for the test sandbox.)

Step 6 — Run the Pipeline
powershell
cd C:\Users\tiwar\Downloads\AiOrch\multi-agent-system
python main.py --repo https://github.com/YOUR_USERNAME/test-ai-fix --issue 1
Replace YOUR_USERNAME with your actual GitHub username.

Step 7 — Watch It Work
You'll see the pipeline stream live in your terminal:

🚀 Starting Multi-Agent Pipeline
   Repo:  https://github.com/you/test-ai-fix
   Issue: #1
  → Node: research     ← fetching issue + cloning repo
  → Node: code         ← generating fix with Groq
  → Node: test         ← running pytest in Docker
  → Node: create_pr    ← pushing branch + opening PR
════════════════════════════════════════
✅  Status: SUCCESS
   PR URL:  https://github.com/you/test-ai-fix/pull/2
   Branch:  fix/issue-1-login-fails-special-chars
   Attempts: 1
════════════════════════════════════════
Step 8 — Check GitHub
Go to your repo on GitHub → Pull Requests tab → you should see a new PR automatically created with:

✅ A descriptive title
✅ A markdown body explaining the fix
✅ The patched auth.py
✅ A generated test file test_ai_generated.py
⚠️ If Something Goes Wrong
Problem	Fix
GROQ_API_KEY not set	Check your .env file exists (not just 

.env.example
)
Cannot connect to Docker	Open Docker Desktop and wait for it to fully start
git clone failed	Make sure GITHUB_TOKEN is in .env and has 

repo
 scope
Tests fail 3 times	Normal — check test_results in the output; try adding MAX_RETRIES=5
PR already exists	The branch was already pushed — delete the branch on GitHub and retry


python main.py --repo <repo_url> --issue <number>