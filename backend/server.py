from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import logging
import uuid
from pathlib import Path
from dotenv import load_dotenv
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str

class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    members: List[str] = Field(default_factory=list)
    current_challenge: str
    next_week_challenges: List[Dict[str, Any]] = Field(default_factory=list)
    challenge_submission_deadline: datetime
    created_by: str
    member_count: int = Field(default=1)
    is_public: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroupCreate(BaseModel):
    name: str
    description: str
    current_challenge: str
    is_public: bool = True

class GroupJoin(BaseModel):
    group_id: str
    user_id: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    type: str  # 'group_join', 'challenge_vote', 'achievement', etc.
    data: Dict[str, Any] = Field(default_factory=dict)
    read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    user_id: str
    message: str
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)

class Submission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    type: str  # 'global' or 'group'
    group_id: Optional[str] = None
    activity: str
    photos: Dict[str, str]  # front and back photo URLs
    votes: List[Dict[str, Any]] = Field(default_factory=list)
    reactions: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SubmissionCreate(BaseModel):
    type: str
    group_id: Optional[str] = None
    activity: str
    photos: Dict[str, str]

class Vote(BaseModel):
    submission_id: str
    user_id: str
    rating: int

class Reaction(BaseModel):
    submission_id: str
    user_id: str
    emoji: str

# Notification system
async def create_notification(user_id: str, message: str, notification_type: str, data: Dict[str, Any] = None):
    """Create a notification for a user"""
    try:
        notification = Notification(
            user_id=user_id,
            message=message,
            type=notification_type,
            data=data or {}
        )
        await db.notifications.insert_one(notification.dict())
        logger.info(f"Created notification for user {user_id}: {message}")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")

async def notify_group_members(group_id: str, exclude_user_id: str, message: str, notification_type: str, data: Dict[str, Any] = None):
    """Send notifications to all group members except the specified user"""
    try:
        # Get group members
        group = await db.groups.find_one({"id": group_id})
        if not group:
            return
        
        # Create notifications for all members except the one who performed the action
        for member_id in group["members"]:
            if member_id != exclude_user_id:
                await create_notification(member_id, message, notification_type, data)
    except Exception as e:
        logger.error(f"Failed to notify group members: {e}")

# API Endpoints

@api_router.get("/")
async def root():
    return {"message": "ACTIFY API - Group joining functionality improved!"}

# User endpoints
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    """Create a new user"""
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Group endpoints
@api_router.post("/groups", response_model=Group)
async def create_group(group_data: GroupCreate, user_id: str):
    """Create a new group"""
    group = Group(
        **group_data.dict(),
        created_by=user_id,
        members=[user_id],
        challenge_submission_deadline=datetime.utcnow() + timedelta(days=7)
    )
    await db.groups.insert_one(group.dict())
    
    # Create achievement notification for group creator
    await create_notification(
        user_id=user_id,
        message=f"🎉 You created the group '{group.name}'! Earned 'Community Builder' achievement!",
        notification_type="achievement",
        data={"achievement": "group-creator", "group_id": group.id}
    )
    
    return group

@api_router.get("/groups", response_model=List[Group])
async def get_groups(user_id: Optional[str] = None, public_only: bool = True):
    """Get all groups or groups for a specific user"""
    filter_criteria = {}
    if public_only:
        filter_criteria["is_public"] = True
    if user_id:
        filter_criteria["members"] = user_id
    
    groups = await db.groups.find(filter_criteria).to_list(1000)
    return [Group(**group) for group in groups]

