import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Image, Video, User, BookOpen, Award, Code, CheckCircle, Briefcase } from 'lucide-react';
import { autoOrganizeDocuments } from '../../lib/portfolioUtils';
import { loadVaultDocuments } from '../../lib/vaultService';
import { createPortfolio } from '../../lib/portfolioService';
import type { Portfolio, VaultDocument } from '../../types/Portfolio';

export default function PortfolioBuilder() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>([]);
  const [structuredPortfolio, setStructuredPortfolio] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadAndBuildPortfolio = async () => {
      // Load userId and vault documents
      const storedUserId = localStorage.getItem('biovault_userId');
      if (storedUserId) {
        setUserId(storedUserId);
        try {
          const docs = await loadVaultDocuments(storedUserId);
          setVaultDocuments(docs);
          
          // Build portfolio structure
          if (type) {
            const selectedFiles = docs; // Use all vault documents
            const organized = autoOrganizeDocuments(selectedFiles, type as Portfolio['type']);
            
            const portfolio = {
              id: Date.now().toString(),
              name: 'My Portfolio',
              type: type,
              profile: {
                name: "User",
                role: "Professional",
                location: "India"
              },
              sections: Object.entries(organized).map(([title, documents]) => ({
                title,
                documents: documents as string[]
              })),
              createdAt: new Date().toISOString(),
              status: 'active' as const
            };
            
            setStructuredPortfolio(portfolio);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading vault documents:', error);
          setIsLoading(false);
        }
      }
    };
    
    loadAndBuildPortfolio();
  }, [type]);

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return Image;
    if (type.includes('video')) return Video;
    return FileText;
  };

  const getFileColor = (type: string) => {
    if (type.includes('image')) return 'from-green-500 to-emerald-500';
    if (type.includes('video')) return 'from-purple-500 to-pink-500';
    return 'from-red-500 to-orange-500';
  };

  const getSectionIcon = (sectionName: string) => {
    const name = sectionName.toLowerCase();
    if (name.includes('resume') || name.includes('cv')) return FileText;
    if (name.includes('education') || name.includes('academic')) return BookOpen;
    if (name.includes('cert') || name.includes('achievement')) return Award;
    if (name.includes('project')) return Code;
    if (name.includes('experience') || name.includes('work')) return Briefcase;
    return FileText;
  };

  const getSectionColor = (sectionName: string) => {
    const name = sectionName.toLowerCase();
    if (name.includes('resume') || name.includes('cv')) return 'from-blue-500 to-cyan-500';
    if (name.includes('education') || name.includes('academic')) return 'from-purple-500 to-pink-500';
    if (name.includes('cert') || name.includes('achievement')) return 'from-green-500 to-emerald-500';
    if (name.includes('project')) return 'from-orange-500 to-red-500';
    if (name.includes('experience') || name.includes('work')) return 'from-indigo-500 to-purple-500';
    return 'from-slate-500 to-gray-500';
  };

  const handleGeneratePortfolio = async () => {
    console.log('Generate Portfolio clicked, structuredPortfolio:', structuredPortfolio);
    if (structuredPortfolio && userId) {
      try {
        console.log('Creating portfolio:', structuredPortfolio);
        const newPortfolio = await createPortfolio(userId, {
          name: structuredPortfolio.name,
          type: structuredPortfolio.type,
          sections: structuredPortfolio.sections,
          status: 'active'
        });
        
        console.log('Portfolio created successfully:', newPortfolio);
        alert('Portfolio created successfully!');
        navigate('/portfolio');
      } catch (err) {
        console.error('Failed to create portfolio:', err);
        alert('Failed to create portfolio. Please try again.');
      }
    } else {
      console.error('No structured portfolio available or no userId');
      alert('Unable to generate portfolio. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/portfolio');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Building your portfolio...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">Portfolio Builder</h1>
          <div className="w-12"></div>
        </div>

        {/* Auto-Mapping Success */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-sm font-medium text-green-400">Auto-mapping complete!</p>
          </div>
          <p className="text-xs text-green-300">
            Documents have been automatically organized into sections
          </p>
        </div>

        {/* Portfolio Structure Preview */}
        {structuredPortfolio && (
          <div className="space-y-6 mb-8">
            {/* Profile Section */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {structuredPortfolio.profile.name}
                    </h3>
                    <p className="text-slate-400">
                      {structuredPortfolio.profile.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="p-6 space-y-6">
                {structuredPortfolio.sections.map((section: any) => {
                  const SectionIcon = getSectionIcon(section.title);
                  const sectionColor = getSectionColor(section.title);
                  
                  return (
                    <div key={section.title} className="border border-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${sectionColor} rounded-lg flex items-center justify-center`}>
                          <SectionIcon className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-white capitalize">{section.title}</h4>
                        <span className="text-sm text-slate-400">({section.documents.length})</span>
                      </div>
                      
                      {section.documents.length > 0 ? (
                        <div className="space-y-2">
                          {section.documents.map((docId: string) => {
                            const doc = vaultDocuments.find(d => d.id === docId);
                            if (!doc) return null;
                            
                            const Icon = getFileIcon(doc.name);
                            const fileColor = getFileColor(doc.name);
                            
                            return (
                              <div key={docId} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 bg-gradient-to-br ${fileColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {doc.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {(doc.metadata?.size || 0 / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-center">
                          <p className="text-sm text-slate-400">No documents in this section</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Generate Portfolio Button */}
        <button
          onClick={handleGeneratePortfolio}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
        >
          <CheckCircle className="w-5 h-5" />
          Generate Portfolio
        </button>
      </div>
    </div>
  );
}
