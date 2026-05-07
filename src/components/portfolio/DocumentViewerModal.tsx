import React, { useState } from 'react';
import { X, Download, Eye, EyeOff, FileText, Image, File } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileDocument: {
    id: string;
    name: string;
    type: string;
    size: number;
    file_url: string | null;
  };
  allowDownload?: boolean;
  watermarkEnabled?: boolean;
  watermarkText?: string;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  fileDocument,
  allowDownload = true,
  watermarkEnabled = false,
  watermarkText = "PINIT Vault Protected"
}: DocumentViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  if (!isOpen) return null;

  const isImage = fileDocument.type.startsWith('image/');
  const isPDF = fileDocument.type === 'application/pdf';

  const handleDownload = async () => {
    if (!allowDownload || !fileDocument.file_url) {
      console.log('🚫 Download not allowed for this document');
      return;
    }

    try {
      console.log('📥 Downloading document:', fileDocument.name);
      
      // Create download link
      const link = document.createElement('a');
      link.href = fileDocument.file_url;
      link.download = fileDocument.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download started for:', fileDocument.name);
    } catch (error) {
      console.error('❌ Download failed:', error);
      setError('Download failed');
    }
  };

  const renderPreview = () => {
    if (!fileDocument.file_url) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Document not available</p>
            <p className="text-gray-500 text-sm mb-4">
              This document needs to be re-uploaded to enable preview
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (!showPreview) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <EyeOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Preview hidden</p>
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Show preview
            </button>
          </div>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="relative">
          <div className={`relative ${watermarkEnabled ? 'watermark-container' : ''}`}>
            <img
              src={fileDocument.file_url}
              alt={fileDocument.name}
              className="w-full h-auto rounded-lg shadow-lg"
              onLoad={() => {
                setIsLoading(false);
                console.log('✅ Image loaded successfully:', fileDocument.name);
              }}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load image');
                console.error('❌ Image load failed:', fileDocument.name);
              }}
              style={{ 
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
            />
            
            {watermarkEnabled && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className="text-blue-500/20 text-4xl font-bold rotate-45 select-none transform scale-150"
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                >
                  {watermarkText}
                </div>
              </div>
            )}
          </div>
          
          {watermarkEnabled && (
            <div className="absolute top-2 right-2 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Eye className="w-4 h-4 text-blue-600 inline mr-1" />
              <span className="text-xs text-blue-600">Protected</span>
            </div>
          )}
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="relative">
          <iframe
            src={fileDocument.file_url}
            title={fileDocument.name}
            className="w-full h-96 lg:h-[70vh] rounded-lg shadow-lg border"
            onLoad={() => {
              setIsLoading(false);
              console.log('✅ PDF loaded successfully:', fileDocument.name);
            }}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load PDF');
              console.error('❌ PDF load failed:', fileDocument.name);
            }}
          />
          
          {watermarkEnabled && (
            <div className="absolute top-2 right-2 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Eye className="w-4 h-4 text-blue-600 inline mr-1" />
              <span className="text-xs text-blue-600">Protected</span>
            </div>
          )}
        </div>
      );
    }

    // For unsupported file types, show file info
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">{fileDocument.name}</p>
          <p className="text-gray-500 text-sm mb-4">{fileDocument.type}</p>
          <p className="text-gray-400 text-xs mb-4">
            {(fileDocument.size / 1024).toFixed(1)} KB
          </p>
          {allowDownload && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Download File
            </button>
          )}
        </div>
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="w-5 h-5" />;
    if (isPDF) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="text-gray-600">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {fileDocument.name}
              </h3>
              <p className="text-sm text-gray-500">
                {fileDocument.type} • {(fileDocument.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isImage && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
            
            {allowDownload && fileDocument.file_url && (
              <button
                onClick={handleDownload}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Download file"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {isLoading && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
              <div className="text-center">
                <p className="text-red-600 font-medium mb-2">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {!isLoading && !error && renderPreview()}
        </div>
      </div>
    </div>
  );
}

// Add CSS for watermark
const style = document.createElement('style');
style.textContent = `
  .watermark-container {
    position: relative;
  }
  
  .watermark-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1;
  }
  
  .watermark-container img {
    position: relative;
    z-index: 0;
  }
`;
document.head.appendChild(style);
