import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Swap APIs
export const swapApi = {
  getQuote: (fromCurrency: string, toCurrency: string, amount: number) =>
    api.post('/swap/quote', { fromCurrency, toCurrency, amount }),

  execute: (fromCurrency: string, toCurrency: string, amount: number) =>
    api.post('/swap/execute', { fromCurrency, toCurrency, amount }),

  getHistory: () => api.get('/swap/history'),
};

// Perp APIs
export const perpApi = {
  openPosition: (pair: string, size: number, leverage: number, side: 'long' | 'short') =>
    api.post('/perp/open', { pair, size, leverage, side }),

  closePosition: (positionId: string) =>
    api.post('/perp/close', { positionId }),

  getPositions: () => api.get('/perp/positions'),
};

// Treasury APIs
export const treasuryApi = {
  getBalances: () => api.get('/treasury/balances'),

  rebalance: (targetAllocations: Record<string, number>) =>
    api.post('/treasury/rebalance', { targetAllocations }),

  payout: (fromRegion: string, toRegion: string, currency: string, amount: number) =>
    api.post('/treasury/payout', { fromRegion, toRegion, currency, amount }),

  getPayouts: () => api.get('/treasury/payouts'),
};

// Oracle API
export const oracleApi = {
  getPrices: () => api.get('/oracle/prices'),
};
