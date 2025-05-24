import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Context for global state management
const AppContext = React.createContext();

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};
const setStorageItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initial data
const GLOBAL_ACTIVITIES = [
  "Take a photo of yourself exercising",
  "Show your healthy meal of the day",
  "Capture yourself reading a book",
  "Document your morning routine",
  "Share your workspace setup",
  "Show yourself being creative",
  "Capture a moment of relaxation"
];

const DEFAULT_GROUPS = [
  {
    id: 'fitness-crew',
    name: 'Fitness Crew',
    description: 'Daily fitness challenges',
    members: ['demo-user'],
    customActivity: 'Post your workout selfie!',
    createdBy: 'demo-user'
  },
  {
    id: 'book-club',
    name: 'Book Club',
    description: 'Reading enthusiasts',
    members: ['demo-user'],
    customActivity: 'Share what you\'re reading today',
    createdBy: 'demo-user'
  }
];

// Camera Component
const CameraCapture = ({ onCapture, onClose }) => {
  const frontVideoRef = useRef(null);
  const backVideoRef = useRef(null);
  const [frontStream, setFrontStream] = useState(null);
  const [backStream, setBackStream] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState({ front: null, back: null });
  const [activeCamera, setActiveCamera] = useState('front');

  useEffect(() => {
    startCamera();
    return () => {
      stopAllStreams();
    };
  }, []);

  const startCamera = async () => {
    try {
      const frontStreamObj = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      const backStreamObj = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      setFrontStream(frontStreamObj);
      setBackStream(backStreamObj);
      
      if (frontVideoRef.current) frontVideoRef.current.srcObject = frontStreamObj;
      if (backVideoRef.current) backVideoRef.current.srcObject = backStreamObj;
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopAllStreams = () => {
    if (frontStream) frontStream.getTracks().forEach(track => track.stop());
    if (backStream) backStream.getTracks().forEach(track => track.stop());
  };

  const capturePhoto = (camera) => {
    const video = camera === 'front' ? frontVideoRef.current : backVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedPhotos(prev => ({ ...prev, [camera]: dataURL }));
  };

  const handleSubmit = () => {
    if (capturedPhotos.front && capturedPhotos.back) {
      onCapture(capturedPhotos);
      stopAllStreams();
      onClose();
    } else {
      alert('Please capture both front and back photos!');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-slate-800">
        <button onClick={onClose} className="text-white text-lg">✕</button>
        <h2 className="text-white text-lg font-semibold">Take Photos</h2>
        <button 
          onClick={handleSubmit}
          disabled={!capturedPhotos.front || !capturedPhotos.back}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Submit
        </button>
      </div>

      <div className="flex-1 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          {/* Front Camera */}
          <div className="relative bg-black">
            <video
              ref={frontVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                Front Camera
              </div>
              {capturedPhotos.front && (
                <img src={capturedPhotos.front} alt="Front capture" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={() => capturePhoto('front')}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300"
              >
                {capturedPhotos.front && <span className="text-green-600">✓</span>}
              </button>
            </div>
          </div>

          {/* Back Camera */}
          <div className="relative bg-black">
            <video
              ref={backVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                Back Camera
              </div>
              {capturedPhotos.back && (
                <img src={capturedPhotos.back} alt="Back capture" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={() => capturePhoto('back')}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300"
              >
                {capturedPhotos.back && <span className="text-green-600">✓</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Auth Components
const LoginForm = ({ onLogin, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ email, name: email.split('@')[0] });
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Sign In
        </button>
      </form>
      <p className="text-slate-400 text-center mt-6">
        Don't have an account?{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:text-blue-300">
          Sign up
        </button>
      </p>
    </div>
  );
};

const SignupForm = ({ onSignup, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && name && password) {
      onSignup({ email, name });
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">Join ActivityChallenge</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Create Account
        </button>
      </form>
      <p className="text-slate-400 text-center mt-6">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:text-blue-300">
          Sign in
        </button>
      </p>
    </div>
  );
};

// Main Components
const Navigation = ({ user, onLogout, currentView, setCurrentView }) => {
  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">ActivityChallenge</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentView('feed')}
            className={`px-3 py-2 rounded-lg ${currentView === 'feed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Feed
          </button>
          <button
            onClick={() => setCurrentView('groups')}
            className={`px-3 py-2 rounded-lg ${currentView === 'groups' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Groups
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className={`px-3 py-2 rounded-lg ${currentView === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Rankings
          </button>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white px-3 py-2"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const ActivityFeed = ({ user, submissions, groups, onSubmitActivity, onVote }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  // Get today's global activity
  const today = new Date().toDateString();
  const todayIndex = new Date().getDay();
  const globalActivity = GLOBAL_ACTIVITIES[todayIndex];

  // Calculate time left for submission (24 hours from start of day)
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const timeRemaining = endOfDay.getTime() - now.getTime();
      
      if (timeRemaining > 0) {
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m left to submit`);
      } else {
        setTimeLeft('Submission period ended');
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitActivity = (activityType, activity) => {
    setSelectedActivity({ type: activityType, activity });
    setShowCamera(true);
  };

  const handlePhotoCapture = (photos) => {
    if (selectedActivity) {
      onSubmitActivity({
        type: selectedActivity.type,
        activity: selectedActivity.activity,
        photos,
        timestamp: new Date().toISOString(),
        userId: user.id
      });
    }
    setShowCamera(false);
    setSelectedActivity(null);
  };

  // Check if user has submitted today
  const todaySubmissions = submissions.filter(s => 
    s.userId === user.id && new Date(s.timestamp).toDateString() === today
  );

  const hasSubmittedGlobal = todaySubmissions.some(s => s.type === 'global');
  const submittedGroupIds = todaySubmissions.filter(s => s.type === 'group').map(s => s.groupId);

  return (
    <div className="space-y-6">
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Time Left Indicator */}
      <div className="bg-blue-900 border border-blue-700 rounded-xl p-4 text-center">
        <p className="text-blue-200 font-semibold">{timeLeft}</p>
      </div>

      {/* Global Activity */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">🌍 Global Challenge</h3>
            <p className="text-slate-300">{globalActivity}</p>
          </div>
          {!hasSubmittedGlobal && (
            <button
              onClick={() => handleSubmitActivity('global', globalActivity)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Submit
            </button>
          )}
        </div>
        {hasSubmittedGlobal && (
          <div className="text-green-400 flex items-center">
            <span className="mr-2">✓</span>
            Submitted today!
          </div>
        )}
      </div>

      {/* Group Activities */}
      {groups.filter(g => g.members.includes(user.id)).map(group => (
        <div key={group.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">👥 {group.name}</h3>
              <p className="text-slate-300">{group.customActivity}</p>
            </div>
            {!submittedGroupIds.includes(group.id) && (
              <button
                onClick={() => handleSubmitActivity('group', group.customActivity, group.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Submit
              </button>
            )}
          </div>
          {submittedGroupIds.includes(group.id) && (
            <div className="text-green-400 flex items-center">
              <span className="mr-2">✓</span>
              Submitted today!
            </div>
          )}
        </div>
      ))}

      {/* Recent Submissions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Recent Submissions</h3>
        {submissions.slice(0, 10).map(submission => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            currentUser={user}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
};

const SubmissionCard = ({ submission, currentUser, onVote }) => {
  const [selectedPhoto, setSelectedPhoto] = useState('front');
  const userVote = submission.votes?.find(v => v.userId === currentUser.id);

  const handleVote = (rating) => {
    onVote(submission.id, rating);
  };

  const averageRating = submission.votes?.length > 0 
    ? (submission.votes.reduce((sum, vote) => sum + vote.rating, 0) / submission.votes.length).toFixed(1)
    : 0;

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-white font-semibold">{submission.userName}</h4>
          <p className="text-slate-400 text-sm">{submission.activity}</p>
          <p className="text-slate-500 text-xs">{new Date(submission.timestamp).toLocaleString()}</p>
        </div>
        <div className="text-yellow-400 flex items-center">
          <span className="mr-1">⭐</span>
          <span>{averageRating}</span>
          <span className="text-slate-500 ml-1">({submission.votes?.length || 0})</span>
        </div>
      </div>

      {/* Photo Display */}
      <div className="mb-4">
        <div className="flex space-x-2 mb-2">
          <button
            onClick={() => setSelectedPhoto('front')}
            className={`px-3 py-1 rounded-lg text-sm ${selectedPhoto === 'front' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Front
          </button>
          <button
            onClick={() => setSelectedPhoto('back')}
            className={`px-3 py-1 rounded-lg text-sm ${selectedPhoto === 'back' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Back
          </button>
        </div>
        <div className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden">
          <img
            src={submission.photos[selectedPhoto]}
            alt={`${selectedPhoto} view`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Voting */}
      {submission.userId !== currentUser.id && (
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Rate this submission:</span>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => handleVote(rating)}
                className={`text-xl ${
                  userVote?.rating >= rating || (!userVote && rating <= 3)
                    ? 'text-yellow-400' 
                    : 'text-slate-600'
                } hover:text-yellow-300`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GroupsView = ({ user, groups, onCreateGroup, onJoinGroup }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', customActivity: '' });
  const [joinCode, setJoinCode] = useState('');

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroup.name && newGroup.description && newGroup.customActivity) {
      onCreateGroup({
        ...newGroup,
        id: generateId(),
        members: [user.id],
        createdBy: user.id
      });
      setNewGroup({ name: '', description: '', customActivity: '' });
      setShowCreateForm(false);
    }
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    if (joinCode) {
      onJoinGroup(joinCode);
      setJoinCode('');
    }
  };

  const userGroups = groups.filter(g => g.members.includes(user.id));
  const availableGroups = groups.filter(g => !g.members.includes(user.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Groups</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Create Group
        </button>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input
                type="text"
                placeholder="Group Name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <textarea
                placeholder="Group Description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none h-20"
                required
              />
              <input
                type="text"
                placeholder="Custom Daily Activity"
                value={newGroup.customActivity}
                onChange={(e) => setNewGroup({...newGroup, customActivity: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Join a Group</h3>
        <form onSubmit={handleJoinGroup} className="flex space-x-3">
          <input
            type="text"
            placeholder="Enter group ID"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Join
          </button>
        </form>
      </div>

      {/* Your Groups */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Your Groups</h3>
        <div className="grid gap-4">
          {userGroups.map(group => (
            <div key={group.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-white">{group.name}</h4>
                  <p className="text-slate-400">{group.description}</p>
                </div>
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-sm">
                  {group.members.length} members
                </span>
              </div>
              <div className="bg-slate-700 rounded-lg p-3 mb-3">
                <p className="text-slate-300 text-sm">Today's Challenge:</p>
                <p className="text-white">{group.customActivity}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Group ID: {group.id}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(group.id)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Copy ID
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Groups */}
      {availableGroups.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Discover Groups</h3>
          <div className="grid gap-4">
            {availableGroups.map(group => (
              <div key={group.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{group.name}</h4>
                    <p className="text-slate-400">{group.description}</p>
                  </div>
                  <button
                    onClick={() => onJoinGroup(group.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Join
                  </button>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <p className="text-slate-300 text-sm">Daily Challenge:</p>
                  <p className="text-white">{group.customActivity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Leaderboard = ({ submissions, groups, user }) => {
  // Calculate user scores
  const userScores = {};
  
  submissions.forEach(submission => {
    if (!userScores[submission.userId]) {
      userScores[submission.userId] = {
        userId: submission.userId,
        userName: submission.userName,
        totalPoints: 0,
        submissions: 0,
        averageRating: 0,
        streak: 0
      };
    }
    
    const userScore = userScores[submission.userId];
    userScore.submissions++;
    
    if (submission.votes && submission.votes.length > 0) {
      const avgRating = submission.votes.reduce((sum, vote) => sum + vote.rating, 0) / submission.votes.length;
      userScore.totalPoints += avgRating * 10; // 10 points per star
      userScore.averageRating = ((userScore.averageRating * (userScore.submissions - 1)) + avgRating) / userScore.submissions;
    }
  });

  // Calculate streaks (simplified - consecutive days with submissions)
  Object.values(userScores).forEach(userScore => {
    const userSubmissions = submissions.filter(s => s.userId === userScore.userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let submission of userSubmissions) {
      const submissionDate = new Date(submission.timestamp);
      submissionDate.setHours(0, 0, 0, 0);
      
      if (submissionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    userScore.streak = streak;
  });

  const sortedUsers = Object.values(userScores)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
      
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4">🏆 Top Performers</h3>
        <div className="space-y-3">
          {sortedUsers.slice(0, 10).map((userScore, index) => (
            <div 
              key={userScore.userId}
              className={`flex items-center justify-between p-4 rounded-lg ${
                userScore.userId === user.id ? 'bg-blue-900 border border-blue-700' : 'bg-slate-700'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-white font-semibold">{userScore.userName}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span>🔥 {userScore.streak} day streak</span>
                    <span>📸 {userScore.submissions} submissions</span>
                    <span>⭐ {userScore.averageRating.toFixed(1)} avg rating</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{Math.round(userScore.totalPoints)}</p>
                <p className="text-sm text-slate-400">points</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Rank */}
      {user && userScores[user.id] && (
        <div className="bg-blue-900 border border-blue-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                #{sortedUsers.findIndex(u => u.userId === user.id) + 1}
              </p>
              <p className="text-blue-200 text-sm">Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {Math.round(userScores[user.id].totalPoints)}
              </p>
              <p className="text-blue-200 text-sm">Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {userScores[user.id].streak}
              </p>
              <p className="text-blue-200 text-sm">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {userScores[user.id].averageRating.toFixed(1)}
              </p>
              <p className="text-blue-200 text-sm">Avg Rating</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  // State management
  const [user, setUser] = useState(getStorageItem('user'));
  const [isLogin, setIsLogin] = useState(true);
  const [currentView, setCurrentView] = useState('feed');
  const [groups, setGroups] = useState(getStorageItem('groups', DEFAULT_GROUPS));
  const [submissions, setSubmissions] = useState(getStorageItem('submissions', []));

  // Save to localStorage when state changes
  useEffect(() => {
    if (user) setStorageItem('user', user);
  }, [user]);

  useEffect(() => {
    setStorageItem('groups', groups);
  }, [groups]);

  useEffect(() => {
    setStorageItem('submissions', submissions);
  }, [submissions]);

  // Polling for real-time updates (simulated)
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        // In a real app, this would fetch from a server
        // For now, we'll just trigger a re-render to update time-based elements
        setSubmissions(prev => [...prev]);
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  // Auth handlers
  const handleLogin = (userData) => {
    const userWithId = { ...userData, id: generateId() };
    setUser(userWithId);
  };

  const handleSignup = (userData) => {
    const userWithId = { ...userData, id: generateId() };
    setUser(userWithId);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setCurrentView('feed');
  };

  // Group handlers
  const handleCreateGroup = (groupData) => {
    setGroups(prev => [...prev, groupData]);
  };

  const handleJoinGroup = (groupId) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId && !group.members.includes(user.id)
        ? { ...group, members: [...group.members, user.id] }
        : group
    ));
  };

  // Activity submission handler
  const handleSubmitActivity = (activityData) => {
    const submission = {
      id: generateId(),
      ...activityData,
      userName: user.name,
      votes: [],
      timestamp: new Date().toISOString()
    };
    
    setSubmissions(prev => [submission, ...prev]);
  };

  // Voting handler
  const handleVote = (submissionId, rating) => {
    setSubmissions(prev => prev.map(submission => {
      if (submission.id === submissionId) {
        const existingVoteIndex = submission.votes.findIndex(v => v.userId === user.id);
        const newVotes = [...submission.votes];
        
        if (existingVoteIndex >= 0) {
          newVotes[existingVoteIndex] = { userId: user.id, rating };
        } else {
          newVotes.push({ userId: user.id, rating });
        }
        
        return { ...submission, votes: newVotes };
      }
      return submission;
    }));
  };

  // Render auth screens
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <img 
              src="https://images.unsplash.com/photo-1511988617509-a57c8a288659?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmaXRuZXNzfGVufDB8fHxibHVlfDE3NDgwODI2MDR8MA&ixlib=rb-4.1.0&q=85" 
              alt="Community" 
              className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-blue-500"
            />
            <h1 className="text-4xl font-bold text-white">ActivityChallenge</h1>
            <p className="text-xl text-slate-300">Join the daily activity challenge community</p>
          </div>
          
          {isLogin ? (
            <LoginForm onLogin={handleLogin} onSwitch={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSignup={handleSignup} onSwitch={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation 
        user={user} 
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      
      <main className="max-w-4xl mx-auto p-4">
        {currentView === 'feed' && (
          <ActivityFeed
            user={user}
            submissions={submissions}
            groups={groups}
            onSubmitActivity={handleSubmitActivity}
            onVote={handleVote}
          />
        )}
        
        {currentView === 'groups' && (
          <GroupsView
            user={user}
            groups={groups}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
          />
        )}
        
        {currentView === 'leaderboard' && (
          <Leaderboard
            submissions={submissions}
            groups={groups}
            user={user}
          />
        )}
      </main>
    </div>
  );
}

export default App;