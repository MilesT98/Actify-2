import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Context for global state management
const AppContext = React.createContext();

// Device detection utilities
const isMobileDevice = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

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

// Time formatting utility
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return time.toLocaleDateString();
};

// Week management utilities
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getWeekEnd = (date = new Date()) => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

const getWeekKey = (date = new Date()) => {
  const weekStart = getWeekStart(date);
  return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() - weekStart.getDay() + 1) / 7)}`;
};

const isCurrentWeek = (timestamp) => {
  const submissionWeek = getWeekKey(new Date(timestamp));
  const currentWeek = getWeekKey();
  return submissionWeek === currentWeek;
};

// Generate avatar color based on name
const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-yellow-600', 
    'bg-red-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600'
  ];
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Initial data
const GLOBAL_ACTIVITIES = [
  "Take a photo of yourself exercising 💪",
  "Show your healthy meal of the day 🥗",
  "Capture yourself reading a book 📚",
  "Document your morning routine ☀️",
  "Share your workspace setup 💻",
  "Show yourself being creative 🎨",
  "Capture a moment of relaxation 🧘"
];

const DEFAULT_USERS = [
  { id: 'demo-user-1', name: 'Alex Chen', email: 'alex@example.com' },
  { id: 'demo-user-2', name: 'Sarah Johnson', email: 'sarah@example.com' },
  { id: 'demo-user-3', name: 'Mike Rodriguez', email: 'mike@example.com' },
  { id: 'demo-user-4', name: 'Emma Wilson', email: 'emma@example.com' }
];

const DEFAULT_GROUPS = [
  {
    id: 'fitness-crew',
    name: 'Fitness Crew',
    description: 'Daily fitness challenges for health enthusiasts',
    members: ['demo-user-1', 'demo-user-2'],
    currentChallenge: 'Post your workout selfie! 💪',
    nextWeekChallenges: [
      { id: 'ch1', challenge: 'Try a new exercise routine 🏃', submittedBy: 'demo-user-1', votes: ['demo-user-2'] },
      { id: 'ch2', challenge: 'Healthy meal prep Sunday 🥗', submittedBy: 'demo-user-2', votes: ['demo-user-1'] }
    ],
    challengeSubmissionDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'demo-user-1',
    memberCount: 247,
    isPublic: true
  },
  {
    id: 'book-club',
    name: 'Book Club',
    description: 'Reading enthusiasts sharing daily progress',
    members: ['demo-user-1', 'demo-user-3'],
    currentChallenge: 'Share what you\'re reading today 📖',
    nextWeekChallenges: [
      { id: 'ch3', challenge: 'Show your book collection 📚', submittedBy: 'demo-user-3', votes: ['demo-user-1'] },
      { id: 'ch4', challenge: 'Read in a new location 🌳', submittedBy: 'demo-user-1', votes: [] }
    ],
    challengeSubmissionDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'demo-user-1',
    memberCount: 156,
    isPublic: true
  },
  {
    id: 'mindful-moments',
    name: 'Mindful Moments',
    description: 'Daily mindfulness and meditation practice',
    members: ['demo-user-4'],
    currentChallenge: 'Share your moment of peace today 🧘‍♀️',
    nextWeekChallenges: [],
    challengeSubmissionDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'demo-user-4',
    memberCount: 89,
    isPublic: true
  }
];

// Generate demo submissions
const generateDemoSubmissions = () => {
  const submissions = [];
  const activities = [
    'Post your workout selfie! 💪',
    'Share what you\'re reading today 📖',
    'Take a photo of yourself exercising 💪',
    'Show your healthy meal of the day 🥗'
  ];
  
  DEFAULT_USERS.forEach((user, userIndex) => {
    for (let i = 0; i < 2; i++) {
      submissions.push({
        id: `demo-${user.id}-${i}`,
        userId: user.id,
        userName: user.name,
        type: i === 0 ? 'global' : 'group',
        groupId: i === 1 ? DEFAULT_GROUPS[userIndex % DEFAULT_GROUPS.length].id : null,
        activity: activities[userIndex % activities.length],
        photos: {
          front: `https://images.unsplash.com/photo-${1500000000 + userIndex * 1000 + i}?w=400&h=300&fit=crop`,
          back: `https://images.unsplash.com/photo-${1500000001 + userIndex * 1000 + i}?w=400&h=300&fit=crop`
        },
        timestamp: new Date(Date.now() - (userIndex * 3600000) - (i * 1800000)).toISOString(),
        votes: Array.from({length: Math.floor(Math.random() * 5)}, (_, vIndex) => ({
          userId: `voter-${vIndex}`,
          rating: Math.floor(Math.random() * 5) + 1
        })),
        reactions: Array.from({length: Math.floor(Math.random() * 3)}, (_, rIndex) => ({
          userId: `reactor-${rIndex}`,
          emoji: ['❤️', '🔥', '👏'][rIndex % 3]
        }))
      });
    }
    
    for (let i = 0; i < 3; i++) {
      submissions.push({
        id: `demo-prev-${user.id}-${i}`,
        userId: user.id,
        userName: user.name,
        type: 'global',
        activity: activities[i % activities.length],
        photos: {
          front: `https://images.unsplash.com/photo-${1400000000 + userIndex * 1000 + i}?w=400&h=300&fit=crop`,
          back: `https://images.unsplash.com/photo-${1400000001 + userIndex * 1000 + i}?w=400&h=300&fit=crop`
        },
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - (i * 3600000)).toISOString(),
        votes: Array.from({length: Math.floor(Math.random() * 8)}, (_, vIndex) => ({
          userId: `voter-${vIndex}`,
          rating: Math.floor(Math.random() * 5) + 1
        })),
        reactions: Array.from({length: Math.floor(Math.random() * 5)}, (_, rIndex) => ({
          userId: `reactor-${rIndex}`,
          emoji: ['❤️', '🔥', '👏', '😮', '😂'][rIndex % 5]
        }))
      });
    }
  });
  
  return submissions;
};

