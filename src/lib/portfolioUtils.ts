import type { Portfolio, VaultDocument } from "../types/Portfolio";
import { classifyDocument, PORTFOLIO_TEMPLATES } from "../types/Portfolio";

/**
 * Auto-organize documents into portfolio sections
 */
export const autoOrganizeDocuments = (
  documents: VaultDocument[],
  portfolioType: Portfolio['type']
): Record<string, string[]> => {
  const template = PORTFOLIO_TEMPLATES[portfolioType];
  const organized: Record<string, string[]> = {};
  
  // Initialize sections
  template.sections.forEach(section => {
    organized[section] = [];
  });

  // Classify and assign documents
  documents.forEach(doc => {
    const section = classifyDocument(doc.name, portfolioType);
    if (organized[section]) {
      organized[section].push(doc.id);
    } else {
      // Add to first section if classification doesn't match template
      organized[template.sections[0]].push(doc.id);
    }
  });

  return organized;
};

/**
 * Create portfolio with template structure from documents
 */
export const createTemplatePortfolio = (
  name: string,
  type: Portfolio['type'],
  documents: VaultDocument[] = []
): Omit<Portfolio, 'id' | 'createdAt'> => {
  const template = PORTFOLIO_TEMPLATES[type];
  const organized = autoOrganizeDocuments(documents, type);
  
  return {
    name,
    type,
    sections: template.sections.map(sectionTitle => ({
      title: sectionTitle,
      documents: organized[sectionTitle] || []
    }))
  };
};

/**
 * Validate portfolio data
 */
export const validatePortfolioData = (portfolio: Partial<Portfolio>): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!portfolio.name || portfolio.name.trim().length === 0) {
    errors.push('Portfolio name is required');
  }

  if (!portfolio.type) {
    errors.push('Portfolio type is required');
  }

  if (!portfolio.sections || portfolio.sections.length === 0) {
    errors.push('Portfolio must have at least one section');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Add document to portfolio section
 */
export const addDocumentToSection = (
  portfolio: Portfolio,
  sectionTitle: string,
  documentId: string
): Portfolio => {
  return {
    ...portfolio,
    sections: portfolio.sections.map(section => {
      if (section.title === sectionTitle) {
        return {
          ...section,
          documents: [...section.documents, documentId]
        };
      }
      return section;
    }),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Remove document from portfolio section
 */
export const removeDocumentFromSection = (
  portfolio: Portfolio,
  sectionTitle: string,
  documentId: string
): Portfolio => {
  return {
    ...portfolio,
    sections: portfolio.sections.map(section => {
      if (section.title === sectionTitle) {
        return {
          ...section,
          documents: section.documents.filter(id => id !== documentId)
        };
      }
      return section;
    }),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Get document count in portfolio
 */
export const getPortfolioDocumentCount = (portfolio: Portfolio): number => {
  return portfolio.sections.reduce((total, section) => total + section.documents.length, 0);
};

/**
 * Check if portfolio has any documents
 */
export const portfolioHasDocuments = (portfolio: Portfolio): boolean => {
  return getPortfolioDocumentCount(portfolio) > 0;
};
