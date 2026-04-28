import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import './Profile.css';
import PersonalPage from './profile/PersonalPage';
import AcademicPage from './profile/AcademicPage';
import ProjectsPage from './profile/ProjectsPage';
import InternshipsPage from './profile/InternshipsPage';
import CertificationsPage from './profile/CertificationsPage';
import ExamsPage from './profile/ExamsPage';
import FinancialPage from './profile/FinancialPage';

const CATEGORIES = [
  {
    id: 'personal',
    emoji: '🔹',
    title: 'Personal',
    subtitle: 'Identity & Contact Info',
    color: 'from-blue-600 to-blue-400',
    icon: '👤'
  },
  {
    id: 'academic',
    emoji: '🎓',
    title: 'Academic',
    subtitle: 'Educational Qualifications',
    color: 'from-purple-600 to-purple-400',
    icon: '🎓'
  },
  {
    id: 'projects',
    emoji: '💻',
    title: 'Projects',
    subtitle: 'Technical Work & Portfolio',
    color: 'from-green-600 to-green-400',
    icon: '💻'
  },
  {
    id: 'internships',
    emoji: '🏢',
    title: 'Internships',
    subtitle: 'Work Experience & Letters',
    color: 'from-orange-600 to-orange-400',
    icon: '🏢'
  },
  {
    id: 'certifications',
    emoji: '📜',
    title: 'Certifications',
    subtitle: 'Courses & Training',
    color: 'from-pink-600 to-pink-400',
    icon: '🏆'
  },
  {
    id: 'exams',
    emoji: '📝',
    title: 'Entrance & Exams',
    subtitle: 'Exam Results & Scores',
    color: 'from-indigo-600 to-indigo-400',
    icon: '📊'
  },
  {
    id: 'financial',
    emoji: '💰',
    title: 'Financial',
    subtitle: 'Financial Documents',
    color: 'from-yellow-600 to-yellow-400',
    icon: '💳'
  }
];

const pageComponents: { [key: string]: any } = {
  personal: PersonalPage,
  academic: AcademicPage,
  projects: ProjectsPage,
  internships: InternshipsPage,
  certifications: CertificationsPage,
  exams: ExamsPage,
  financial: FinancialPage
};

export default function Profile() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (id: string) => {
    setSelectedCategory(id);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  // If a category is selected, show its dedicated page
  if (selectedCategory) {
    const PageComponent = pageComponents[selectedCategory];
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    
    if (PageComponent) {
      return (
        <PageComponent 
          categoryId={selectedCategory}
          categoryTitle={category?.title}
          categoryEmoji={category?.emoji}
          onBack={handleBack}
        />
      );
    }
  }

  // Main Profile page with category selection
  return (
    <div className="profile-container">
      {/* Header */}
      <motion.div 
        className="profile-main-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <h1 className="main-title">👤 Digital Identity Vault</h1>
          <p className="main-subtitle">Organize all your documents and credentials in one secure place</p>
        </div>
      </motion.div>

      {/* Statistics Bar */}
      <motion.div 
        className="stats-bar"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stat-item">
          <span className="stat-label">Categories</span>
          <span className="stat-value">7</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-label">Documents</span>
          <span className="stat-value">24</span>
        </div>
      </motion.div>

      {/* Categories Grid */}
      <div className="categories-main-grid">
        {CATEGORIES.map((category, index) => (
          <motion.div
            key={category.id}
            className="category-main-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.05, y: -8 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCategoryClick(category.id)}
          >
            {/* Card Background Gradient */}
            <div className={`card-gradient bg-gradient-to-br ${category.color}`}></div>

            {/* Card Content */}
            <div className="card-content">
              {/* Icon */}
              <div className="card-icon-wrapper">
                <span className="card-emoji">{category.emoji}</span>
              </div>

              {/* Title & Subtitle */}
              <div className="card-text">
                <h3 className="category-name">{category.title}</h3>
                <p className="category-desc">{category.subtitle}</p>
              </div>

              {/* Arrow Icon */}
              <div className="card-arrow">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.div>
              </div>

              {/* Bottom Accent */}
              <div className="card-accent"></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Features Section */}
      <motion.div 
        className="features-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="section-title">✨ Key Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">📸</div>
            <h4>Camera Capture</h4>
            <p>Quickly capture documents with your phone camera</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📁</div>
            <h4>File Upload</h4>
            <p>Upload PDFs, images, and documents from your device</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <h4>Secure Storage</h4>
            <p>All documents encrypted and securely stored in vault</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <h4>Quick Access</h4>
            <p>Instant access to all your organized documents</p>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        className="cta-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <p>👉 Select a category above to get started</p>
      </motion.div>

      {/* Spacing for bottom navigation */}
      <div className="bottom-spacing"></div>
    </div>
  );
}