const ACHIEVEMENTS = [
  { id: 'first-post', name: 'First Steps', description: 'Share your first activity', icon: '🌟' },
  { id: 'streak-3', name: 'Getting Consistent', description: '3-day streak', icon: '🔥' },
  { id: 'streak-7', name: 'Week Warrior', description: '7-day streak', icon: '⚡' },
  { id: 'popular-post', name: 'Crowd Favorite', description: 'Get 10+ votes', icon: '❤️' },
  { id: 'group-creator', name: 'Community Builder', description: 'Create your first group', icon: '👥' },
  { id: 'helpful-voter', name: 'Supportive Friend', description: 'Vote on 50+ posts', icon: '🤝' },
  { id: 'weekly-winner', name: 'Weekly Champion', description: 'Top the weekly leaderboard', icon: '👑' },
  { id: 'challenge-creator', name: 'Innovator', description: 'Suggest a winning group challenge', icon: '💡' }
];

// Mobile Camera Component
const MobileCameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState({ front: null, back: null });
  const [currentCamera, setCurrentCamera] = useState('back');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera(currentCamera);
    return () => {
      stopStream();
    };
  }, [currentCamera]);

  const startCamera = async (facingMode) => {
    try {
      setIsLoading(true);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: { 
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedPhotos(prev => ({ ...prev, [currentCamera]: dataURL }));
  };

  const switchCamera = () => {
    setCurrentCamera(prev => prev === 'front' ? 'back' : 'front');
  };

  const handleSubmit = () => {
    if (capturedPhotos.front && capturedPhotos.back) {
      onCapture(capturedPhotos);
      stopStream();
      onClose();
    } else {
      alert('Please capture both front and back photos! 📸');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-slate-900 text-white">
        <button onClick={onClose} className="text-xl p-2">✕</button>
        <h2 className="font-semibold">📷 ACTIFY Camera</h2>
        <button 
          onClick={handleSubmit}
          disabled={!capturedPhotos.front || !capturedPhotos.back}
          className="bg-blue-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Post
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-center">
              <div className="loading-spinner mb-4"></div>
              <p>Loading camera...</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera overlay */}
            <div className="absolute inset-0">
              {/* Camera indicator */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentCamera === 'front' ? '📱 Front' : '🌍 Back'}
              </div>
              
              {/* Preview thumbnails */}
              <div className="absolute top-4 right-4 space-y-2">
                {capturedPhotos.front && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-400">
                    <img src={capturedPhotos.front} alt="Front" className="w-full h-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-green-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">✓</div>
                  </div>
                )}
                {capturedPhotos.back && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-400">
                    <img src={capturedPhotos.back} alt="Back" className="w-full h-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-green-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">✓</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-900 p-6">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="bg-slate-700 text-white p-4 rounded-full"
          >
            🔄
          </button>
          
          {/* Capture Button */}
          <button
            onClick={capturePhoto}
            className="bg-white w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
          >
            {capturedPhotos[currentCamera] ? '✓' : '📷'}
          </button>
          
          {/* Gallery (placeholder) */}
          <button className="bg-slate-700 text-white p-4 rounded-full opacity-50">
            🖼️
          </button>
        </div>
        
        {/* Instructions */}
        <div className="text-center mt-4">
          <p className="text-white text-sm">
            {!capturedPhotos.front && !capturedPhotos.back ? 'Capture front and back photos' :
             !capturedPhotos.front ? 'Switch to front camera' :
             !capturedPhotos.back ? 'Switch to back camera' :
             'Ready to post! 🎉'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Desktop Camera Component (existing)
const DesktopCameraCapture = ({ onCapture, onClose }) => {
  const frontVideoRef = useRef(null);
  const backVideoRef = useRef(null);
  const [frontStream, setFrontStream] = useState(null);
  const [backStream, setBackStream] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState({ front: null, back: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopAllStreams();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsLoading(false);
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
      alert('Please capture both front and back photos! 📸');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <button onClick={onClose} className="text-white text-lg hover:text-red-400 transition-colors">✕</button>
        <h2 className="text-white text-lg font-semibold">📷 Take Your ACTIFY</h2>
        <button 
          onClick={handleSubmit}
          disabled={!capturedPhotos.front || !capturedPhotos.back}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          Share ✨
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="loading-spinner mb-4"></div>
            <p>Accessing cameras...</p>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          <div className="relative bg-black">
            <video
              ref={frontVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
                📱 You
              </div>
              {capturedPhotos.front && (
                <img src={capturedPhotos.front} alt="Front capture" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={() => capturePhoto('front')}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:scale-105 transition-transform flex items-center justify-center"
              >
                {capturedPhotos.front ? <span className="text-green-600 text-xl">✓</span> : <span className="text-gray-600">📷</span>}
              </button>
            </div>
          </div>

          <div className="relative bg-black">
            <video
              ref={backVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
                🌍 World
              </div>
              {capturedPhotos.back && (
                <img src={capturedPhotos.back} alt="Back capture" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={() => capturePhoto('back')}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:scale-105 transition-transform flex items-center justify-center"
              >
                {capturedPhotos.back ? <span className="text-green-600 text-xl">✓</span> : <span className="text-gray-600">📷</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Intro/Onboarding Component
const IntroScreen = ({ onContinue, isMobile }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      icon: "🎯",
      title: "Welcome to ACTIFY",
      description: "Join the authentic activity challenge community. No filters, just real moments.",
      image: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmaXRuZXNzfGVufDB8fHxibHVlfDE3NDgwODI2MDR8MA&ixlib=rb-4.1.0&q=85"
    },
    {
      icon: "📱",
      title: isMobile ? "Mobile Camera Magic" : "Dual Camera Magic",
      description: isMobile ? "Seamlessly switch between front and back cameras to capture your authentic moments!" : "Capture both your perspective and the world around you. Just like BeReal, but for activities!",
      feature: "📷 Front + Back Camera"
    },
    {
      icon: "🌍",
      title: "Global & Group Challenges",
      description: "Join daily global activities and create custom group challenges that refresh weekly!",
      feature: "⏰ Weekly Rotations"
    },
    {
      icon: "👥",
      title: "Community Competition",
      description: "Submit challenge ideas, vote on next week's activities, and climb both weekly and all-time leaderboards!",
      feature: "🏆 Dual Rankings"
    },
    {
      icon: "🎨",
      title: "Create & Connect",
      description: "Build your own communities, suggest challenges, and compete authentically with friends!",
      feature: "⭐ Community Voting"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onContinue();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 z-50 flex items-center justify-center p-4">
      <div className={`bg-slate-800 rounded-2xl p-8 w-full border border-slate-700 shadow-2xl ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
        <div className="text-center space-y-6">
          <div className="flex justify-center space-x-2 mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'bg-blue-500 w-6' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="text-4xl">{slides[currentSlide].icon}</div>
            <h2 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>{slides[currentSlide].title}</h2>
            <p className="text-slate-300 leading-relaxed text-sm">{slides[currentSlide].description}</p>
            
            {slides[currentSlide].image && (
              <img 
                src={slides[currentSlide].image} 
                alt="Community" 
                className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-blue-500"
              />
            )}
            
            {slides[currentSlide].feature && (
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-3">
                <p className="text-blue-200 font-medium text-sm">{slides[currentSlide].feature}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ← Back
            </button>
            
            <span className="text-slate-500 text-xs">
              {currentSlide + 1} of {slides.length}
            </span>
            
            <button
              onClick={nextSlide}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              {currentSlide === slides.length - 1 ? 'Get Started! 🚀' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Bottom Navigation
const MobileBottomNav = ({ currentView, setCurrentView, achievements }) => {
  const unreadAchievements = achievements.filter(a => !a.seen).length;
  
  const navItems = [
    { id: 'feed', icon: '🏠', label: 'Feed' },
    { id: 'groups', icon: '👥', label: 'Groups' },
    { id: 'leaderboard', icon: '🏆', label: 'Rankings' },
    { id: 'achievements', icon: '⭐', label: 'Badges', badge: unreadAchievements }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-2 py-2 z-40">
      <div className="flex justify-around items-center">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`relative flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              currentView === item.id ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Mobile Header
const MobileHeader = ({ user, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-40">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-white">ACTIFY</h1>
          <div className="text-blue-400 text-sm">🎯</div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`w-8 h-8 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-sm font-bold`}
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-slate-700 rounded-lg shadow-lg border border-slate-600 min-w-32">
              <div className="p-3 border-b border-slate-600">
                <p className="text-white font-medium text-sm">{user.name}</p>
                <p className="text-slate-400 text-xs">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-slate-300 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Desktop Navigation (existing)
const DesktopNavigation = ({ user, onLogout, currentView, setCurrentView, achievements }) => {
  const unreadAchievements = achievements.filter(a => !a.seen).length;
  
  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-40">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-white">ACTIFY</h1>
          <div className="text-blue-400 text-sm">🎯</div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentView('feed')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'feed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏠 Feed
          </button>
          <button
            onClick={() => setCurrentView('groups')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'groups' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Groups
          </button>
          <button
            onClick={() => setCurrentView('leaderboard')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Rankings
          </button>
          <button
            onClick={() => setCurrentView('achievements')}
            className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'achievements' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⭐ Badges
            {unreadAchievements > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadAchievements}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-sm font-bold`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white text-sm font-medium hidden md:block">{user.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white px-3 py-2 text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

// Quick Reaction Component
const QuickReactionButton = ({ onReact, reactions, userReaction, isMobile }) => {
  const [showOptions, setShowOptions] = useState(false);
  const reactionEmojis = ['❤️', '🔥', '👏', '😮', '😂'];
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="text-slate-400 hover:text-white transition-colors text-sm flex items-center space-x-1"
      >
        <span>{userReaction || '👍'}</span>
        <span>{reactions?.length || 0}</span>
      </button>
      
      {showOptions && (
        <div className={`absolute bottom-full left-0 mb-2 bg-slate-700 rounded-lg p-2 flex space-x-1 shadow-lg border border-slate-600 ${
          isMobile ? 'scale-110' : ''
        }`}>
          {reactionEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setShowOptions(false);
              }}
              className={`hover:scale-125 transition-transform ${isMobile ? 'text-xl p-1' : 'text-lg'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Auth Components
const AuthForm = ({ isLogin, onLogin, onSignup, onSwitch, onShowIntro, isMobile }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (email && password) {
        onLogin({ email, name: email.split('@')[0] });
      }
    } else {
      if (email && name && password) {
        onSignup({ email, name });
      }
    }
  };

  return (
    <div className={`bg-slate-800 p-8 rounded-2xl shadow-2xl w-full border border-slate-700 ${
      isMobile ? 'max-w-sm' : 'max-w-md'
    }`}>
      <div className="text-center mb-6">
        <h1 className={`font-bold text-white mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
          {isLogin ? 'Welcome to ACTIFY' : 'Join ACTIFY'}
        </h1>
        <p className="text-slate-400 text-sm">
          {isLogin ? 'Authentic activity challenges' : 'Start your activity journey'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      
      <div className="flex justify-center mt-4">
        <button
          onClick={onShowIntro}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          📖 Learn about ACTIFY
        </button>
      </div>
      
      <p className="text-slate-400 text-center mt-6 text-sm">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:text-blue-300 transition-colors">
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
};

// Submission Card Component
const SubmissionCard = ({ submission, currentUser, onVote, onReact, isMobile }) => {
  const [selectedPhoto, setSelectedPhoto] = useState('back');
  const userVote = submission.votes?.find(v => v.userId === currentUser.id);
  const userReaction = submission.reactions?.find(r => r.userId === currentUser.id)?.emoji;

  const handleVote = (rating) => {
    onVote(submission.id, rating);
  };

  const handleReact = (emoji) => {
    onReact(submission.id, emoji);
  };

  const handleDoubleClick = () => {
    if (!userReaction) {
      handleReact('❤️');
    }
  };

  const averageRating = submission.votes?.length > 0 
    ? (submission.votes.reduce((sum, vote) => sum + vote.rating, 0) / submission.votes.length).toFixed(1)
    : 0;

  return (
    <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all ${
      isMobile ? 'mb-4' : 'p-6'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full ${getAvatarColor(submission.userName)} flex items-center justify-center text-white text-sm font-bold`}>
            {submission.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>{submission.userName}</h4>
            <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{submission.activity}</p>
            <div className={`flex items-center space-x-2 text-slate-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <span>{formatTimeAgo(submission.timestamp)}</span>
              {isCurrentWeek(submission.timestamp) && (
                <span className="bg-green-800 text-green-200 px-2 py-1 rounded-full">This Week</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {submission.type === 'global' && <span className="text-blue-400 text-sm">🌍</span>}
          {submission.type === 'group' && <span className="text-green-400 text-sm">👥</span>}
          <div className="text-yellow-400 flex items-center">
            <span className="mr-1">⭐</span>
            <span className={isMobile ? 'text-sm' : ''}>{averageRating}</span>
            <span className={`text-slate-500 ml-1 ${isMobile ? 'text-xs' : ''}`}>({submission.votes?.length || 0})</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex space-x-2 mb-2">
          <button
            onClick={() => setSelectedPhoto('back')}
            className={`px-3 py-1 rounded-lg transition-colors ${isMobile ? 'text-xs' : 'text-sm'} ${
              selectedPhoto === 'back' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            🌍 World
          </button>
          <button
            onClick={() => setSelectedPhoto('front')}
            className={`px-3 py-1 rounded-lg transition-colors ${isMobile ? 'text-xs' : 'text-sm'} ${
              selectedPhoto === 'front' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            📱 You
          </button>
        </div>
        <div className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden" onDoubleClick={handleDoubleClick}>
          <img
            src={submission.photos[selectedPhoto]}
            alt={`${selectedPhoto} view`}
            className="w-full h-full object-cover cursor-pointer"
          />
          {userReaction && (
            <div className={`absolute top-4 right-4 animate-bounce ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {userReaction}
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center ${isMobile ? 'justify-between' : 'justify-between'}`}>
        <div className="flex items-center space-x-4">
          <QuickReactionButton
            onReact={handleReact}
            reactions={submission.reactions}
            userReaction={userReaction}
            isMobile={isMobile}
          />
          <span className={`text-slate-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>Double-tap to ❤️</span>
        </div>
        
        {submission.userId !== currentUser.id && (
          <div className="flex items-center space-x-1">
            {!isMobile && <span className="text-slate-400 text-sm">Rate:</span>}
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => handleVote(rating)}
                className={`hover:scale-110 transition-transform ${isMobile ? 'text-base' : 'text-lg'} ${
                  userVote?.rating >= rating
                    ? 'text-yellow-400' 
                    : 'text-slate-600 hover:text-yellow-300'
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Feed Component
const ActivityFeed = ({ user, submissions, groups, onSubmitActivity, onVote, onReact, isMobile }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [filter, setFilter] = useState('all');

  const today = new Date().toDateString();
  const todayIndex = new Date().getDay();
  const globalActivity = GLOBAL_ACTIVITIES[todayIndex];

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

  const handleSubmitActivity = (activityType, activity, groupId = null) => {
    setSelectedActivity({ type: activityType, activity, groupId });
    setShowCamera(true);
  };

  const handlePhotoCapture = (photos) => {
    if (selectedActivity) {
      onSubmitActivity({
        type: selectedActivity.type,
        activity: selectedActivity.activity,
        groupId: selectedActivity.groupId,
        photos,
        timestamp: new Date().toISOString(),
        userId: user.id
      });
    }
    setShowCamera(false);
    setSelectedActivity(null);
  };

  const todaySubmissions = submissions.filter(s => 
    s.userId === user.id && new Date(s.timestamp).toDateString() === today
  );

  const hasSubmittedGlobal = todaySubmissions.some(s => s.type === 'global');
  const submittedGroupIds = todaySubmissions.filter(s => s.type === 'group').map(s => s.groupId);

  const filteredSubmissions = submissions.filter(submission => {
    if (filter === 'global') return submission.type === 'global';
    if (filter === 'groups') return submission.type === 'group';
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const CameraComponent = isMobile ? MobileCameraCapture : DesktopCameraCapture;

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-20' : ''}`}>
      {showCamera && (
        <CameraComponent
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-700 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl">⏰</span>
          <p className={`text-blue-200 font-semibold ${isMobile ? 'text-sm' : ''}`}>{timeLeft}</p>
        </div>
      </div>

      <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-colors ${isMobile ? '' : 'p-6'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>🌍 Global Challenge</h3>
              <div className={`bg-blue-600 text-white px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>TRENDING</div>
            </div>
            <p className={`text-slate-300 ${isMobile ? 'text-sm' : ''}`}>{globalActivity}</p>
            <p className={`text-slate-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Join thousands of ACTIFY users worldwide!</p>
          </div>
          {!hasSubmittedGlobal && (
            <button
              onClick={() => handleSubmitActivity('global', globalActivity)}
              className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-lg ${
                isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'
              }`}
            >
              🎯 Submit
            </button>
          )}
        </div>
        {hasSubmittedGlobal && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-3 flex items-center">
            <span className="text-green-400 mr-2 text-xl">✓</span>
            <span className={`text-green-300 ${isMobile ? 'text-sm' : ''}`}>Submitted today! Check back tomorrow for a new challenge.</span>
          </div>
        )}
      </div>

      {groups.filter(g => g.members.includes(user.id)).map(group => (
        <div key={group.id} className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-green-500 transition-colors ${isMobile ? '' : 'p-6'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>👥 {group.name}</h3>
                <div className={`bg-green-600 text-white px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>{group.memberCount} members</div>
              </div>
              <p className={`text-slate-300 ${isMobile ? 'text-sm' : ''}`}>{group.currentChallenge}</p>
              <p className={`text-slate-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>This week's challenge • Refreshes Monday</p>
            </div>
            {!submittedGroupIds.includes(group.id) && (
              <button
                onClick={() => handleSubmitActivity('group', group.currentChallenge, group.id)}
                className={`bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-lg ${
                  isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'
                }`}
              >
                📸 Submit
              </button>
            )}
          </div>
          {submittedGroupIds.includes(group.id) && (
            <div className="bg-green-900 border border-green-700 rounded-lg p-3 flex items-center">
              <span className="text-green-400 mr-2 text-xl">✓</span>
              <span className={`text-green-300 ${isMobile ? 'text-sm' : ''}`}>Submitted to {group.name} this week!</span>
            </div>
          )}
        </div>
      ))}

      <div className={`${isMobile ? 'flex overflow-x-auto space-x-2 pb-2' : 'flex space-x-2'} bg-slate-800 p-2 rounded-lg border border-slate-700`}>
        {[
          { id: 'all', label: '🌟 All Posts', count: filteredSubmissions.length },
          { id: 'global', label: '🌍 Global', count: submissions.filter(s => s.type === 'global').length },
          { id: 'groups', label: '👥 Groups', count: submissions.filter(s => s.type === 'group').length }
        ].map(filterOption => (
          <button
            key={filterOption.id}
            onClick={() => setFilter(filterOption.id)}
            className={`${isMobile ? 'flex-shrink-0' : ''} px-4 py-2 rounded-lg font-medium transition-colors ${
              isMobile ? 'text-xs' : 'text-sm'
            } ${
              filter === filterOption.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {filterOption.label} ({filterOption.count})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className={`font-semibold text-white flex items-center space-x-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          <span>📸</span>
          <span>Community Feed</span>
        </h3>
        {filteredSubmissions.slice(0, 20).map(submission => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            currentUser={user}
            onVote={onVote}
            onReact={onReact}
            isMobile={isMobile}
          />
        ))}
        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-4">📭</div>
            <p className={isMobile ? 'text-sm' : ''}>No submissions yet. Be the first to share!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified components for other views (Groups, Leaderboard, Achievements)
// These would need similar mobile optimizations but keeping them simpler for now

const GroupsView = ({ user, groups, onCreateGroup, onJoinGroup, onSubmitGroupChallenge, onVoteGroupChallenge, isMobile }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', customActivity: '', isPublic: true });
  const [joinCode, setJoinCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [challengeInputs, setChallengeInputs] = useState({});

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroup.name && newGroup.description && newGroup.customActivity) {
      onCreateGroup({
        ...newGroup,
        id: generateId(),
        members: [user.id],
        createdBy: user.id,
        memberCount: 1,
        currentChallenge: newGroup.customActivity,
        nextWeekChallenges: [],
        challengeSubmissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      setNewGroup({ name: '', description: '', customActivity: '', isPublic: true });
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

  const handleSubmitChallenge = (groupId) => {
    const challenge = challengeInputs[groupId];
    if (challenge && challenge.trim()) {
      onSubmitGroupChallenge(groupId, challenge.trim());
      setChallengeInputs(prev => ({ ...prev, [groupId]: '' }));
    }
  };

  const userGroups = groups.filter(g => g.members.includes(user.id));
  const availableGroups = groups.filter(g => 
    !g.members.includes(user.id) && 
    g.isPublic &&
    (g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     g.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-20' : ''}`}>
      <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
        <h2 className={`font-bold text-white flex items-center space-x-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          <span>👥</span>
          <span>Groups</span>
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-lg ${
            isMobile ? 'px-4 py-2 text-sm self-start' : 'px-6 py-3'
          }`}
        >
          ➕ Create Group
        </button>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-slate-800 rounded-xl p-6 w-full border border-slate-700 ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
            <h3 className={`font-semibold text-white mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>🎨 Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input
                type="text"
                placeholder="Group Name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <textarea
                placeholder="Group Description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none h-20 resize-none transition-colors"
                required
              />
              <input
                type="text"
                placeholder="First Weekly Challenge"
                value={newGroup.customActivity}
                onChange={(e) => setNewGroup({...newGroup, customActivity: e.target.value})}
                className="w-full p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newGroup.isPublic}
                  onChange={(e) => setNewGroup({...newGroup, isPublic: e.target.checked})}
                  className="rounded text-blue-500"
                />
                <label htmlFor="isPublic" className="text-slate-300 text-sm">Make group public</label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Create 🎉
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group */}
      <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${isMobile ? '' : 'p-6'}`}>
        <h3 className={`font-semibold text-white mb-4 flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <span>🔗</span>
          <span>Join a Group</span>
        </h3>
        <form onSubmit={handleJoinGroup} className={`flex ${isMobile ? 'flex-col space-y-3' : 'space-x-3'}`}>
          <input
            type="text"
            placeholder="Enter group ID"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 p-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className={`bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all hover:scale-105 ${
              isMobile ? 'px-4 py-3 text-sm' : 'px-6 py-3'
            }`}
          >
            Join 🚀
          </button>
        </form>
      </div>

      {/* Your Groups */}
      <div>
        <h3 className={`font-semibold text-white mb-4 flex items-center space-x-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          <span>🏠</span>
          <span>Your Groups ({userGroups.length})</span>
        </h3>
        <div className={`grid gap-4 ${isMobile ? '' : ''}`}>
          {userGroups.map(group => {
            const deadlineDate = new Date(group.challengeSubmissionDeadline);
            const daysLeft = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
            const userAlreadySubmitted = group.nextWeekChallenges?.some(ch => ch.submittedBy === user.id);
            
            return (
              <div key={group.id} className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-colors group-card ${isMobile ? '' : 'p-6'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>{group.name}</h4>
                    <p className={`text-slate-400 ${isMobile ? 'text-sm' : ''}`}>{group.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`bg-slate-700 text-slate-300 px-3 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      👥 {group.memberCount}
                    </span>
                    {group.createdBy === user.id && (
                      <span className={`bg-yellow-600 text-white px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>ADMIN</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <p className={`text-slate-300 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>This Week's Challenge:</p>
                  <p className={`text-white font-medium ${isMobile ? 'text-sm' : ''}`}>{group.currentChallenge}</p>
                </div>

                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>💡 Next Week's Challenge Ideas</h5>
                    <span className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>{daysLeft} days to submit</span>
                  </div>
                  
                  {!userAlreadySubmitted && (
                    <div className={`flex mb-3 ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
                      <input
                        type="text"
                        placeholder="Suggest a challenge for next week..."
                        value={challengeInputs[group.id] || ''}
                        onChange={(e) => setChallengeInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                        className="flex-1 p-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => handleSubmitChallenge(group.id)}
                        disabled={!challengeInputs[group.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {group.nextWeekChallenges?.map(challenge => (
                      <div key={challenge.id} className="bg-slate-800 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className={`text-white ${isMobile ? 'text-sm' : 'text-sm'}`}>{challenge.challenge}</p>
                          <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>by {challenge.submittedBy === user.id ? 'You' : challenge.submittedBy}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-yellow-400 ${isMobile ? 'text-sm' : 'text-sm'}`}>👍 {challenge.votes?.length || 0}</span>
                          {challenge.submittedBy !== user.id && !challenge.votes?.includes(user.id) && (
                            <button
                              onClick={() => onVoteGroupChallenge(group.id, challenge.id)}
                              className={`bg-green-600 hover:bg-green-700 text-white rounded ${isMobile ? 'px-2 py-1 text-xs' : 'px-2 py-1 text-xs'}`}
                            >
                              Vote
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!group.nextWeekChallenges || group.nextWeekChallenges.length === 0) && (
                      <p className={`text-slate-500 text-center py-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>No challenges submitted yet. Be the first!</p>
                    )}
                  </div>
                </div>

                <div className={`flex justify-between items-center ${isMobile ? 'text-sm' : 'text-sm'}`}>
                  <span className="text-slate-500">ID: {group.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(group.id);
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    📋 Copy ID
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discover Groups */}
      {availableGroups.length > 0 && (
        <div>
          <div className={`flex justify-between items-center mb-4 ${isMobile ? 'flex-col space-y-4' : ''}`}>
            <h3 className={`font-semibold text-white flex items-center space-x-2 ${isMobile ? 'text-lg self-start' : 'text-xl'}`}>
              <span>🔍</span>
              <span>Discover Groups</span>
            </h3>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors ${
                isMobile ? 'px-3 py-2 text-sm w-full' : 'px-3 py-2'
              }`}
            />
          </div>
          <div className="grid gap-4">
            {availableGroups.slice(0, 6).map(group => (
              <div key={group.id} className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-green-500 transition-colors group-card ${isMobile ? '' : 'p-6'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className={`font-semibold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>{group.name}</h4>
                    <p className={`text-slate-400 ${isMobile ? 'text-sm' : ''}`}>{group.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`bg-slate-700 text-slate-300 px-3 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      👥 {group.memberCount}
                    </span>
                    <button
                      onClick={() => onJoinGroup(group.id)}
                      className={`bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all hover:scale-105 ${
                        isMobile ? 'px-3 py-1 text-sm' : 'px-4 py-2 text-sm'
                      }`}
                    >
                      Join 🚀
                    </button>
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-3">
                  <p className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>This Week's Challenge:</p>
                  <p className={`text-white ${isMobile ? 'text-sm' : ''}`}>{group.currentChallenge}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Leaderboard = ({ submissions, groups, user, isMobile }) => {
  const [viewMode, setViewMode] = useState('weekly'); // weekly or allTime

  // Calculate user scores for both weekly and all-time
  const calculateUserScores = (submissionsToAnalyze) => {
    const userScores = {};
    
    submissionsToAnalyze.forEach(submission => {
      if (!userScores[submission.userId]) {
        userScores[submission.userId] = {
          userId: submission.userId,
          userName: submission.userName,
          totalPoints: 0,
          submissions: 0,
          averageRating: 0,
          streak: 0,
          reactions: 0,
          votes: 0
        };
      }
      
      const userScore = userScores[submission.userId];
      userScore.submissions++;
      userScore.reactions += submission.reactions?.length || 0;
      userScore.votes += submission.votes?.length || 0;
      
      if (submission.votes && submission.votes.length > 0) {
        const avgRating = submission.votes.reduce((sum, vote) => sum + vote.rating, 0) / submission.votes.length;
        userScore.totalPoints += avgRating * 10;
        userScore.averageRating = ((userScore.averageRating * (userScore.submissions - 1)) + avgRating) / userScore.submissions;
      }
    });

    return Object.values(userScores).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const weeklySubmissions = submissions.filter(s => isCurrentWeek(s.timestamp));
  const allTimeSubmissions = submissions;

  const weeklyScores = calculateUserScores(weeklySubmissions);
  const allTimeScores = calculateUserScores(allTimeSubmissions);

  const currentScores = viewMode === 'weekly' ? weeklyScores : allTimeScores;
  const currentSubmissions = viewMode === 'weekly' ? weeklySubmissions : allTimeSubmissions;

  const getRankIcon = (index) => {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '🏅';
  };

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  return (
    <div className={`space-y-6 ${isMobile ? 'pb-20' : ''}`}>
      <div className={`flex justify-between items-center ${isMobile ? 'flex-col space-y-4' : ''}`}>
        <h2 className={`font-bold text-white flex items-center space-x-2 ${isMobile ? 'text-xl self-start' : 'text-2xl'}`}>
          <span>🏆</span>
          <span>Leaderboard</span>
        </h2>
        
        <div className={`flex space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700 ${isMobile ? 'w-full' : ''}`}>
          <button
            onClick={() => setViewMode('weekly')}
            className={`${isMobile ? 'flex-1' : ''} px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'weekly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 This Week
          </button>
          <button
            onClick={() => setViewMode('allTime')}
            className={`${isMobile ? 'flex-1' : ''} px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'allTime' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⏳ All Time
          </button>
        </div>
      </div>

      {viewMode === 'weekly' && (
        <div className="bg-blue-900 border border-blue-700 rounded-xl p-4 text-center">
          <h3 className={`text-white font-semibold mb-2 ${isMobile ? 'text-base' : ''}`}>📅 Week of {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}</h3>
          <p className={`text-blue-200 ${isMobile ? 'text-sm' : 'text-sm'}`}>Leaderboard resets every Monday at midnight</p>
          <p className={`text-blue-300 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>{currentSubmissions.length} submissions this week</p>
        </div>
      )}
      
      <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${isMobile ? '' : 'p-6'}`}>
        <h3 className={`font-semibold text-white mb-4 flex items-center space-x-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          <span>🌟</span>
          <span>{viewMode === 'weekly' ? 'Weekly' : 'All-Time'} Top Performers</span>
        </h3>
        <div className="space-y-3">
          {currentScores.slice(0, 10).map((userScore, index) => (
            <div 
              key={`${viewMode}-${userScore.userId}`}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                isMobile ? 'p-3' : 'p-4'
              } ${
                userScore.userId === user.id 
                  ? 'bg-blue-900 border border-blue-700 ring-2 ring-blue-500' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center text-white text-lg font-bold ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                  index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  'bg-slate-600'
                }`}>
                  <span className={isMobile ? 'text-lg' : 'text-xl'}>{getRankIcon(index)}</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>{userScore.userName}</p>
                    {userScore.userId === user.id && (
                      <span className={`bg-blue-600 text-white px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>YOU</span>
                    )}
                    {viewMode === 'weekly' && index === 0 && (
                      <span className={`bg-yellow-600 text-white px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-xs'}`}>WEEKLY CHAMPION</span>
                    )}
                  </div>
                  <div className={`flex items-center space-x-3 text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'} ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
                    <span className="flex items-center space-x-1">
                      <span>📸</span>
                      <span>{userScore.submissions}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>⭐</span>
                      <span>{userScore.averageRating.toFixed(1)}</span>
                    </span>
                    {!isMobile && (
                      <>
                        <span className="flex items-center space-x-1">
                          <span>❤️</span>
                          <span>{userScore.reactions}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>🗳️</span>
                          <span>{userScore.votes}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>{Math.round(userScore.totalPoints)}</p>
                <p className={`text-slate-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>points</p>
              </div>
            </div>
          ))}
          {currentScores.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-4">🏆</div>
              <p className={isMobile ? 'text-sm' : ''}>No submissions yet {viewMode === 'weekly' ? 'this week' : 'ever'}. Be the first!</p>
            </div>
          )}
        </div>
      </div>

      {user && currentScores.find(s => s.userId === user.id) && (
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-700 rounded-xl p-4">
          <h3 className={`font-semibold text-white mb-4 flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <span>📊</span>
            <span>Your {viewMode === 'weekly' ? 'Weekly' : 'All-Time'} Performance</span>
          </h3>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="text-center">
              <p className={`font-bold text-white ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                #{currentScores.findIndex(u => u.userId === user.id) + 1}
              </p>
              <p className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>{viewMode === 'weekly' ? 'Weekly' : 'All-Time'} Rank</p>
            </div>
            <div className="text-center">
              <p className={`font-bold text-white ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                {Math.round(currentScores.find(u => u.userId === user.id)?.totalPoints || 0)}
              </p>
              <p className={`text-blue-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Points</p>
            </div>
            {!isMobile && (
              <>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">
                    {currentScores.find(u => u.userId === user.id)?.submissions || 0}
                  </p>
                  <p className="text-blue-200 text-sm">Submissions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">
                    {(currentScores.find(u => u.userId === user.id)?.averageRating || 0).toFixed(1)}
                  </p>
                  <p className="text-blue-200 text-sm">Avg Rating</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AchievementsView = ({ achievements, onMarkAchievementSeen, isMobile }) => {
  // Simplified achievements view
  return (
    <div className={`space-y-6 ${isMobile ? 'pb-20' : ''}`}>
      <h2 className={`font-bold text-white flex items-center space-x-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
        <span>⭐</span>
        <span>Achievements</span>
      </h2>
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-4">🚧</div>
        <p className={isMobile ? 'text-sm' : ''}>Achievements view - Mobile optimization in progress</p>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  const [user, setUser] = useState(getStorageItem('user'));
  const [isLogin, setIsLogin] = useState(true);
  const [currentView, setCurrentView] = useState('feed');
  const [groups, setGroups] = useState(getStorageItem('groups', DEFAULT_GROUPS));
  const [submissions, setSubmissions] = useState(() => {
    const stored = getStorageItem('submissions');
    return stored && stored.length > 0 ? stored : generateDemoSubmissions();
  });
  const [achievements, setAchievements] = useState(getStorageItem('achievements', ACHIEVEMENTS.map(a => ({ ...a, earned: false, seen: false }))));
  const [showIntro, setShowIntro] = useState(false);

  // Handle window resize for responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    setStorageItem('achievements', achievements);
  }, [achievements]);

  // Check for new achievements
  const checkAchievements = useCallback(() => {
    if (!user) return;
    
    const userSubmissions = submissions.filter(s => s.userId === user.id);
    const userVotes = submissions.reduce((acc, s) => acc + (s.votes?.filter(v => v.userId === user.id).length || 0), 0);
    const userGroups = groups.filter(g => g.createdBy === user.id);
    const weeklySubmissions = submissions.filter(s => s.userId === user.id && isCurrentWeek(s.timestamp));
    const userChallenges = groups.reduce((acc, g) => acc + (g.nextWeekChallenges?.filter(ch => ch.submittedBy === user.id).length || 0), 0);
    
    const weeklyScores = {};
    submissions.filter(s => isCurrentWeek(s.timestamp)).forEach(submission => {
      if (!weeklyScores[submission.userId]) {
        weeklyScores[submission.userId] = 0;
      }
      if (submission.votes && submission.votes.length > 0) {
        const avgRating = submission.votes.reduce((sum, vote) => sum + vote.rating, 0) / submission.votes.length;
        weeklyScores[submission.userId] += avgRating * 10;
      }
    });
    const sortedWeekly = Object.entries(weeklyScores).sort(([,a], [,b]) => b - a);
    const isWeeklyWinner = sortedWeekly.length > 0 && sortedWeekly[0][0] === user.id;
    
    setAchievements(prev => prev.map(achievement => {
      if (achievement.earned) return achievement;
      
      let shouldEarn = false;
      
      switch (achievement.id) {
        case 'first-post':
          shouldEarn = userSubmissions.length >= 1;
          break;
        case 'streak-3':
          shouldEarn = userSubmissions.length >= 3;
          break;
        case 'streak-7':
          shouldEarn = userSubmissions.length >= 7;
          break;
        case 'popular-post':
          shouldEarn = userSubmissions.some(s => (s.votes?.length || 0) >= 10);
          break;
        case 'group-creator':
          shouldEarn = userGroups.length >= 1;
          break;
        case 'helpful-voter':
          shouldEarn = userVotes >= 50;
          break;
        case 'weekly-winner':
          shouldEarn = isWeeklyWinner && weeklySubmissions.length > 0;
          break;
        case 'challenge-creator':
          shouldEarn = userChallenges >= 1;
          break;
      }
      
      if (shouldEarn) {
        return { ...achievement, earned: true, earnedAt: new Date().toISOString() };
      }
      
      return achievement;
    }));
  }, [submissions, groups, user]);

  useEffect(() => {
    if (user) {
      checkAchievements();
    }
  }, [user, checkAchievements]);

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

  // Activity handlers
  const handleSubmitActivity = (activityData) => {
    const submission = {
      id: generateId(),
      ...activityData,
      userName: user.name,
      votes: [],
      reactions: [],
      timestamp: new Date().toISOString()
    };
    
    setSubmissions(prev => [submission, ...prev]);
  };

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

  const handleReact = (submissionId, emoji) => {
    setSubmissions(prev => prev.map(submission => {
      if (submission.id === submissionId) {
        const existingReactionIndex = submission.reactions?.findIndex(r => r.userId === user.id) ?? -1;
        const newReactions = [...(submission.reactions || [])];
        
        if (existingReactionIndex >= 0) {
          newReactions[existingReactionIndex] = { userId: user.id, emoji };
        } else {
          newReactions.push({ userId: user.id, emoji });
        }
        
        return { ...submission, reactions: newReactions };
      }
      return submission;
    }));
  };

  // Group handlers
  const handleCreateGroup = (groupData) => {
    setGroups(prev => [...prev, groupData]);
  };

  const handleJoinGroup = (groupId) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId && !group.members.includes(user.id)
        ? { ...group, members: [...group.members, user.id], memberCount: group.memberCount + 1 }
        : group
    ));
  };

  const handleSubmitGroupChallenge = (groupId, challenge) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newChallenge = {
          id: generateId(),
          challenge,
          submittedBy: user.id,
          votes: []
        };
        return {
          ...group,
          nextWeekChallenges: [...(group.nextWeekChallenges || []), newChallenge]
        };
      }
      return group;
    }));
  };

  const handleVoteGroupChallenge = (groupId, challengeId) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          nextWeekChallenges: group.nextWeekChallenges.map(challenge =>
            challenge.id === challengeId
              ? { ...challenge, votes: [...(challenge.votes || []), user.id] }
              : challenge
          )
        };
      }
      return group;
    }));
  };

  const handleMarkAchievementSeen = (achievementId) => {
    setAchievements(prev => prev.map(achievement =>
      achievement.id === achievementId ? { ...achievement, seen: true } : achievement
    ));
  };

  // Render intro screen
  if (showIntro) {
    return <IntroScreen onContinue={() => setShowIntro(false)} isMobile={isMobile} />;
  }

  // Render auth screens
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <img 
              src="https://images.unsplash.com/photo-1511988617509-a57c8a288659?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmaXRuZXNzfGVufDB8fHxibHVlfDE3NDgwODI2MDR8MA&ixlib=rb-4.1.0&q=85" 
              alt="Community" 
              className={`rounded-full mx-auto object-cover border-4 border-blue-500 ${isMobile ? 'w-24 h-24' : 'w-32 h-32'}`}
            />
            <div className="space-y-2">
              <h1 className={`font-bold text-white ${isMobile ? 'text-4xl' : 'text-5xl'}`}>ACTIFY</h1>
              <p className={`text-slate-300 ${isMobile ? 'text-lg' : 'text-xl'}`}>Authentic activity challenges</p>
              <p className="text-slate-400">No filters. Just real moments.</p>
            </div>
          </div>
          
          <AuthForm
            isLogin={isLogin}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onSwitch={() => setIsLogin(!isLogin)}
            onShowIntro={() => setShowIntro(true)}
            isMobile={isMobile}
          />
        </div>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="min-h-screen bg-slate-900">
      {isMobile ? (
        <>
          <MobileHeader user={user} onLogout={handleLogout} />
          <main className="p-4">
            {currentView === 'feed' && (
              <ActivityFeed
                user={user}
                submissions={submissions}
                groups={groups}
                onSubmitActivity={handleSubmitActivity}
                onVote={handleVote}
                onReact={handleReact}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'groups' && (
              <GroupsView
                user={user}
                groups={groups}
                onCreateGroup={handleCreateGroup}
                onJoinGroup={handleJoinGroup}
                onSubmitGroupChallenge={handleSubmitGroupChallenge}
                onVoteGroupChallenge={handleVoteGroupChallenge}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'leaderboard' && (
              <Leaderboard
                submissions={submissions}
                groups={groups}
                user={user}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'achievements' && (
              <AchievementsView
                achievements={achievements}
                onMarkAchievementSeen={handleMarkAchievementSeen}
                isMobile={isMobile}
              />
            )}
          </main>
          <MobileBottomNav 
            currentView={currentView}
            setCurrentView={setCurrentView}
            achievements={achievements}
          />
        </>
      ) : (
        <>
          <DesktopNavigation 
            user={user} 
            onLogout={handleLogout}
            currentView={currentView}
            setCurrentView={setCurrentView}
            achievements={achievements}
          />
          
          <main className="max-w-4xl mx-auto p-4">
            {currentView === 'feed' && (
              <ActivityFeed
                user={user}
                submissions={submissions}
                groups={groups}
                onSubmitActivity={handleSubmitActivity}
                onVote={handleVote}
                onReact={handleReact}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'groups' && (
              <GroupsView
                user={user}
                groups={groups}
                onCreateGroup={handleCreateGroup}
                onJoinGroup={handleJoinGroup}
                onSubmitGroupChallenge={handleSubmitGroupChallenge}
                onVoteGroupChallenge={handleVoteGroupChallenge}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'leaderboard' && (
              <Leaderboard
                submissions={submissions}
                groups={groups}
                user={user}
                isMobile={isMobile}
              />
            )}
            
            {currentView === 'achievements' && (
              <AchievementsView
                achievements={achievements}
                onMarkAchievementSeen={handleMarkAchievementSeen}
                isMobile={isMobile}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;