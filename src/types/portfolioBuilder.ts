export type PortfolioType = "Personal" | "Academic" | "Masters";

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
