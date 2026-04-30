import { api } from './api';

export interface EconomySettings {
  burnRateConstant: number;
  sitePopularityConstant: number;
  volumeDecayConstant: number;
  subscriptionPriceFree: number;
  subscriptionPriceStandard: number;
  subscriptionPricePremium: number;
  creditPack5000: number;
  creditPack10000: number;
  creditPack25000: number;
  creditPack50000: number;
  creditPack100000: number;
  redemptionFeePct: number;
}

export const DEFAULT_ECONOMY_SETTINGS: EconomySettings = {
  burnRateConstant: 0.999,
  sitePopularityConstant: 5,
  volumeDecayConstant: 1,
  subscriptionPriceFree: 0,
  subscriptionPriceStandard: 5,
  subscriptionPricePremium: 10,
  creditPack5000: 5,
  creditPack10000: 10,
  creditPack25000: 25,
  creditPack50000: 50,
  creditPack100000: 100,
  redemptionFeePct: 0,
};

export async function fetchEconomySettings(): Promise<EconomySettings> {
  try {
    const data = await api.get<{ settings?: Partial<EconomySettings> }>('/api/economy/settings');
    return {
      ...DEFAULT_ECONOMY_SETTINGS,
      ...(data?.settings || {}),
    };
  } catch {
    return { ...DEFAULT_ECONOMY_SETTINGS };
  }
}
