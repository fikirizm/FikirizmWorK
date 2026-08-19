from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class SessionBody(BaseModel):
    session_id: str


class WorkspaceBody(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectBody(BaseModel):
    workspace_id: str
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#6366F1"
    icon: Optional[str] = "Folder"
    template: Optional[str] = "general"
    currency: Optional[str] = "TRY"
    members: Optional[List[str]] = []
    budget_policy: Optional[str] = "admins"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    statuses: Optional[List[dict]] = None
    currency: Optional[str] = None
    members: Optional[List[str]] = None
    budget_policy: Optional[str] = None


class TaskBody(BaseModel):
    workspace_id: str
    project_id: str
    title: str
    description: Optional[str] = ""
    status: Optional[str] = None
    priority: Optional[str] = "medium"
    assignees: Optional[List[str]] = []
    due_date: Optional[str] = None
    start_date: Optional[str] = None
    tags: Optional[List[str]] = []
    parent_id: Optional[str] = None
    checklist: Optional[List[dict]] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignees: Optional[List[str]] = None
    due_date: Optional[str] = None
    start_date: Optional[str] = None
    tags: Optional[List[str]] = None
    checklist: Optional[List[dict]] = None
    order: Optional[float] = None


class BulkUpdate(BaseModel):
    ids: List[str]
    updates: dict


class CommentBody(BaseModel):
    text: str


class IdeaBody(BaseModel):
    workspace_id: str
    project_id: Optional[str] = None
    title: str
    description: Optional[str] = ""


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class InviteBody(BaseModel):
    email: EmailStr
    name: str
    role: str = "member"


class BudgetBody(BaseModel):
    type: str  # income | expense
    category: str
    description: Optional[str] = ""
    planned_amount: float = 0
    actual_amount: float = 0
    date: Optional[str] = None
    responsible: Optional[str] = None
    task_id: Optional[str] = None


class BudgetUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    planned_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    date: Optional[str] = None
    responsible: Optional[str] = None
    task_id: Optional[str] = None
