import { USDC_ADDRESS, EURC_ADDRESS } from './contracts'

export interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  icon: string
  description: string
}

// ONLY tokens supported by the deployed contract (constructor allowlist)
export const TOKENS: Record<string, Token> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: USDC_ADDRESS,
    decimals: 6,
    icon: '🔵',
    description: 'Native EVM asset on Arc, used for gas fees'
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: EURC_ADDRESS,
    decimals: 6,
    icon: '🟢',
    description: 'Euro-denominated stablecoin issued by Circle'
  }
}

export const TOKEN_LIST = Object.values(TOKENS)

export function getTokenByAddress(address: string): Token | undefined {
  return TOKEN_LIST.find(t => t.address.toLowerCase() === address.toLowerCase())
}

export function getTokenBySymbol(symbol: string): Token | undefined {
  return TOKENS[symbol.toUpperCase()]
}
