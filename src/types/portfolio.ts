export interface PortfolioDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  file_url: string;
  uploaded_at: string;
  user_id: string;
}

export interface Portfolio {
  id: string;
  type: "personal" | "academic" | "professional" | "masters";
  name: string; // user name
  role?: string;
  email?: string;
  
  // Support both old format (string[]) and new format (PortfolioDocument[])
  documents?: string[] | PortfolioDocument[];
  
  // Additional portfolio sections for shared view
  profile?: {
    name: string;
    role?: string;
    email?: string;
  };
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    description: string;
    technologies?: string[];
  }>;
  skills?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  
  createdAt: string;
  updatedAt: string;
}
