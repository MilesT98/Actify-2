from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="ACTIFY API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    created_at: datetime
    avatar_color: str
    groups: List[str] = []
    achievements: List[str] = []

class LoginRequest(BaseModel):
    username: str
    password: str

class GroupCreate(BaseModel):
    name: str
    description: str
    category: str = "fitness"
    is_public: bool = True

class GroupResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    is_public: bool
    created_by: str
    created_at: datetime
    members: List[str] = []
    member_count: int = 0
    current_challenge: Optional[str] = None

class JoinGroupRequest(BaseModel):
    group_id: str

class ActivitySubmission(BaseModel):
    group_id: str
    challenge_type: str
    description: str
    photo_data: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: str
    user_id: str
    username: str
    group_id: str
    challenge_type: str
    description: str
    photo_data: Optional[str]
    created_at: datetime
    votes: int = 0
    reactions: Dict[str, int] = {}

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Dict[str, Any] = {}
    read: bool = False
    created_at: datetime

class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked_at: datetime

# Utility functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_avatar_color() -> str:
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FCEA2B", "#FF9F43", "#6C5CE7", "#FD79A8"]
    return colors[len(colors) % 8]

async def create_notification(user_id: str, notification_type: str, title: str, message: str, data: Dict = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)

# API Routes

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# User Authentication Routes
@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "created_at": datetime.utcnow(),
        "avatar_color": generate_avatar_color(),
        "groups": [],
        "achievements": [],
        "stats": {
            "total_activities": 0,
            "current_streak": 0,
            "total_groups_joined": 0
        }
    }
    
    await db.users.insert_one(user_doc)
    
    # Create welcome notification
    await create_notification(
        user_id, 
        "welcome", 
        "Welcome to ACTIFY!", 
        f"Hey {user_data.full_name}! Ready to start your fitness journey?"
    )
    
    return UserResponse(**user_doc)

@api_router.post("/login")
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username})
    if not user or user["password"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_id = str(uuid.uuid4())
    session_doc = {
        "session_id": session_id,
        "user_id": user["id"],
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30)
    }
    await db.sessions.insert_one(session_doc)
    
    return {
        "session_id": session_id,
        "user": UserResponse(**user),
        "message": "Login successful"
    }

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

# Group Management Routes
@api_router.post("/groups", response_model=GroupResponse)
async def create_group(group_data: GroupCreate, user_id: str = Form(...)):
    group_id = str(uuid.uuid4())
    group_doc = {
        "id": group_id,
        "name": group_data.name,
        "description": group_data.description,
        "category": group_data.category,
        "is_public": group_data.is_public,
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "members": [user_id],
        "member_count": 1,
        "current_challenge": "Daily Steps Challenge"
    }
    
    await db.groups.insert_one(group_doc)
    
    # Add group to user's groups
    await db.users.update_one(
        {"id": user_id},
        {"$push": {"groups": group_id}, "$inc": {"stats.total_groups_joined": 1}}
    )
    
    return GroupResponse(**group_doc)

@api_router.get("/groups", response_model=List[GroupResponse])
async def get_groups(limit: int = 20):
    groups = await db.groups.find({"is_public": True}).limit(limit).to_list(length=None)
    return [GroupResponse(**group) for group in groups]

@api_router.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupResponse(**group)

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, user_id: str = Form(...)):
    # Check if group exists
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user already in group
    if user_id in group.get("members", []):
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    # Add user to group
    await db.groups.update_one(
        {"id": group_id},
        {"$push": {"members": user_id}, "$inc": {"member_count": 1}}
    )
    
    # Add group to user's groups
    await db.users.update_one(
        {"id": user_id},
        {"$push": {"groups": group_id}, "$inc": {"stats.total_groups_joined": 1}}
    )
    
    # Get user info for notification
    user = await db.users.find_one({"id": user_id})
    
    # Notify all group members (except the new member)
    for member_id in group["members"]:
        if member_id != user_id:
            await create_notification(
                member_id,
                "group_join",
                "New Group Member!",
                f"{user['username']} joined {group['name']}",
                {"group_id": group_id, "new_member_id": user_id}
            )
    
    return {"message": "Successfully joined group", "group_id": group_id}