@api_router.get("/groups/{group_id}", response_model=Group)
async def get_group(group_id: str):
    """Get group by ID"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return Group(**group)

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, user_id: str, background_tasks: BackgroundTasks):
    """Join a group - IMPROVED WITH NOTIFICATIONS"""
    try:
        # Check if group exists
        group = await db.groups.find_one({"id": group_id})
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is already a member
        if user_id in group["members"]:
            raise HTTPException(status_code=400, detail="User is already a member")
        
        # Get user info for notifications
        user = await db.users.find_one({"id": user_id})
        user_name = user["name"] if user else "Unknown User"
        
        # Add user to group
        await db.groups.update_one(
            {"id": group_id},
            {
                "$push": {"members": user_id},
                "$inc": {"member_count": 1}
            }
        )
        
        # Create success notification for the joining user
        await create_notification(
            user_id=user_id,
            message=f"🎉 Successfully joined '{group['name']}'! You'll receive weekly challenges.",
            notification_type="group_join",
            data={"group_id": group_id, "group_name": group["name"]}
        )
        
        # Notify all existing group members about the new member
        background_tasks.add_task(
            notify_group_members,
            group_id=group_id,
            exclude_user_id=user_id,
            message=f"👋 {user_name} joined your group '{group['name']}'!",
            notification_type="member_join",
            data={"group_id": group_id, "group_name": group["name"], "new_member": user_name}
        )
        
        return {"message": "Successfully joined group", "group_id": group_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining group: {e}")
        raise HTTPException(status_code=500, detail="Failed to join group")

@api_router.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, user_id: str, background_tasks: BackgroundTasks):
    """Leave a group"""
    try:
        group = await db.groups.find_one({"id": group_id})
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        if user_id not in group["members"]:
            raise HTTPException(status_code=400, detail="User is not a member")
        
        # Get user info for notifications
        user = await db.users.find_one({"id": user_id})
        user_name = user["name"] if user else "Unknown User"
        
        # Remove user from group
        await db.groups.update_one(
            {"id": group_id},
            {
                "$pull": {"members": user_id},
                "$inc": {"member_count": -1}
            }
        )
        
        # Notify remaining members
        background_tasks.add_task(
            notify_group_members,
            group_id=group_id,
            exclude_user_id=user_id,
            message=f"👋 {user_name} left the group '{group['name']}'",
            notification_type="member_leave",
            data={"group_id": group_id, "group_name": group["name"], "left_member": user_name}
        )
        
        return {"message": "Successfully left group"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leaving group: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave group")

# Notification endpoints
@api_router.get("/notifications/{user_id}", response_model=List[Notification])
async def get_user_notifications(user_id: str, unread_only: bool = False):
    """Get notifications for a user"""
    filter_criteria = {"user_id": user_id}
    if unread_only:
        filter_criteria["read"] = False
    
    notifications = await db.notifications.find(filter_criteria).sort("created_at", -1).to_list(100)
    return [Notification(**notification) for notification in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

# Submission endpoints
@api_router.post("/submissions", response_model=Submission)
async def create_submission(submission_data: SubmissionCreate, user_id: str, user_name: str):
    """Create a new submission"""
    submission = Submission(
        **submission_data.dict(),
        user_id=user_id,
        user_name=user_name
    )
    await db.submissions.insert_one(submission.dict())
    return submission

@api_router.get("/submissions", response_model=List[Submission])
async def get_submissions(user_id: Optional[str] = None, group_id: Optional[str] = None, limit: int = 50):
    """Get submissions with optional filters"""
    filter_criteria = {}
    if user_id:
        filter_criteria["user_id"] = user_id
    if group_id:
        filter_criteria["group_id"] = group_id
    
    submissions = await db.submissions.find(filter_criteria).sort("timestamp", -1).limit(limit).to_list(limit)
    return [Submission(**submission) for submission in submissions]

@api_router.post("/submissions/{submission_id}/vote")
async def vote_submission(submission_id: str, vote_data: Vote):
    """Vote on a submission"""
    # Remove existing vote from this user if any
    await db.submissions.update_one(
        {"id": submission_id},
        {"$pull": {"votes": {"user_id": vote_data.user_id}}}
    )
    
    # Add new vote
    await db.submissions.update_one(
        {"id": submission_id},
        {"$push": {"votes": vote_data.dict()}}
    )
    
    return {"message": "Vote recorded"}

@api_router.post("/submissions/{submission_id}/react")
async def react_submission(submission_id: str, reaction_data: Reaction):
    """React to a submission"""
    # Remove existing reaction from this user if any
    await db.submissions.update_one(
        {"id": submission_id},
        {"$pull": {"reactions": {"user_id": reaction_data.user_id}}}
    )
    
    # Add new reaction
    await db.submissions.update_one(
        {"id": submission_id},
        {"$push": {"reactions": reaction_data.dict()}}
    )
    
    return {"message": "Reaction recorded"}

# Health check and utility endpoints
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "features": {
                "group_joining": "enabled",
                "notifications": "enabled",
                "real_time_updates": "enabled"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

@api_router.get("/stats")
async def get_stats():
    """Get app statistics"""
    try:
        total_users = await db.users.count_documents({})
        total_groups = await db.groups.count_documents({})
        total_submissions = await db.submissions.count_documents({})
        total_notifications = await db.notifications.count_documents({})
        
        return {
            "total_users": total_users,
            "total_groups": total_groups,
            "total_submissions": total_submissions,
            "total_notifications": total_notifications,
            "active_groups": await db.groups.count_documents({"member_count": {"$gt": 1}})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {e}")

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)