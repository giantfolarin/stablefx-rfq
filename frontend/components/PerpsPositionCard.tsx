'use client'

interface PerpsPositionCardProps {
  pair: string
  size: number
  leverage: number
  entryPrice: number
  markPrice: number
  pnl: number
  pnlPercent: number
  liquidationPrice: number
  side: 'LONG' | 'SHORT'
}

export default function PerpsPositionCard({
  pair,
  size,
  leverage,
  entryPrice,
  markPrice,
  pnl,
  pnlPercent,
  liquidationPrice,
  side
}: PerpsPositionCardProps) {
  const isProfit = pnl >= 0
  const isLong = side === 'LONG'

  return (
    <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:shadow-card-hover transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-display font-bold text-xl text-slate-950">{pair}</h4>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              isLong ? 'bg-fx-100 text-fx-700' : 'bg-red-100 text-red-700'
            }`}>
              {side}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{leverage}x Leverage</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isProfit ? 'text-fx-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{pnl.toFixed(2)} USDC
          </div>
          <div className={`text-sm font-semibold ${isProfit ? 'text-fx-500' : 'text-red-500'}`}>
            {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Size</p>
          <p className="font-semibold text-slate-950">{size.toLocaleString()} USDC</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Entry Price</p>
          <p className="font-semibold text-slate-950">{entryPrice.toFixed(4)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Mark Price</p>
          <p className="font-semibold text-arc-600">{markPrice.toFixed(4)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Liq. Price</p>
          <p className="font-semibold text-red-600">{liquidationPrice.toFixed(4)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button className="flex-1 px-4 py-2.5 bg-arc-500 hover:bg-arc-600 text-white font-semibold rounded-lg transition-colors">
          Add Margin
        </button>
        <button className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors">
          Close Position
        </button>
      </div>
    </div>
  )
}
