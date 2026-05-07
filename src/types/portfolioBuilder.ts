export type PortfolioType = "Personal" | "Academic" | "Masters";

export interface PortfolioTypeConfig {
  type: PortfolioType;
  sections: string[];
  title: string;
  description: string;
}

export interface PortfolioProfile {
  name: string;
  role: string;
  email: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface Project {
  name: string;
  description: string;
}

export interface PortfolioBuilderState {
  type: PortfolioType;
  profile: PortfolioProfile;
  education?: Education[];
  projects?: Project[];
  documents: string[]; // vault document IDs
}

export interface VaultDocument {
  id: string;
  name: string;
  encryptedData: string;
  encryptedImage?: string;
  cloudinaryUrl?: string;
  metadata: {
    timestamp: number;
    original_name: string;
    size: number;
    checksum: string;
    encrypted?: boolean;
    ownerId?: string;
  };
  createdAt: string;
}

// Sharing-related types
export interface PortfolioShareConfig {
  shareTitle: string;
  shareDescription: string;
  accessType: 'public' | 'password' | 'otp';
  expiryHours: number;
  password?: string;
  otpEnabled: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
}

export interface SharedPortfolioLink {
  id: string;
  portfolioId: string;
  token: string;
  shareTitle: string;
  shareDescription: string;
  accessType: string;
  expiresAt: string;
  otpEnabled: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
  active: boolean;
  createdAt: string;
  views: number;
  portfolio?: any; // Optional portfolio data for display
}

export interface ShareAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  averageViewDuration: number;
  devices: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  accessLog: Array<{
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
  }>;
}
