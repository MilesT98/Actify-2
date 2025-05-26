import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility Functions
const getAvatarColor = (username) => {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FCEA2B", "#FF9F43", "#6C5CE7", "#FD79A8"];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
};

const formatTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Auth Components
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('handleSubmit triggered');
    console.log('API URL:', API);
    console.log('Form data:', formData);

    try {
      if (isLogin) {
        console.log('Attempting login...');
        const response = await axios.post(`${API}/login`, {
          username: formData.username,
          password: formData.password
        });
        console.log('Login response:', response.data);
        localStorage.setItem('actify_session', response.data.session_id);
        localStorage.setItem('actify_user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      } else {
        console.log('Attempting signup...');
        const response = await axios.post(`${API}/users`, formData);
        console.log('Signup response:', response.data);
        // Auto-login after signup
        const loginResponse = await axios.post(`${API}/login`, {
          username: formData.username,
          password: formData.password
        });
        console.log('Auto-login response:', loginResponse.data);
        localStorage.setItem('actify_session', loginResponse.data.session_id);
        localStorage.setItem('actify_user', JSON.stringify(loginResponse.data.user));
        onLogin(loginResponse.data.user);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.response?.data?.detail || 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ACTIFY
          </h1>
          <p className="text-gray-600 mt-2">Join the fitness community</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            className={`flex-1 text-center py-2 rounded-md font-medium transition-all ${
              isLogin ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 text-center py-2 rounded-md font-medium transition-all ${
              !isLogin ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </>
          )}
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
      </div>
    </div>
  );
};

// Camera Component
const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1080 },
          ...(isIOS && { frameRate: { max: 30 } })
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsReady(true);
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access denied or not available');
      onClose();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
        >
          ✕
        </button>
      </div>
      
      <div className="bg-black p-6 flex justify-center">
        <button
          onClick={capturePhoto}
          disabled={!isReady}
          className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-50"
        />
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = ({ activeTab, setActiveTab, notifications }) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const tabs = [
    { id: 'feed', icon: '🏠', label: 'Feed' },
    { id: 'groups', icon: '👥', label: 'Groups' },
    { id: 'rankings', icon: '🏆', label: 'Rankings' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', badge: unreadCount },
    { id: 'achievements', icon: '🎯', label: 'Achievements' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around py-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 relative ${
              activeTab === tab.id ? 'text-purple-600' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs mt-1">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Feed Component
const FeedScreen = ({ user }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);

  useEffect(() => {
    loadFeed();
    loadUserGroups();
  }, [user]);

  const loadFeed = async () => {
    try {
      const response = await axios.get(`${API}/submissions/feed?user_id=${user.id}`);
      setFeed(response.data);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
    setLoading(false);
  };

  const loadUserGroups = async () => {
    try {
      const groupPromises = user.groups.map(groupId => 
        axios.get(`${API}/groups/${groupId}`)
      );
      const responses = await Promise.all(groupPromises);
      setUserGroups(responses.map(r => r.data));
    } catch (error) {
      console.error('Failed to load user groups:', error);
    }
  };

  const handlePhotoCapture = (photoBlob) => {
    setShowCamera(false);
    setShowSubmissionForm(true);
    // Store photo for submission
    window.capturedPhoto = photoBlob;
  };

  const SubmissionForm = () => {
    const [description, setDescription] = useState('');
    const [challengeType, setChallengeType] = useState('Daily Steps Challenge');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedGroup) {
        alert('Please select a group first');
        return;
      }

      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('group_id', selectedGroup.id);
        formData.append('challenge_type', challengeType);
        formData.append('description', description);
        formData.append('user_id', user.id);
        
        if (window.capturedPhoto) {
          formData.append('photo', window.capturedPhoto, 'activity.jpg');
        }

        await axios.post(`${API}/submissions`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setShowSubmissionForm(false);
        setDescription('');
        window.capturedPhoto = null;
        loadFeed();
        alert('Activity submitted successfully!');
      } catch (error) {
        console.error('Failed to submit activity:', error);
        alert('Failed to submit activity');
      }
      setSubmitting(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-6">
          <h3 className="text-xl font-bold mb-4">Submit Activity</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Group</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={selectedGroup?.id || ''}
                onChange={(e) => {
                  const group = userGroups.find(g => g.id === e.target.value);
                  setSelectedGroup(group);
                }}
                required
              >
                <option value="">Choose a group...</option>
                {userGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Challenge Type</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={challengeType}
                onChange={(e) => setChallengeType(e.target.value)}
              >
                <option>Daily Steps Challenge</option>
                <option>Workout Challenge</option>
                <option>Nutrition Challenge</option>
                <option>Meditation Challenge</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows="3"
                placeholder="Tell us about your activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmissionForm(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">ACTIFY</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCamera(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              📷 Take Photo
            </button>
            <button
              onClick={() => {
                if (userGroups.length === 0) {
                  alert('Join a group first to submit activities!');
                  return;
                }
                setShowSubmissionForm(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              ➕ Submit Activity
            </button>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="p-4 space-y-4">
        {feed.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Activities Yet</h3>
            <p className="text-gray-600 mb-6">Join groups and start sharing your fitness journey!</p>
          </div>
        ) : (
          feed.map(submission => (
            <div key={submission.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getAvatarColor(submission.username) }}
                  >
                    {submission.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">{submission.username}</p>
                    <p className="text-sm text-gray-500">{formatTimeAgo(submission.created_at)}</p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    {submission.challenge_type}
                  </span>
                </div>
                
                <p className="text-gray-800 mb-3">{submission.description}</p>
                
                {submission.photo_data && (
                  <img
                    src={`data:image/jpeg;base64,${submission.photo_data}`}
                    alt="Activity"
                    className="w-full h-64 object-cover rounded-lg mb-3"
                  />
                )}
                
                <div className="flex items-center gap-4 text-gray-500">
                  <button className="flex items-center gap-1 hover:text-red-500">
                    ❤️ {submission.votes}
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-500">
                    💬 Comment
                  </button>
                  <button className="flex items-center gap-1 hover:text-green-500">
                    🔥 Motivate
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showSubmissionForm && <SubmissionForm />}
    </div>
  );
};

// Groups Component
const GroupsScreen = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    loadGroups();
    loadUserGroups();
  }, [user]);

  const loadGroups = async () => {
    try {
      const response = await axios.get(`${API}/groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
    setLoading(false);
  };

  const loadUserGroups = async () => {
    try {
      const groupPromises = user.groups.map(groupId => 
        axios.get(`${API}/groups/${groupId}`)
      );
      const responses = await Promise.all(groupPromises);
      setUserGroups(responses.map(r => r.data));
    } catch (error) {
      console.error('Failed to load user groups:', error);
    }
  };

  const CreateGroupForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      category: 'fitness',
      is_public: true
    });
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setCreating(true);
      
      try {
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
          submitData.append(key, formData[key]);
        });
        submitData.append('user_id', user.id);

        await axios.post(`${API}/groups`, submitData);
        setShowCreateForm(false);
        setFormData({ name: '', description: '', category: 'fitness', is_public: true });
        loadGroups();
        loadUserGroups();
        alert('Group created successfully!');
      } catch (error) {
        console.error('Failed to create group:', error);
        alert('Failed to create group');
      }
      setCreating(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-6">
          <h3 className="text-xl font-bold mb-4">Create New Group</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Group Name"
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <textarea
              placeholder="Description"
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="fitness">Fitness</option>
              <option value="nutrition">Nutrition</option>
              <option value="wellness">Wellness</option>
              <option value="sports">Sports</option>
            </select>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const joinGroup = async (groupId) => {
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      
      await axios.post(`${API}/groups/${groupId}/join`, formData);
      loadGroups();
      loadUserGroups();
      alert('Joined group successfully!');
    } catch (error) {
      console.error('Failed to join group:', error);
      alert(error.response?.data?.detail || 'Failed to join group');
    }
  };

  const joinGroupById = async () => {
    if (!joinGroupId.trim()) return;
    await joinGroup(joinGroupId.trim());
    setJoinGroupId('');
    setShowJoinForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">Groups</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinForm(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              Join by ID
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              ➕ Create
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* My Groups */}
        {userGroups.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">My Groups</h2>
            <div className="space-y-3">
              {userGroups.map(group => (
                <div key={group.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{group.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{group.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👥 {group.member_count} members</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {group.category}
                        </span>
                      </div>
                      {group.current_challenge && (
                        <div className="mt-2 text-sm text-purple-600 font-medium">
                          🎯 {group.current_challenge}
                        </div>
                      )}
                    </div>
                    <div className="text-green-600 font-bold">✓ Joined</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Groups */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Discover Groups</h2>
          <div className="space-y-3">
            {groups.filter(group => !user.groups.includes(group.id)).map(group => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{group.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{group.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>👥 {group.member_count} members</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        {group.category}
                      </span>
                    </div>
                    {group.current_challenge && (
                      <div className="mt-2 text-sm text-purple-600 font-medium">
                        🎯 {group.current_challenge}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      ID: {group.id}
                    </div>
                  </div>
                  <button
                    onClick={() => joinGroup(group.id)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreateForm && <CreateGroupForm />}
      
      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Join Group by ID</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter Group ID"
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={joinGroupById}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Rankings Component
const RankingsScreen = () => {
  const [weeklyRankings, setWeeklyRankings] = useState([]);
  const [alltimeRankings, setAlltimeRankings] = useState([]);
  const [activeTab, setActiveTab] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const [weeklyResponse, alltimeResponse] = await Promise.all([
        axios.get(`${API}/rankings/weekly`),
        axios.get(`${API}/rankings/alltime`)
      ]);
      setWeeklyRankings(weeklyResponse.data);
      setAlltimeRankings(alltimeResponse.data);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    }
    setLoading(false);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const currentRankings = activeTab === 'weekly' ? weeklyRankings : alltimeRankings;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <h1 className="text-2xl font-bold text-purple-600">Rankings</h1>
        
        <div className="flex rounded-lg bg-gray-100 p-1 mt-4">
          <button
            className={`flex-1 text-center py-2 rounded-md font-medium transition-all ${
              activeTab === 'weekly' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('weekly')}
          >
            This Week
          </button>
          <button
            className={`flex-1 text-center py-2 rounded-md font-medium transition-all ${
              activeTab === 'alltime' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('alltime')}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="p-4">
        {currentRankings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Rankings Yet</h3>
            <p className="text-gray-600">Start completing activities to see rankings!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentRankings.map((ranking, index) => (
              <div
                key={ranking.user_id}
                className={`rounded-xl p-4 border ${
                  ranking.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold">
                      {getRankIcon(ranking.rank)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{ranking.username}</h3>
                      <p className="text-sm text-gray-600">
                        {ranking.activity_count} activities
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      #{ranking.rank}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Notifications Component
const NotificationsScreen = ({ user, notifications, setNotifications }) => {
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <h1 className="text-2xl font-bold text-purple-600">Notifications</h1>
      </div>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border cursor-pointer ${
                  notification.read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full ml-3 mt-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Achievements Component
const AchievementsScreen = ({ user }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const loadAchievements = async () => {
    try {
      const response = await axios.get(`${API}/achievements/${user.id}`);
      setAchievements(response.data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <h1 className="text-2xl font-bold text-purple-600">Achievements</h1>
      </div>

      <div className="p-4">
        {achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Achievements Yet</h3>
            <p className="text-gray-600">Start completing activities to unlock achievements!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {achievements.map(achievement => (
              <div
                key={achievement.id}
                className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {achievement.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-purple-600">
                      Unlocked {formatTimeAgo(achievement.unlocked_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('actify_user');
    const savedSession = localStorage.getItem('actify_session');
    
    if (savedUser && savedSession) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/notifications/${user.id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('actify_user');
    localStorage.removeItem('actify_session');
    setUser(null);
    setActiveTab('feed');
    setNotifications([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading ACTIFY...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-lg text-sm z-50"
        >
          Logout
        </button>

        {/* Main Content */}
        <div className="max-w-md mx-auto bg-white min-h-screen relative">
          <Routes>
            <Route path="/" element={
              <>
                {activeTab === 'feed' && <FeedScreen user={user} />}
                {activeTab === 'groups' && <GroupsScreen user={user} />}
                {activeTab === 'rankings' && <RankingsScreen />}
                {activeTab === 'notifications' && (
                  <NotificationsScreen 
                    user={user} 
                    notifications={notifications}
                    setNotifications={setNotifications}
                  />
                )}
                {activeTab === 'achievements' && <AchievementsScreen user={user} />}
                
                <Navigation 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab}
                  notifications={notifications}
                />
              </>
            } />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
