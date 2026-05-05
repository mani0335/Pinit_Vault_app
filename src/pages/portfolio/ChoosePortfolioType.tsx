import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, GraduationCap, Briefcase, Award, Star } from 'lucide-react';

interface PortfolioType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  recommended?: string;
  color: string;
}

export default function ChoosePortfolioType() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string>('');

  const portfolioTypes: PortfolioType[] = [
    {
      id: 'personal',
      name: 'Personal',
      description: 'Showcase your personal achievements and documents',
      icon: User,
      color: 'from-blue-500 to-cyan-500',
      recommended: 'Most popular'
    },
    {
      id: 'academic',
      name: 'Academic',
      description: 'Display educational qualifications and achievements',
      icon: GraduationCap,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Highlight work experience and skills',
      icon: Briefcase,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'masters',
      name: 'Masters',
      description: 'Advanced academic and research portfolio',
      icon: Award,
      color: 'from-orange-500 to-red-500',
      recommended: 'For advanced applications'
    }
  ];

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
  };

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/portfolio/builder/${selectedType}`);
    }
  };

  const handleBack = () => {
    navigate('/portfolio');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="p-3 hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-white">Choose Portfolio Type</h1>
          <div className="w-12"></div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all ${
                  selectedType ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-slate-400 mb-8">Step 1 of 4</p>

        {/* Portfolio Type Cards */}
        <div className="space-y-4">
          {portfolioTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <motion.button
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? 'border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10 shadow-2xl shadow-purple-500/20'
                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:shadow-xl'
                }`}
              >
                <div className="flex items-start gap-4 relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{type.name}</h3>
                      {type.recommended && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full font-medium border border-yellow-500/30">
                          {type.recommended}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">{type.description}</p>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedType}
          className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mt-8 ${
            selectedType
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25'
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          Continue
          {selectedType && <span className="ml-2">→</span>}
        </button>
      </div>
    </div>
  );
}
