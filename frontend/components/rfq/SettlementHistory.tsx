'use client'

import { useRFQHistory } from '@/hooks/useRFQHistory'
import { formatUnits } from 'ethers'

const EXPLORER_URL = 'https://testnet.arcscan.app/tx'

export default function SettlementHistory() {
  const { events, isLoading, error, getTokenSymbol } = useRFQHistory()

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // PRODUCTION FIX: Better loading state
  if (isLoading && events.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-[#E5E7EB] mb-4 tracking-tight">Settlement History</h3>
        <div className="text-center py-8">
          <p className="text-[13px] text-[#9CA3AF]">Loading settlement history...</p>
        </div>
      </div>
    )
  }

  // PRODUCTION FIX: Professional error state (no red, no raw errors)
  if (error) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-[#E5E7EB] mb-4 tracking-tight">Settlement History</h3>
        <div className="text-center py-8">
          <p className="text-[13px] text-[#9CA3AF] mb-2">Settlement history temporarily unavailable.</p>
          <p className="text-[11px] text-[#6B7280]">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-[20px] font-bold text-[#E5E7EB] tracking-tight">Settlement History</h3>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Onchain RFQSettled events from the contract
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#9CA3AF] text-[13px]">No settlements yet</p>
          <p className="text-[13px] text-[#6B7280] mt-2">
            Events will appear here once RFQs are settled onchain
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#374151]">
                <th className="text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Maker</th>
                <th className="text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Taker</th>
                <th className="text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Pair</th>
                <th className="text-right text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Amount In</th>
                <th className="text-right text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Amount Out</th>
                <th className="text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Time</th>
                <th className="text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide pb-3 px-2">Tx</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => {
                const tokenInSymbol = getTokenSymbol(event.tokenIn)
                const tokenOutSymbol = getTokenSymbol(event.tokenOut)

                return (
                  <tr
                    key={`${event.transactionHash}-${idx}`}
                    className="border-b border-[#1F2937] hover:bg-[#161E2E] transition-colors duration-150"
                  >
                    <td className="py-3 px-2">
                      <span className="text-[12px] font-mono text-[#9CA3AF]">
                        {formatAddress(event.maker)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[12px] font-mono text-[#9CA3AF]">
                        {formatAddress(event.taker)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[12px] font-semibold text-[#E5E7EB] font-mono">
                        {tokenInSymbol} → {tokenOutSymbol}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-[12px] text-[#F87171] font-mono font-semibold">
                        {formatUnits(event.amountIn, 6)} {tokenInSymbol}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-[12px] text-[#34D399] font-mono font-semibold">
                        {formatUnits(event.amountOut, 6)} {tokenOutSymbol}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[11px] text-[#6B7280]">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <a
                        href={`${EXPLORER_URL}/${event.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#93C5FD] hover:text-[#BFDBFE] font-mono hover:underline transition-colors"
                      >
                        {formatAddress(event.transactionHash)}
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 text-[11px] text-[#6B7280] text-center font-mono">
          Showing last {events.length} settlement{events.length !== 1 ? 's' : ''} from the past 10,000 blocks
        </div>
      )}
    </div>
  )
}
