import { Preferences } from "@capacitor/preferences";
import { Portfolio } from "../types/portfolio";

const getKey = async () => {
  const { value } = await Preferences.get({ key: "biovault_userId" });
  return `portfolios_${value}`;
};

export const getPortfolios = async (): Promise<Portfolio[]> => {
  const key = await getKey();
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : [];
};

export const savePortfolio = async (portfolio: Portfolio): Promise<void> => {
  console.log("=== STEP 1: SAVING PORTFOLIO ===");
  console.log("📁 Portfolio to save:", portfolio);
  console.log("📊 Portfolio type:", typeof portfolio);
  console.log("📊 Portfolio keys:", Object.keys(portfolio));
  
  const key = await getKey();
  const existing = await getPortfolios();
  console.log("📚 Existing portfolios:", existing);

  const updated = [...existing, portfolio];
  console.log("➕ Updated portfolios list:", updated);
  console.log("📄 Portfolio documents count:", portfolio.documents?.length || 0);
  console.log("📄 Portfolio education count:", (portfolio as any).education?.length || 0);
  console.log("📄 Portfolio projects count:", (portfolio as any).projects?.length || 0);
  console.log("👤 Portfolio profile:", !!(portfolio as any).profile);

  await Preferences.set({
    key,
    value: JSON.stringify(updated),
  });
  
  console.log("✅ Portfolio saved successfully");
};

export const updatePortfolio = async (updatedPortfolio: Portfolio): Promise<void> => {
  const key = await getKey();
  const existing = await getPortfolios();

  const updated = existing.map(p =>
    p.id === updatedPortfolio.id ? updatedPortfolio : p
  );

  await Preferences.set({
    key,
    value: JSON.stringify(updated),
  });
};

export const deletePortfolio = async (id: string): Promise<void> => {
  const key = await getKey();
  const existing = await getPortfolios();

  const updated = existing.filter(p => p.id !== id);

  await Preferences.set({
    key,
    value: JSON.stringify(updated),
  });
};

export const getPortfolioById = async (id: string): Promise<Portfolio | null> => {
  const portfolios = await getPortfolios();
  return portfolios.find(p => p.id === id) || null;
};
