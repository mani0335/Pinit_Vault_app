import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Briefcase, Award, BookOpen, Camera, Shield, Settings } from 'lucide-react';
import './Profile.css';

export default function ProfileModern() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Mock user data - replace with actual user data from backend
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    location: 'San Francisco, CA',
    bio: 'Security-focused professional with expertise in digital identity management and biometric authentication systems.',
    joinDate: 'March 2024',
    profession: 'Security Engineer',
    company: 'TechCorp Solutions',
    profileImage: null, // Will be set from user photo
    stats: {
      documentsStored: 24,
      categoriesCreated: 7,
      securityLevel: 'Premium',
      lastLogin: '2 hours ago'
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserData(prev => ({
          ...prev,
          profileImage: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'documents', label: 'Documents', icon: Briefcase },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="profile-modern-container">
      {/* Header with Profile Photo */}
      <motion.div 
        className="profile-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="profile-photo-section">
          <div className="photo-container">
            {userData.profileImage ? (
              <img 
                src={userData.profileImage} 
                alt="Profile" 
                className="profile-photo"
              />
            ) : (
              <div className="photo-placeholder">
                <User size={48} className="photo-icon" />
                <span className="photo-text">Add Photo</span>
              </div>
            )}
            <div className="photo-overlay">
              <label htmlFor="photo-upload" className="camera-button">
                <Camera size={20} />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="photo-input"
              />
            </div>
          </div>
          
          <div className="profile-info">
            <motion.h1 
              className="profile-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {userData.name}
            </motion.h1>
            <motion.p 
              className="profile-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {userData.profession} at {userData.company}
            </motion.p>
            <motion.div 
              className="profile-meta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="meta-item">
                <MapPin size={16} className="meta-icon" />
                <span>{userData.location}</span>
              </div>
              <div className="meta-item">
                <Calendar size={16} className="meta-icon" />
                <span>Member since {userData.joinDate}</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          className="profile-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button 
            className="action-btn primary"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
          <button className="action-btn secondary">
            Security Settings
          </button>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="stats-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="stats-grid">
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="stat-icon documents">
              <Briefcase size={24} />
            </div>
            <div className="stat-content">
              <h3>{userData.stats.documentsStored}</h3>
              <p>Documents Stored</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="stat-icon categories">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <h3>{userData.stats.categoriesCreated}</h3>
              <p>Categories Created</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="stat-icon security">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <h3>{userData.stats.securityLevel}</h3>
              <p>Security Level</p>
            </div>
          </motion.div>
          
          <motion.div 
            className="stat-card"
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="stat-icon activity">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <h3>{userData.stats.lastLogin}</h3>
              <p>Last Activity</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div 
        className="tabs-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="tabs-list">
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <tab.icon size={20} className="tab-icon" />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div 
        className="tab-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        key={activeTab}
      >
        {activeTab === 'overview' && (
          <div className="overview-content">
            <motion.div 
              className="info-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="card-title">Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <Mail size={18} className="info-icon" />
                  <div>
                    <label>Email</label>
                    <p>{userData.email}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={18} className="info-icon" />
                  <div>
                    <label>Phone</label>
                    <p>{userData.phone}</p>
                  </div>
                </div>
                <div className="info-item">
                  <MapPin size={18} className="info-icon" />
                  <div>
                    <label>Location</label>
                    <p>{userData.location}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bio-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="card-title">About</h3>
              <p className="bio-text">{userData.bio}</p>
            </motion.div>

            <motion.div 
              className="achievements-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="card-title">Recent Achievements</h3>
              <div className="achievements-list">
                <div className="achievement-item">
                  <Award className="achievement-icon" />
                  <div>
                    <h4>Security Expert</h4>
                    <p>Completed advanced security training</p>
                  </div>
                </div>
                <div className="achievement-item">
                  <Award className="achievement-icon" />
                  <div>
                    <h4>100 Documents</h4>
                    <p>Successfully stored 100+ documents</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-content">
            <motion.div 
              className="content-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="card-title">Document Categories</h3>
              <p className="card-description">Access and manage your stored documents by category</p>
              <div className="category-grid">
                {['Personal', 'Academic', 'Projects', 'Certificates'].map((category, index) => (
                  <motion.div
                    key={category}
                    className="category-item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <h4>{category}</h4>
                    <p>View documents</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-content">
            <motion.div 
              className="content-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="card-title">Security Settings</h3>
              <p className="card-description">Manage your biometric authentication and security preferences</p>
              <div className="security-options">
                <div className="security-item">
                  <Shield className="security-icon" />
                  <div>
                    <h4>Biometric Authentication</h4>
                    <p>Enabled for enhanced security</p>
                  </div>
                </div>
                <div className="security-item">
                  <Award className="security-icon" />
                  <div>
                    <h4>Two-Factor Authentication</h4>
                    <p>Additional layer of protection</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-content">
            <motion.div 
              className="content-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="card-title">Profile Settings</h3>
              <p className="card-description">Customize your profile and app preferences</p>
              <div className="settings-options">
                <div className="setting-item">
                  <label>Notification Preferences</label>
                  <select className="setting-select">
                    <option>All Notifications</option>
                    <option>Important Only</option>
                    <option>None</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Theme</label>
                  <select className="setting-select">
                    <option>Dark Mode</option>
                    <option>Light Mode</option>
                    <option>Auto</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
