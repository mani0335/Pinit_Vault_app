export interface Portfolio {
  id: string;
  type: "personal" | "academic" | "masters";
  name: string; // user name
  role?: string;
  email?: string;
  
  documents: string[]; // vault doc IDs
  
  createdAt: string;
  updatedAt: string;
}
