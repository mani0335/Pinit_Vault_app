import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, CheckCircle, FileText, Award, Briefcase, BookOpen, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocumentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface DocumentSection {
  id: string;
  title: string;
  items: DocumentItem[];
}

const PROFILE_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'digital', label: 'Digital Identity' },
  { id: 'subscription', label: 'Subscription' }
];

const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    id: 'personal-docs',
    title: 'Personal Docs',
    items: [
      { id: '1', name: 'Resume versions', icon: <FileText size={20} /> },
      { id: '2', name: 'ID proof', icon: <FileText size={20} /> },
      { id: '3', name: 'Passport', icon: <FileText size={20} /> }
    ]
  },
  {
    id: 'academic',
    title: 'Academic',
    items: [
      { id: '1', name: '10th / 12th marks', icon: <BookOpen size={20} /> },
      { id: '2', name: 'Semester marksheets', icon: <BookOpen size={20} /> },
      { id: '3', name: 'Degree certificates', icon: <BoardOpen size={20} /> }
    ]
  },
  {
    id: 'projects',
    title: 'Projects',
    items: [
      { id: '1', name: 'Project photos', icon: <Code size={20} /> },
      { id: '2', name: 'Code links (GitHub)', icon: <Code size={20} /> },
      { id: '3', name: 'Prototype videos', icon: <Code size={20} /> }
    ]
  },
  {
    id: 'internships',
    title: 'Internships',
    items: [
      { id: '1', name: 'Offer letter', icon: <Briefcase size={20} /> },
      { id: '2', name: 'Completion certificate', icon: <Award size={20} /> },
      { id: '3', name: 'Work proof images', icon: <Briefcase size={20} /> }
    ]
  },
  {
    id: 'certifications',
    title: 'Certifications',
    items: [
      { id: '1', name: 'Online courses', icon: <Award size={20} /> },
      { id: '2', name: 'Hackathons', icon: <Award size={20} /> }
    ]
  },
  {
    id: 'entrance-exams',
    title: 'Entrance & Exams',
    items: [
      { id: '1', name: 'NEET', icon: <FileText size={20} /> },
      { id: '2', name: 'IELTS / Duolingo / PTE / Toefl', icon: <FileText size={20} /> },
      { id: '3', name: 'GRE / Gmat', icon: <FileText size={20} /> }
    ]
  }
];

export default function ProfileAdvanced() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: 'Jason Miller',
    email: 'jason.miller@email.com',
    userId: 'PINT234567',
    photo: 'https://ui-avatars.com/api/?name=Jason+Miller&background=0D8ABC&color=fff&size=150'
  });
  const [isEditing, setIsEditing] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProfileData({ ...profileData, photo: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-cyan-400" />
          </motion.button>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 mb-8 border border-slate-600 shadow-2xl"
        >
          <div className="flex gap-8 items-start">
            {/* Profile Photo */}
            <div className="relative group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-400 shadow-lg cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={profileData.photo}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <Upload size={32} className="text-white" />
              </motion.div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-cyan-400"
                      placeholder="Full Name"
                    />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-cyan-400"
                      placeholder="Email"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-3xl font-bold text-white">{profileData.name}</h2>
                      <p className="text-slate-400 mt-1">{profileData.email}</p>
                    </div>
                  </>
                )}

                {/* User ID with Checkmark */}
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span>PINIT ID: {profileData.userId}</span>
                  <CheckCircle size={20} className="text-green-400" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition"
                  >
                    {isEditing ? 'Save' : 'Edit Profile'}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2 mb-8 border-b border-slate-600 overflow-x-auto pb-4"
        >
          {PROFILE_TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Content Sections */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {DOCUMENT_SECTIONS.map((section, idx) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/20 transition group"
              >
                {/* Section Title */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                    {section.title}
                  </h3>
                  <motion.a
                    whileHover={{ scale: 1.1, color: '#06b6d4' }}
                    href="#"
                    className="text-sm text-slate-400 hover:text-cyan-400 transition"
                  >
                    View All →
                  </motion.a>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + itemIdx * 0.05 }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                    >
                      <div className="text-cyan-400">{item.icon}</div>
                      <span className="text-slate-300 hover:text-white transition">
                        {item.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700"
          >
            <p className="text-slate-400 text-lg">
              {PROFILE_TABS.find(t => t.id === activeTab)?.label} section coming soon...
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function BoardOpen(props: any) {
  return (
    <BookOpen {...props} />
  );
}
