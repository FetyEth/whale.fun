import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TradeWidgetProps {
  tradeMode: 'Buy' | 'Sell';
  setTradeMode: (mode: 'Buy' | 'Sell') => void;
  amount: string;
  setAmount: (amount: string) => void;
  executeTrade: () => void;
  tokenSymbol: string;
  userBalance: string;
  userTokenBalance: string;
}

const TradeWidget: React.FC<TradeWidgetProps> = ({ 
  tradeMode, 
  setTradeMode, 
  amount, 
  setAmount, 
  executeTrade, 
  tokenSymbol,
  userBalance,
  userTokenBalance
}) => {

  const handleSetMax = () => {
    if (tradeMode === 'Buy') {
      setAmount((parseFloat(userBalance) * 0.98).toFixed(4));
    } else {
      setAmount(parseFloat(userTokenBalance).toFixed(4));
    }
  };

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-4">
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setTradeMode('Buy')}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            tradeMode === 'Buy' ? 'bg-gray-700' : 'hover:bg-gray-700/50'
          }`}>
          Buy
        </button>
        <button
          onClick={() => setTradeMode('Sell')}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            tradeMode === 'Sell' ? 'bg-gray-700' : 'hover:bg-gray-700/50'
          }`}>
          Sell
        </button>
      </div>

      <div className="relative">
        <Input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-gray-800 border-none rounded-lg h-12 text-lg w-full pr-24"
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <Button variant="ghost" className="text-sm text-gray-400 hover:bg-gray-700">
            {tradeMode === 'Buy' ? 'ETH' : tokenSymbol}
          </Button>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <button onClick={() => setAmount((parseFloat(tradeMode === 'Buy' ? userBalance : userTokenBalance) * 0.1).toFixed(4))} className="hover:text-white transition-colors">10%</button>
        <button onClick={() => setAmount((parseFloat(tradeMode === 'Buy' ? userBalance : userTokenBalance) * 0.25).toFixed(4))} className="hover:text-white transition-colors">25%</button>
        <button onClick={() => setAmount((parseFloat(tradeMode === 'Buy' ? userBalance : userTokenBalance) * 0.5).toFixed(4))} className="hover:text-white transition-colors">50%</button>
        <button onClick={handleSetMax} className="hover:text-white transition-colors">Max</button>
      </div>

      <Button onClick={executeTrade} className="w-full bg-white text-black font-bold hover:bg-gray-200">
        {tradeMode} ${tokenSymbol}
      </Button>
    </div>
  );
};

export default TradeWidget;
