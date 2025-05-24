#!/usr/bin/env python3
"""
ACTIFY Backend API Testing Suite
Tests all backend functionality including the critical group joining with notifications
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class ACTIFYAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        self.log(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Error: {response.text}")
                return False, {}
                
        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}")
            return False, {}
    
    def test_health_check(self) -> bool:
        """Test basic health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        if success:
            self.log(f"   Health status: {response.get('status', 'unknown')}")
            features = response.get('features', {})
            self.log(f"   Features: {features}")
        return success
    
    def test_root_endpoint(self) -> bool:
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "/",
            200
        )
        if success:
            self.log(f"   Message: {response.get('message', 'No message')}")
        return success
    
    def test_stats_endpoint(self) -> bool:
        """Test stats endpoint"""
        success, response = self.run_test(
            "Stats Endpoint",
            "GET",
            "/stats",
            200
        )
        if success:
            self.log(f"   Stats: {response}")
        return success
    
    def test_create_user(self, name: str, email: str) -> Optional[str]:
        """Test user creation and return user ID"""
        success, response = self.run_test(
            f"Create User ({name})",
            "POST",
            "/users",
            200,
            data={"name": name, "email": email}
        )
        if success:
            user_id = response.get('id')
            self.test_data[f'user_{name.lower().replace(" ", "_")}'] = {
                'id': user_id,
                'name': name,
                'email': email
            }
            self.log(f"   Created user ID: {user_id}")
            return user_id
        return None
    
    def test_get_user(self, user_id: str, user_name: str) -> bool:
        """Test getting user by ID"""
        success, response = self.run_test(
            f"Get User ({user_name})",
            "GET",
            f"/users/{user_id}",
            200
        )
        if success:
            self.log(f"   Retrieved user: {response.get('name')} ({response.get('email')})")
        return success
    
    def test_create_group(self, user_id: str, group_name: str, description: str, challenge: str) -> Optional[str]:
        """Test group creation and return group ID"""
        success, response = self.run_test(
            f"Create Group ({group_name})",
            "POST",
            f"/groups?user_id={user_id}",
            200,
            data={
                "name": group_name,
                "description": description,
                "current_challenge": challenge,
                "is_public": True
            }
        )
        if success:
            group_id = response.get('id')
            self.test_data[f'group_{group_name.lower().replace(" ", "_")}'] = {
                'id': group_id,
                'name': group_name,
                'creator_id': user_id
            }
            self.log(f"   Created group ID: {group_id}")
            return group_id
        return None
    
    def test_get_groups(self, user_id: Optional[str] = None) -> bool:
        """Test getting groups"""
        params = {}
        if user_id:
            params['user_id'] = user_id
            
        success, response = self.run_test(
            "Get Groups" + (f" for user {user_id}" if user_id else ""),
            "GET",
            "/groups",
            200,
            params=params
        )
        if success:
            groups = response if isinstance(response, list) else []
            self.log(f"   Found {len(groups)} groups")
            for group in groups[:3]:  # Show first 3 groups
                self.log(f"     - {group.get('name')} ({group.get('member_count', 0)} members)")
        return success
    
    def test_get_group(self, group_id: str, group_name: str) -> bool:
        """Test getting specific group"""
        success, response = self.run_test(
            f"Get Group ({group_name})",
            "GET",
            f"/groups/{group_id}",
            200
        )
        if success:
            self.log(f"   Group: {response.get('name')} - {response.get('member_count', 0)} members")
        return success
    
    def test_join_group(self, group_id: str, user_id: str, user_name: str, group_name: str) -> bool:
        """Test joining a group - THE CRITICAL FUNCTIONALITY"""
        self.log(f"🎯 CRITICAL TEST: {user_name} joining {group_name}")
        
        success, response = self.run_test(
            f"Join Group ({user_name} -> {group_name})",
            "POST",
            f"/groups/{group_id}/join?user_id={user_id}",
            200
        )
        if success:
            self.log(f"   ✅ {user_name} successfully joined {group_name}")
            self.log(f"   Response: {response.get('message', 'No message')}")
            
            # Wait a moment for background notifications to process
            time.sleep(1)
            
            return True
        else:
            self.log(f"   ❌ Failed to join group")
            return False
    
    def test_get_notifications(self, user_id: str, user_name: str) -> bool:
        """Test getting user notifications"""
        success, response = self.run_test(
            f"Get Notifications ({user_name})",
            "GET",
            f"/notifications/{user_id}",
            200
        )
        if success:
            notifications = response if isinstance(response, list) else []
            self.log(f"   Found {len(notifications)} notifications for {user_name}")
            for notif in notifications:
                self.log(f"     - {notif.get('type', 'unknown')}: {notif.get('message', 'No message')}")
        return success
    
    def test_create_submission(self, user_id: str, user_name: str, activity: str, submission_type: str = "global", group_id: Optional[str] = None) -> Optional[str]:
        """Test creating a submission"""
        submission_data = {
            "type": submission_type,
            "activity": activity,
            "photos": {
                "front": f"https://example.com/front_{user_id}.jpg",
                "back": f"https://example.com/back_{user_id}.jpg"
            }
        }
        if group_id:
            submission_data["group_id"] = group_id
        
        success, response = self.run_test(
            f"Create Submission ({user_name} - {submission_type})",
            "POST",
            f"/submissions?user_id={user_id}&user_name={user_name}",
            200,
            data=submission_data
        )
        if success:
            submission_id = response.get('id')
            self.log(f"   Created submission ID: {submission_id}")
            return submission_id
        return None
    
    def test_get_submissions(self, user_id: Optional[str] = None, group_id: Optional[str] = None) -> bool:
        """Test getting submissions"""
        params = {}
        if user_id:
            params['user_id'] = user_id
        if group_id:
            params['group_id'] = group_id
            
        success, response = self.run_test(
            "Get Submissions",
            "GET",
            "/submissions",
            200,
            params=params
        )
        if success:
            submissions = response if isinstance(response, list) else []
            self.log(f"   Found {len(submissions)} submissions")
        return success
    
    def test_vote_submission(self, submission_id: str, user_id: str, rating: int) -> bool:
        """Test voting on a submission"""
        success, response = self.run_test(
            f"Vote on Submission (Rating: {rating})",
            "POST",
            f"/submissions/{submission_id}/vote",
            200,
            data={
                "submission_id": submission_id,
                "user_id": user_id,
                "rating": rating
            }
        )
        return success
    
    def test_react_submission(self, submission_id: str, user_id: str, emoji: str) -> bool:
        """Test reacting to a submission"""
        success, response = self.run_test(
            f"React to Submission ({emoji})",
            "POST",
            f"/submissions/{submission_id}/react",
            200,
            data={
                "submission_id": submission_id,
                "user_id": user_id,
                "emoji": emoji
            }
        )
        return success
    
    def run_comprehensive_test(self) -> int:
        """Run comprehensive test suite"""
        self.log("🚀 Starting ACTIFY Backend API Test Suite")
        self.log(f"   Testing against: {self.base_url}")
        
        # Basic health checks
        self.log("\n📋 Phase 1: Basic Health Checks")
        self.test_root_endpoint()
        self.test_health_check()
        self.test_stats_endpoint()
        
        # User management
        self.log("\n👥 Phase 2: User Management")
        user_alice_id = self.test_create_user("Alice Johnson", "alice@example.com")
        user_bob_id = self.test_create_user("Bob Smith", "bob@example.com")
        user_charlie_id = self.test_create_user("Charlie Brown", "charlie@example.com")
        
        if not all([user_alice_id, user_bob_id, user_charlie_id]):
            self.log("❌ User creation failed, stopping tests")
            return 1
        
        self.test_get_user(user_alice_id, "Alice")
        self.test_get_user(user_bob_id, "Bob")
        
        # Group management
        self.log("\n🏠 Phase 3: Group Management")
        fitness_group_id = self.test_create_group(
            user_alice_id, 
            "Fitness Enthusiasts", 
            "Daily fitness challenges for health lovers",
            "Post your workout selfie! 💪"
        )
        
        book_club_id = self.test_create_group(
            user_bob_id,
            "Book Club",
            "Reading challenges and discussions",
            "Share what you're reading today 📖"
        )
        
        if not all([fitness_group_id, book_club_id]):
            self.log("❌ Group creation failed, stopping tests")
            return 1
        
        self.test_get_groups()
        self.test_get_groups(user_alice_id)
        self.test_get_group(fitness_group_id, "Fitness Enthusiasts")
        
        # CRITICAL TEST: Group joining with notifications
        self.log("\n🎯 Phase 4: CRITICAL GROUP JOINING TESTS")
        self.log("=" * 60)
        
        # Test 1: Bob joins Alice's fitness group
        self.log("🔥 Test 1: Bob joining Alice's fitness group")
        join_success_1 = self.test_join_group(fitness_group_id, user_bob_id, "Bob", "Fitness Enthusiasts")
        
        # Test 2: Charlie joins Alice's fitness group  
        self.log("🔥 Test 2: Charlie joining Alice's fitness group")
        join_success_2 = self.test_join_group(fitness_group_id, user_charlie_id, "Charlie", "Fitness Enthusiasts")
        
        # Test 3: Alice joins Bob's book club
        self.log("🔥 Test 3: Alice joining Bob's book club")
        join_success_3 = self.test_join_group(book_club_id, user_alice_id, "Alice", "Book Club")
        
        if not all([join_success_1, join_success_2, join_success_3]):
            self.log("❌ Group joining failed - CRITICAL ISSUE!")
            return 1
        
        # Check notifications after group joins
        self.log("\n📬 Phase 5: Notification Verification")
        self.log("Checking notifications for all users after group joins...")
        
        self.test_get_notifications(user_alice_id, "Alice")
        self.test_get_notifications(user_bob_id, "Bob") 
        self.test_get_notifications(user_charlie_id, "Charlie")
        
        # Submissions and interactions
        self.log("\n📸 Phase 6: Submissions and Interactions")
        
        # Create submissions
        alice_submission = self.test_create_submission(
            user_alice_id, "Alice", "Morning workout session", "global"
        )
        bob_submission = self.test_create_submission(
            user_bob_id, "Bob", "Post your workout selfie! 💪", "group", fitness_group_id
        )
        
        if alice_submission and bob_submission:
            # Test voting and reactions
            self.test_vote_submission(alice_submission, user_bob_id, 5)
            self.test_vote_submission(bob_submission, user_alice_id, 4)
            self.test_react_submission(alice_submission, user_charlie_id, "🔥")
            self.test_react_submission(bob_submission, user_charlie_id, "👏")
        
        self.test_get_submissions()
        self.test_get_submissions(user_alice_id)
        self.test_get_submissions(group_id=fitness_group_id)
        
        # Final verification
        self.log("\n🔍 Phase 7: Final Verification")
        self.test_get_group(fitness_group_id, "Fitness Enthusiasts")
        self.test_get_group(book_club_id, "Book Club")
        
        # Print final results
        self.log("\n" + "=" * 60)
        self.log(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED! Backend is working correctly.")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            self.log(f"❌ {failed} tests failed. Backend has issues.")
            return 1

def main():
    """Main test execution"""
    # Use the public URL from environment
    base_url = "https://b85a4ece-b1db-4c98-9816-c734201f8392.preview.emergentagent.com"
    
    print("🧪 ACTIFY Backend API Test Suite")
    print(f"🌐 Testing against: {base_url}")
    print("=" * 60)
    
    tester = ACTIFYAPITester(base_url)
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())