# Activity Submission Routes
@api_router.post("/submissions", response_model=SubmissionResponse)
async def create_submission(
    group_id: str = Form(...),
    challenge_type: str = Form(...),
    description: str = Form(...),
    user_id: str = Form(...),
    photo: Optional[UploadFile] = File(None)
):
    # Verify user is member of group
    group = await db.groups.find_one({"id": group_id})
    if not group or user_id not in group.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Process photo if provided
    photo_data = None
    if photo:
        content = await photo.read()
        photo_data = base64.b64encode(content).decode('utf-8')
    
    # Get user info
    user = await db.users.find_one({"id": user_id})
    
    submission_id = str(uuid.uuid4())
    submission_doc = {
        "id": submission_id,
        "user_id": user_id,
        "username": user["username"],
        "group_id": group_id,
        "challenge_type": challenge_type,
        "description": description,
        "photo_data": photo_data,
        "created_at": datetime.utcnow(),
        "votes": 0,
        "reactions": {}
    }
    
    await db.submissions.insert_one(submission_doc)
    
    # Update user stats
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"stats.total_activities": 1, "stats.current_streak": 1}}
    )
    
    # Notify group members
    for member_id in group["members"]:
        if member_id != user_id:
            await create_notification(
                member_id,
                "new_activity",
                "New Activity Posted!",
                f"{user['username']} completed the {challenge_type} challenge",
                {"group_id": group_id, "submission_id": submission_id}
            )
    
    return SubmissionResponse(**submission_doc)

@api_router.get("/groups/{group_id}/submissions", response_model=List[SubmissionResponse])
async def get_group_submissions(group_id: str, limit: int = 20):
    submissions = await db.submissions.find({"group_id": group_id}).sort("created_at", -1).limit(limit).to_list(length=None)
    return [SubmissionResponse(**submission) for submission in submissions]

@api_router.get("/submissions/feed", response_model=List[SubmissionResponse])
async def get_activity_feed(user_id: str, limit: int = 50):
    # Get user's groups
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_groups = user.get("groups", [])
    if not user_groups:
        return []
    
    # Get submissions from user's groups
    submissions = await db.submissions.find(
        {"group_id": {"$in": user_groups}}
    ).sort("created_at", -1).limit(limit).to_list(length=None)
    
    return [SubmissionResponse(**submission) for submission in submissions]

# Notification Routes
@api_router.get("/notifications/{user_id}", response_model=List[NotificationResponse])
async def get_notifications(user_id: str, limit: int = 50):
    notifications = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit).to_list(length=None)
    
    return [NotificationResponse(**notification) for notification in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

# Rankings Routes
@api_router.get("/rankings/weekly")
async def get_weekly_rankings(limit: int = 10):
    # Get submissions from last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}, "username": {"$first": "$username"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    rankings = await db.submissions.aggregate(pipeline).to_list(length=None)
    
    result = []
    for i, ranking in enumerate(rankings):
        result.append({
            "rank": i + 1,
            "user_id": ranking["_id"],
            "username": ranking["username"],
            "activity_count": ranking["count"],
            "period": "weekly"
        })
    
    return result

@api_router.get("/rankings/alltime")
async def get_alltime_rankings(limit: int = 10):
    pipeline = [
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}, "username": {"$first": "$username"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    rankings = await db.submissions.aggregate(pipeline).to_list(length=None)
    
    result = []
    for i, ranking in enumerate(rankings):
        result.append({
            "rank": i + 1,
            "user_id": ranking["_id"],
            "username": ranking["username"],
            "activity_count": ranking["count"],
            "period": "all-time"
        })
    
    return result

# Achievement Routes
@api_router.get("/achievements/{user_id}", response_model=List[Achievement])
async def get_user_achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate achievements based on user stats
    achievements = []
    stats = user.get("stats", {})
    
    if stats.get("total_activities", 0) >= 1:
        achievements.append({
            "id": "first_activity",
            "name": "First Step",
            "description": "Completed your first activity",
            "icon": "🎯",
            "unlocked_at": datetime.utcnow()
        })
    
    if stats.get("total_activities", 0) >= 10:
        achievements.append({
            "id": "activity_master",
            "name": "Activity Master",
            "description": "Completed 10 activities",
            "icon": "🏆",
            "unlocked_at": datetime.utcnow()
        })
    
    if stats.get("total_groups_joined", 0) >= 1:
        achievements.append({
            "id": "team_player",
            "name": "Team Player",
            "description": "Joined your first group",
            "icon": "🤝",
            "unlocked_at": datetime.utcnow()
        })
    
    if stats.get("current_streak", 0) >= 7:
        achievements.append({
            "id": "week_warrior",
            "name": "Week Warrior",
            "description": "7 day activity streak",
            "icon": "🔥",
            "unlocked_at": datetime.utcnow()
        })
    
    return achievements

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
