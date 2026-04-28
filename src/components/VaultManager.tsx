import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Trash2,
  Eye,
  Download,
  Share2,
  Calendar,
  Grid3x3,
  List,
  Search,
  Filter,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { getShareLinks, deleteShareLink } from '@/lib/sharingUtils';
import { getCertificates, deleteCertificate } from '@/lib/sharingUtils';
import { logActivity } from '@/lib/activityUtils';

interface VaultItem {
  id: string;
  fileName: string;
  assetId: string;
  imagePreview: string;
  createdAt: string;
  fileSize?: string;
  type: 'image' | 'certificate' | 'share';
}

interface VaultManagerProps {
  userId?: string;
  onBack?: () => void;
}

export const VaultManager: React.FC<VaultManagerProps> = ({ userId = 'user', onBack }) => {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'certificate' | 'share'>('all');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  useEffect(() => {
    loadVaultItems();
  }, []);

  const loadVaultItems = () => {
    const items: VaultItem[] = [];

    // Load certificates as vault items
    const certs = getCertificates();
    certs.slice(0, 20).forEach((cert: any) => {
      items.push({
        id: cert.id,
        fileName: cert.certificateId,
        assetId: cert.assetId,
        imagePreview: cert.imagePreview || '',
        createdAt: cert.dateCreated,
        type: 'certificate',
      });
    });

    // Load share links
    const shares = getShareLinks();
    shares.slice(0, 20).forEach((share: any) => {
      items.push({
        id: share.id,
        fileName: share.fileName,
        assetId: share.assetId,
        imagePreview: share.imagePreview || '',
        createdAt: share.createdAt,
        fileSize: 'Shared',
        type: 'share',
      });
    });

    setVaultItems(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const filteredItems = vaultItems.filter((item) => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assetId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id: string, type: 'certificate' | 'share') => {
    if (type === 'certificate') {
      deleteCertificate(id);
    } else {
      deleteShareLink(id);
    }
    logActivity(userId, 'delete', id, id, `${type} deleted`, 'success');
    loadVaultItems();
  };

  const handleDownload = async (item: VaultItem) => {
    try {
      // Check if it's a document (scanned or uploaded)
      const isDocument = item.type === 'document' || item.fileName?.includes('.');
      
      if (isDocument || item.id) {
        // Download from backend endpoint
        const url = `/vault/documents/${item.id}/download?user_id=${userId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }
        
        // Get the file blob
        const blob = await response.blob();
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = item.fileName;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
        
        logActivity(userId, 'download', item.fileName, item.assetId, 'Downloaded from vault', 'success');
      } else if (item.imagePreview) {
        // Fallback for images with preview
        const link = document.createElement('a');
        link.href = item.imagePreview;
        link.download = item.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logActivity(userId, 'download', item.fileName, item.assetId, 'Downloaded from vault', 'success');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" />
            Vault Manager
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-slate-700' : 'hover:bg-slate-700'}`}
            >
              <Grid3x3 className="w-5 h-5 text-slate-300" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-slate-700' : 'hover:bg-slate-700'}`}
            >
              <List className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-4 py-2 border border-slate-600">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-slate-200 w-full placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-4 py-2 border border-slate-600">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent outline-none text-slate-200 w-full"
              >
                <option value="all">All Items</option>
                <option value="image">Images</option>
                <option value="certificate">Certificates</option>
                <option value="share">Shares</option>
              </select>
            </div>
          </div>

          <p className="text-slate-400 text-sm mt-4">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in vault
          </p>
        </motion.div>

        {/* Vault Content */}
        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-slate-800 border border-slate-700 rounded-2xl"
          >
            <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No items in vault</p>
            <p className="text-slate-500 text-sm mt-1">Upload and encrypt images to populate your vault</p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <AnimatePresence>
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-600 transition-colors group"
                >
                  {item.imagePreview && (
                    <div className="h-40 bg-slate-900 overflow-hidden relative">
                      <img
                        src={item.imagePreview}
                        alt={item.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                    </div>
                  )}

                  <div className="p-3">
                    <div className="mb-2">
                      <p className="text-slate-200 font-medium text-sm truncate">{item.fileName}</p>
                      <p className="text-slate-500 text-xs truncate">{item.assetId}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        item.type === 'certificate' ? 'bg-purple-900/30 text-purple-300' :
                        item.type === 'share' ? 'bg-green-900/30 text-green-300' :
                        'bg-blue-900/30 text-blue-300'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-slate-500 text-xs ml-auto">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(item)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Get
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.type as any)}
                        className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-700">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-700/30 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {item.imagePreview && (
                      <img src={item.imagePreview} alt={item.fileName} className="w-12 h-12 object-cover rounded" />
                    )}
                    <div>
                      <p className="text-slate-200 font-medium">{item.fileName}</p>
                      <p className="text-slate-500 text-sm">{item.assetId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 text-sm">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      item.type === 'certificate' ? 'bg-purple-900/30 text-purple-300' :
                      item.type === 'share' ? 'bg-green-900/30 text-green-300' :
                      'bg-blue-900/30 text-blue-300'
                    }`}>
                      {item.type}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.type as any)}
                        className="p-2 hover:bg-red-900/30 rounded transition-colors text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VaultManager;
