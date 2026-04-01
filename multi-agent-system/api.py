import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import logging
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import engine, get_db, SessionLocal
from models import Base, RunHistory, User
from orchestrator.graph import build_graph
import auth

logger = logging.getLogger(__name__)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgentHelix Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/stream")
async def stream_workflow(repo_url: str, issue_number: int, token: str):
    """
    Kicks off the LangGraph orchestration and yields SSE chunks as each node finishes.
    Requires a valid token in query params for SSE.
    """
    async def event_generator():
        # Validate token for SSE
        db = SessionLocal()
        user = auth.get_current_user_from_token(token, db)
        if not user:
            db.close()
            yield f"data: {json.dumps({'event': 'error', 'message': 'Unauthorized'})}\n\n"
            return
            
        initial_state = {
            "repo_url": repo_url,
            "issue_number": issue_number,
            "github_token": user.github_token,
            "retry_count": 0,
            "error": None,
        }
        graph = build_graph()
        
        run = RunHistory(
            user_id=user.id,
            repo_url=repo_url, 
            issue_number=issue_number,
            status="running",
            state_snapshots={}
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        
        # Signal that the process has begun
        yield f"data: {json.dumps({'event': 'start', 'node': 'research', 'run_id': run.id})}\n\n"
        
        try:
            # We use astream to capture each node progression block asynchronously
            async for event in graph.astream(initial_state):
                for node_name, node_state in event.items():
                    # Format log for frontend
                    data = {
                        "event": "node_complete",
                        "node": node_name,
                        "error": node_state.get("error"),
                        "tests_passed": node_state.get("tests_passed"),
                        "retry_count": node_state.get("retry_count"),
                        "pr_url": node_state.get("pr_url"),
                        "state_data": node_state
                    }
                    
                    # Update database run record mapping historical states
                    snapshots = run.state_snapshots or {}
                    snapshots[node_name] = node_state
                    run.state_snapshots = snapshots
                    flag_modified(run, "state_snapshots")
                    
                    if node_name == "research":
                        run.issue_title = node_state.get("issue_title")
                    elif node_name == "judge":
                        run.patch = node_state.get("patch")
                    elif node_name == "test":
                        run.test_results = node_state.get("test_results")
                    elif node_name == "create_pr":
                        run.pr_url = node_state.get("pr_url")
                        
                    db.commit()

                    yield f"data: {json.dumps(data)}\n\n"
            
            run.status = "completed"
            db.commit()
            yield f"data: {json.dumps({'event': 'finished'})}\n\n"
        except Exception as e:
            logger.error(f"Error during graph execution: {e}")
            run.status = "failed"
            run.error_message = str(e)
            db.commit()
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
        finally:
            db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/runs")
def list_runs(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Fetch all history runs for the dashboard."""
    runs = db.query(RunHistory).filter(RunHistory.user_id == user.id).order_by(RunHistory.created_at.desc()).all()
    # Don't send massive snapshot JSON arrays over network in the list view
    return [
        {
            "id": r.id,
            "repo_url": r.repo_url,
            "issue_number": r.issue_number,
            "status": r.status,
            "issue_title": r.issue_title,
            "pr_url": r.pr_url,
            "created_at": r.created_at
        } for r in runs
    ]

@app.get("/runs/{run_id}")
def get_run(run_id: int, user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Fetch an individual run to replay on the dashboard."""
    run = db.query(RunHistory).filter(RunHistory.id == run_id, RunHistory.user_id == user.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
