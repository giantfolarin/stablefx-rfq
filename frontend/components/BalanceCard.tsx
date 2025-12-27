'use client'

interface BalanceCardProps {
  currency: string
  amount: number
  percentage: number
  icon?: string
  chainName?: string
}

export default function BalanceCard({
  currency,
  amount,
  percentage,
  icon = '💰',
  chainName
}: BalanceCardProps) {
  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-card-hover transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-arc rounded-xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <h4 className="font-display font-bold text-lg text-slate-950">{currency}</h4>
            {chainName && (
              <p className="text-xs text-gray-500 mt-0.5">{chainName}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-600">{percentage}%</div>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-fx rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-bold text-slate-950">
          {formatAmount(amount)}
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Available</span>
          <span className="w-1.5 h-1.5 bg-fx-400 rounded-full animate-pulse"></span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <button className="text-sm font-semibold text-arc-600 hover:text-arc-700 transition-colors">
          Transfer →
        </button>
        <button className="text-sm font-semibold text-gray-600 hover:text-slate-950 transition-colors">
          Details
        </button>
      </div>
    </div>
  )
}
