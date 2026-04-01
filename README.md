# 🚀 AgentHelix: Autonomous Multi-Agent GitHub Automator

[![Status: Production Ready](https://img.shields.io/badge/Status-Production--Ready-brightgreen?style=for-the-badge)](https://github.com/prakhar0085/AgentHelix)
[![Framework: LangGraph](https://img.shields.io/badge/Orchestrator-LangGraph-orange?style=for-the-badge)](https://github.com/langchain-ai/langgraph)
[![Intelligence: Llama 3](https://img.shields.io/badge/LLM-Llama--3--70B-blue?style=for-the-badge)](https://groq.com)
[![Vis: ReactFlow](https://img.shields.io/badge/Frontend-ReactFlow-cyan?style=for-the-badge)](https://reactflow.dev/)

**AgentHelix** (AI Orchestration) is a high-performance system that autonomously transforms GitHub issues into verified Pull Requests. By leveraging **LangGraph** to manage agent state and **Llama 3 (via Groq)** for ultra-fast reasoning, it researches, fixes, and tests code in isolated sandboxes with zero human intervention. 

---

## 🏗 System Architecture

AgentHelix is built using a **Feedback-Driven State Machine** pattern. Agents collaborate through a shared persistent state to drive the lifecycle of an issue.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#3b82f6', 'edgeLabelBackground':'#1f2937', 'tertiaryColor': '#111827'}}}%%
graph TB
    subgraph Client ["🖥️ Presentation Layer"]
        UI["<b>Web Dashboard</b><br/>React + Tailwind"]
        FLOW["<b>Live Flow Engine</b><br/>ReactFlow"]
    end

    subgraph API ["⚡ Communication Gateway"]
        FAST["<b>FastAPI Server</b><br/>WebSocket + REST"]
    end

    subgraph Core ["🧠 Orchestration Core"]
        ORCH["<b>LangGraph Orchestrator</b><br/>State Machine Node Manager"]
    end

    subgraph Agents ["🤖 Autonomous Workforce"]
        RA["<b>Research Agent</b><br/>Issue Analysis"]
        CA["<b>Coding Agent</b><br/>Patch Generation"]
        TA["<b>Testing Agent</b><br/>Docker Verification"]
        PRA["<b>PR Agent</b><br/>GitHub Delivery"]
    end

    subgraph Infra ["🔌 Integrated Infrastructure"]
        LLM["<b>Groq Llama-3</b>"]
        DK["<b>Docker Sandbox</b>"]
        GH["<b>GitHub API</b>"]
    end

    UI <--> FAST <--> ORCH
    ORCH ==> RA & CA & TA & PRA
    
    RA --- LLM
    CA --- LLM
    TA --- DK
    PRA --- GH
    
    TA -- "❌ Fail" --> CA
    TA -- "✅ Pass" --> PRA

    classDef client fill:#dcfce7,stroke:#166534,stroke-width:2px,color:#064e3b;
    classDef api fill:#fef9c3,stroke:#854d0e,stroke-width:2px,color:#422006;
    classDef core fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1e3a8a;
    classDef agent fill:#f3e8ff,stroke:#6b21a8,stroke-width:2px,color:#4c1d95;
    classDef infra fill:#fee2e2,stroke:#991b1b,stroke-width:2px,color:#7f1d1d;

    class UI,FLOW client;
    class FAST api;
    class ORCH core;
    class RA,CA,TA,PRA agent;
    class LLM,DK,GH infra;
```

---

## ✨ Key Capabilities

- **🧠 Intelligent Triage**: Deep-dives into repository structure to isolate root causes.
- **🛠 Code Generation**: Patches bugs using Llama-3-70B with strict context injection.
- **🛡 Isolated Sandboxing**: Executes generated code inside **ephemeral Docker containers**.
- **🔄 Iterative Self-Correction**: If tests fail, the "Judge" agent provides feedback, and the system loops until the fix is perfect.
- **📊 Real-time Monitoring**: A beautiful ReactFlow dashboard to watch the agents think and act live.

---

## 🚀 Quick Setup

### 1. Prerequisites
- **Python 3.10+** & **Node.js 18+**
- **Docker Desktop** (Required for test sandboxing)
- **API Keys**: Groq API Key & GitHub PAT (Personal Access Token)

### 2. Backend Installation 🐍
```bash
cd multi-agent-system
pip install -r requirements.txt
cp .env.example .env
# Open .env and add your keys
python main.py --repo <repo_url> --issue <number>
```

### 3. Frontend Dashboard 🎨
```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 The Agent Squad

| Agent | Responsibility | Tooling |
| :--- | :--- | :--- |
| **Research** | Clone repo, identify bug locus, analyze context | GitPython, LLM |
| **Coding** | Generate precise patches for identified files | Groq (Llama-3) |
| **Testing** | Write unit tests and execute in isolated container | Docker, PyTest |
| **PR** | Commit changes, push branch, and open descriptive PR | GitHub API |

---

## 🛡 Security First
- **Zero-Trust Testing**: No tests run on your local machine; they are always jailed within Docker.
- **Memory Caps**: Sandbox containers are resource-limited to prevent abuse.
- **Network Restricted**: Sandboxed containers have no internet access during execution.

---

## 📜 License
Published under the **MIT License**. Created by [tiwar](https://github.com/tiwar).
