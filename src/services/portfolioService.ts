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
  const key = await getKey();
  const existing = await getPortfolios();

  const updated = [...existing, portfolio];

  await Preferences.set({
    key,
    value: JSON.stringify(updated),
  });
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
