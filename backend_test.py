#!/usr/bin/env python3
"""
ACTIFY Backend API Testing Suite
Tests all endpoints for the social fitness application
"""

import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO

class ACTIFYAPITester:
    def __init__(self, base_url="https://640ec078-ed72-4608-8227-9358c4048e06.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = None
        self.test_user = None
        self.test_group = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test data
        self.test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        self.test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_password = "TestPass123!"
        self.test_full_name = "Test User"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
    def make_request(self, method, endpoint, data=None, files=None, params=None, form_data=False):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                if files or form_data:
                    response = requests.post(url, data=data, files=files, timeout=10)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None

    def test_health_check(self):
        """Test health endpoint"""
        print("\n🔍 Testing Health Check...")
        response = self.make_request('GET', 'health')
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'status' in data and data['status'] == 'healthy'
            self.log_test("Health Check", success, f"Response: {data}")
        else:
            self.log_test("Health Check", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_creation(self):
        """Test user creation endpoint"""
        print("\n🔍 Testing User Creation...")
        user_data = {
            "username": self.test_username,
            "email": self.test_email,
            "password": self.test_password,
            "full_name": self.test_full_name
        }
        
        response = self.make_request('POST', 'users', data=user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['id', 'username', 'email', 'full_name', 'created_at', 'avatar_color']
            success = all(field in data for field in required_fields)
            if success:
                self.test_user = data
            self.log_test("User Creation", success, f"User ID: {data.get('id', 'N/A')}")
        else:
            self.log_test("User Creation", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_login(self):
        """Test user login endpoint"""
        print("\n🔍 Testing User Login...")
        if not self.test_user:
            self.log_test("User Login", False, "No test user available")
            return
            
        login_data = {
            "username": self.test_username,
            "password": self.test_password
        }
        
        response = self.make_request('POST', 'login', data=login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'session_id' in data and 'user' in data
            if success:
                self.session_id = data['session_id']
            self.log_test("User Login", success, f"Session ID: {data.get('session_id', 'N/A')}")
        else:
            self.log_test("User Login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_user(self):
        """Test get user endpoint"""
        print("\n🔍 Testing Get User...")
        if not self.test_user:
            self.log_test("Get User", False, "No test user available")
            return
            
        response = self.make_request('GET', f"users/{self.test_user['id']}")
        
        if response and response.status_code == 200:
            data = response.json()
            success = data['id'] == self.test_user['id']
            self.log_test("Get User", success, f"Retrieved user: {data.get('username', 'N/A')}")
        else:
            self.log_test("Get User", False, f"Status: {response.status_code if response else 'No response'}")

    def test_group_creation(self):
        """Test group creation endpoint"""
        print("\n🔍 Testing Group Creation...")
        if not self.test_user:
            self.log_test("Group Creation", False, "No test user available")
            return
            
        # Use form data as expected by the endpoint
        group_data = {
            'name': f'Test Group {datetime.now().strftime("%H%M%S")}',
            'description': 'A test fitness group',
            'category': 'fitness',
            'is_public': 'true',
            'user_id': self.test_user['id']
        }
        
        response = self.make_request('POST', 'groups', data=group_data)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['id', 'name', 'description', 'created_by', 'members']
            success = all(field in data for field in required_fields)
            if success:
                self.test_group = data
            self.log_test("Group Creation", success, f"Group ID: {data.get('id', 'N/A')}")
        else:
            self.log_test("Group Creation", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_groups(self):
        """Test get groups endpoint"""
        print("\n🔍 Testing Get Groups...")
        response = self.make_request('GET', 'groups')
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Get Groups", success, f"Found {len(data)} groups")
        else:
            self.log_test("Get Groups", False, f"Status: {response.status_code if response else 'No response'}")

    def test_get_single_group(self):
        """Test get single group endpoint"""
        print("\n🔍 Testing Get Single Group...")
        if not self.test_group:
            self.log_test("Get Single Group", False, "No test group available")
            return
            
        response = self.make_request('GET', f"groups/{self.test_group['id']}")
        
        if response and response.status_code == 200:
            data = response.json()
            success = data['id'] == self.test_group['id']
            self.log_test("Get Single Group", success, f"Retrieved group: {data.get('name', 'N/A')}")
        else:
            self.log_test("Get Single Group", False, f"Status: {response.status_code if response else 'No response'}")

    def test_join_group(self):
        """Test join group endpoint"""
        print("\n🔍 Testing Join Group...")
        if not self.test_group or not self.test_user:
            self.log_test("Join Group", False, "No test group or user available")
            return
            
        # Create a second user to test joining
        second_user_data = {
            "username": f"testuser2_{datetime.now().strftime('%H%M%S')}",
            "email": f"test2_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "full_name": "Test User 2"
        }
        
        user_response = self.make_request('POST', 'users', data=second_user_data)
        if not user_response or user_response.status_code != 200:
            self.log_test("Join Group", False, "Failed to create second user")
            return
            
        second_user = user_response.json()
        
        # Join the group
        join_data = {'user_id': second_user['id']}
        response = self.make_request('POST', f"groups/{self.test_group['id']}/join", data=join_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'message' in data and 'group_id' in data
            self.log_test("Join Group", success, f"Message: {data.get('message', 'N/A')}")
        else:
            self.log_test("Join Group", False, f"Status: {response.status_code if response else 'No response'}")

    def test_activity_submission(self):
        """Test activity submission endpoint"""
        print("\n🔍 Testing Activity Submission...")
        if not self.test_group or not self.test_user:
            self.log_test("Activity Submission", False, "No test group or user available")
            return
            
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
        
        submission_data = {
            'group_id': self.test_group['id'],
            'challenge_type': 'Daily Steps Challenge',
            'description': 'Completed my daily steps!',
            'user_id': self.test_user['id']
        }
        
        files = {'photo': ('test.png', BytesIO(test_image_data), 'image/png')}
        
        response = self.make_request('POST', 'submissions', data=submission_data, files=files)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['id', 'user_id', 'group_id', 'challenge_type', 'description']
            success = all(field in data for field in required_fields)
            self.log_test("Activity Submission", success, f"Submission ID: {data.get('id', 'N/A')}")
        else:
            self.log_test("Activity Submission", False, f"Status: {response.status_code if response else 'No response'}")

    def test_activity_feed(self):
        """Test activity feed endpoint"""
        print("\n🔍 Testing Activity Feed...")
        if not self.test_user:
            self.log_test("Activity Feed", False, "No test user available")
            return
            
        params = {'user_id': self.test_user['id']}
        response = self.make_request('GET', 'submissions/feed', params=params)
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Activity Feed", success, f"Found {len(data)} activities")
        else:
            self.log_test("Activity Feed", False, f"Status: {response.status_code if response else 'No response'}")

    def test_notifications(self):
        """Test notifications endpoint"""
        print("\n🔍 Testing Notifications...")
        if not self.test_user:
            self.log_test("Notifications", False, "No test user available")
            return
            
        response = self.make_request('GET', f"notifications/{self.test_user['id']}")
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Notifications", success, f"Found {len(data)} notifications")
        else:
            self.log_test("Notifications", False, f"Status: {response.status_code if response else 'No response'}")

    def test_weekly_rankings(self):
        """Test weekly rankings endpoint"""
        print("\n🔍 Testing Weekly Rankings...")
        response = self.make_request('GET', 'rankings/weekly')
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Weekly Rankings", success, f"Found {len(data)} rankings")
        else:
            self.log_test("Weekly Rankings", False, f"Status: {response.status_code if response else 'No response'}")

    def test_alltime_rankings(self):
        """Test all-time rankings endpoint"""
        print("\n🔍 Testing All-time Rankings...")
        response = self.make_request('GET', 'rankings/alltime')
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("All-time Rankings", success, f"Found {len(data)} rankings")
        else:
            self.log_test("All-time Rankings", False, f"Status: {response.status_code if response else 'No response'}")

    def test_achievements(self):
        """Test achievements endpoint"""
        print("\n🔍 Testing Achievements...")
        if not self.test_user:
            self.log_test("Achievements", False, "No test user available")
            return
            
        response = self.make_request('GET', f"achievements/{self.test_user['id']}")
        
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Achievements", success, f"Found {len(data)} achievements")
        else:
            self.log_test("Achievements", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ACTIFY Backend API Tests")
        print(f"Testing against: {self.api_url}")
        print("=" * 50)
        
        # Test sequence
        self.test_health_check()
        self.test_user_creation()
        self.test_user_login()
        self.test_get_user()
        self.test_group_creation()
        self.test_get_groups()
        self.test_get_single_group()
        self.test_join_group()
        self.test_activity_submission()
        self.test_activity_feed()
        self.test_notifications()
        self.test_weekly_rankings()
        self.test_alltime_rankings()
        self.test_achievements()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed.")
            return 1

def main():
    """Main test runner"""
    tester = ACTIFYAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())