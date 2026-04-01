from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    github_token = Column(String)
    
    runs = relationship("RunHistory", back_populates="owner")


class RunHistory(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    repo_url = Column(String, index=True)
    issue_number = Column(Integer, index=True)
    
    # Run status: e.g. 'completed', 'failed', 'running'
    status = Column(String)
    
    # Metadata extracted implicitly
    issue_title = Column(String, nullable=True)
    patch = Column(Text, nullable=True)
    test_results = Column(Text, nullable=True)
    pr_url = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # A complete JSON dump of the node's resulting state
    state_snapshots = Column(JSON) 
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", back_populates="runs")
