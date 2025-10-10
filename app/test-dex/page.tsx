'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAccount, usePublicClient, useWalletClient, useConnect, useDisconnect } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { injected } from 'wagmi/connectors';
import mainnetAddresses from '@/contracts/deployments/mainnet-addresses.json';

// Import contract addresses from mainnet-addresses.json
const DEX_CONTRACTS = {
  WETH: (mainnetAddresses as any).contracts.WETH,
  DexFactory: (mainnetAddresses as any).contracts.DexFactory,
  DexRouter: (mainnetAddresses as any).contracts.DexRouter,
  QUOTER: (mainnetAddresses as any).contracts.QUOTER,
  NFT: (mainnetAddresses as any).contracts.NFT,
} as const;

// Popular tokens on 0G Mainnet - From Jaine DEX
const MAINNET_TOKENS = [
  {
    address: '0x564770837Ef8bbF077cFe54E5f6106538c815B22',
    symbol: 'stgWETH',
    name: 'Bridged WETH',
    decimals: 18,
    logo: '🟣',
    image: '/tokens/stgeth.png',
  },
  {
    address: '0x9FBBAFC2Ad79af2b57eD23C60DfF79eF5c2b0FB5',
    symbol: 'stgUSDT',
    name: 'Bridged stgUSDT',
    decimals: 6,
    logo: '💚',
    image: '/tokens/stgusdt.png',
  },
  {
    address: '0x8a2B28364102Bea189D99A475C494330Ef2bDD0B',
    symbol: 'stgUSDC',
    name: 'Bridged USDC (Stargate)',
    decimals: 6,
    logo: '💠',
    image: '/tokens/stgusdc.png',
  },
  {
    address: '0x1Cd0690fF9a693f5EF2dD976660a8dAFc81A109c',
    symbol: 'W0G',
    name: 'Wrapped 0G',
    decimals: 18,
    logo: '💎',
    image: '/tokens/wa0gi.png',
  },
  {
    address: '0x7bBC63D01CA42491c3E084C941c3E86e55951404',
    symbol: 'st0G',
    name: 'Gimo Staked 0G',
    decimals: 18,
    logo: '🔵',
    image: '/tokens/stOG.svg',
  },
  {
    address: '0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E',
    symbol: 'USDC.e',
    name: 'Bridged USDC',
    decimals: 6,
    logo: '💵',
    image: '/tokens/USDCe.svg',
  },
  {
    address: '0x161a128567BF0C005b58211757F7e46eed983F02',
    symbol: 'wstETH',
    name: 'Wrapped stETH',
    decimals: 18,
    logo: '⚗️',
    image: '/tokens/wstETH.svg',
  },
  {
    address: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C',
    symbol: 'PAI',
    name: 'Panda AI',
    decimals: 18,
    logo: '🐼',
    image: '/tokens/PAI.svg',
  },
];

// Factory ABI to get pool address
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Pool ABI to get slot0 (current price)
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Quoter ABI (from user-provided mainnet contract at 0xd008...be02)
const QUOTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Router ABI for swap functions (struct-based params per mainnet router)
const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string; // emoji fallback
  image?: string; // optional path under /public
}

// Small helper to render token icon with graceful fallback
const TokenIcon: React.FC<{ token: Token; size?: number }> = ({ token, size = 24 }) => {
  const [failed, setFailed] = useState(false);
  if (token.image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={token.image}
        alt={token.symbol}
        width={size}
        height={size}
        className="rounded-full object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="text-2xl leading-none">{token.logo}</span>;
};

const TestDexPage = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [tokenIn, setTokenIn] = useState<Token | null>(MAINNET_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [balanceIn, setBalanceIn] = useState<string>('0');
  const [balanceOut, setBalanceOut] = useState<string>('0');
  const [customTokenAddress, setCustomTokenAddress] = useState<string>('');
  const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
  const [detectedFee, setDetectedFee] = useState<700 | 500 | 3000 | 10000 | null>(null);

  // Fetch token balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address || !publicClient || !isConnected) return;

      try {
        if (tokenIn && tokenIn.address !== '0x0000000000000000000000000000000000000000') {
          try {
            const balance = await publicClient.readContract({
              address: tokenIn.address as Address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            });
            setBalanceIn(formatUnits(balance, tokenIn.decimals));
          } catch (err) {
            console.log('Token In balance fetch failed, setting to 0');
            setBalanceIn('0');
          }
        } else if (tokenIn) {
          const balance = await publicClient.getBalance({ address });
          setBalanceIn(formatUnits(balance, 18));
        }

        if (tokenOut && tokenOut.address !== '0x0000000000000000000000000000000000000000') {
          try {
            const balance = await publicClient.readContract({
              address: tokenOut.address as Address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            });
            setBalanceOut(formatUnits(balance, tokenOut.decimals));
          } catch (err) {
            console.log('Token Out balance fetch failed, setting to 0');
            setBalanceOut('0');
          }
        } else if (tokenOut) {
          const balance = await publicClient.getBalance({ address });
          setBalanceOut(formatUnits(balance, 18));
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
      }
    };

    fetchBalances();
  }, [address, publicClient, isConnected, tokenIn, tokenOut]);

  // Get quote when amount changes (use on-chain Quoter)
  useEffect(() => {
    const getQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || !publicClient) {
        setAmountOut('');
        setDetectedFee(null);
        return;
      }

      if (parseFloat(amountIn) <= 0) {
        setAmountOut('');
        setDetectedFee(null);
        return;
      }

      try {
        setQuoting(true);
        setError('');
        const amountInWei = parseUnits(amountIn, tokenIn.decimals);

        // Try common fee tiers until one succeeds
        const feeTiers: Array<500 | 3000 | 10000> = [500, 3000, 10000];
        let found: { out: bigint; fee: 500 | 3000 | 10000 } | null = null;

        for (const fee of feeTiers) {
          try {
            const quoted: bigint = await publicClient.readContract({
              address: DEX_CONTRACTS.QUOTER as Address,
              abi: QUOTER_ABI,
              functionName: 'quoteExactInputSingle',
              args: [
                tokenIn.address as Address,
                tokenOut.address as Address,
                fee,
                amountInWei,
                BigInt(0),
              ],
            });
            if (quoted && quoted > BigInt(0)) {
              found = { out: quoted, fee };
              break;
            }
          } catch (_) {
            // try next fee tier
          }
        }

        if (!found) {
          setDetectedFee(null);
          setAmountOut('');
          setError('No pool/liquidity found for this pair.');
          return;
        }

        setDetectedFee(found.fee);
        setAmountOut(formatUnits(found.out, tokenOut.decimals));
      } catch (err: any) {
        console.error('Quote error:', err);
        setAmountOut('');
        setDetectedFee(null);
      } finally {
        setQuoting(false);
      }
    };

    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [amountIn, tokenIn, tokenOut, publicClient]);

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  const switchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
    setAmountOut('');
  };

  const handleSwap = async () => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      setError('Please connect your wallet');
      return;
    }

    if (!tokenIn || !tokenOut || !amountIn) {
      setError('Please fill in all fields');
      return;
    }

    if (!detectedFee) {
      setError('No pool found for this pair/fee. Try a different direction or token.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTxHash('');

      const amountInWei = parseUnits(amountIn, tokenIn.decimals);

      // Approve router to spend tokens (skip for native token)
      if (tokenIn.address !== '0x0000000000000000000000000000000000000000') {
        const approveTx = await walletClient.writeContract({
          address: tokenIn.address as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [DEX_CONTRACTS.DexRouter as Address, amountInWei],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Calculate minimum amount out with slippage
      const slippagePercent = parseFloat(slippage);
      // If user provided expected output, use it with slippage
      // Otherwise, set minAmountOut to 0 (accept any amount - risky but allows swap without quote)
      const minAmountOut = amountOut && parseFloat(amountOut) > 0
        ? parseUnits(
            (parseFloat(amountOut) * (1 - slippagePercent / 100)).toFixed(6),
            tokenOut.decimals
          )
        : BigInt(0);

      // Execute swap
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes

      const swapTx = await walletClient.writeContract({
        address: DEX_CONTRACTS.DexRouter as Address,
        abi: ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [
          {
            tokenIn: tokenIn.address as Address,
            tokenOut: tokenOut.address as Address,
            fee: detectedFee,
            recipient: address as Address,
            deadline,
            amountIn: amountInWei,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
        value: tokenIn.address === '0x0000000000000000000000000000000000000000' ? amountInWei : BigInt(0),
      });

      await publicClient.waitForTransactionReceipt({ hash: swapTx });
      setTxHash(swapTx);
      setError('');
      setAmountIn('');
      setAmountOut('');
    } catch (err: any) {
      console.error('Swap error:', err);
      setError(err.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-5xl font-bold text-white">
              🐋 Jainedex DEX
            </h1>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 border border-green-500 rounded-lg px-4 py-2">
                  <p className="text-green-300 text-sm font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-500/20 border border-red-500 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg"
              >
                Connect Wallet
              </button>
            )}
          </div>
          <p className="text-gray-300 text-lg">
            Decentralized Exchange on 0G Mainnet
          </p>
        </div>

        {/* Contract Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">
            📋 Contract Addresses
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Router:</span>
              <code className="text-purple-300 bg-black/30 px-3 py-1 rounded">
                {DEX_CONTRACTS.DexRouter.slice(0, 10)}...
                {DEX_CONTRACTS.DexRouter.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Factory:</span>
              <code className="text-purple-300 bg-black/30 px-3 py-1 rounded">
                {DEX_CONTRACTS.DexFactory.slice(0, 10)}...
                {DEX_CONTRACTS.DexFactory.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">WETH:</span>
              <code className="text-purple-300 bg-black/30 px-3 py-1 rounded">
                {DEX_CONTRACTS.WETH.slice(0, 10)}...
                {DEX_CONTRACTS.WETH.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Quoter:</span>
              <code className="text-purple-300 bg-black/30 px-3 py-1 rounded">
                {DEX_CONTRACTS.QUOTER.slice(0, 10)}...
                {DEX_CONTRACTS.QUOTER.slice(-8)}
              </code>
            </div>
          </div>
        </div>

        {/* Swap Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Swap Tokens</h2>

          {/* Token In */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-300 font-medium">From</label>
              {isConnected && tokenIn && (
                <span className="text-gray-400 text-sm">
                  Balance: {parseFloat(balanceIn).toFixed(4)} {tokenIn.symbol}
                </span>
              )}
            </div>
            <div className="relative">
              <div
                onClick={() => setShowTokenInDropdown(!showTokenInDropdown)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white cursor-pointer hover:border-purple-500 transition flex justify-between items-center"
              >
                {tokenIn ? (
                  <div className="flex items-center gap-2">
                    <TokenIcon token={tokenIn} size={24} />
                    <div>
                      <p className="font-bold">{tokenIn.symbol}</p>
                      <p className="text-xs text-gray-400">{tokenIn.name}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Select token</span>
                )}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {showTokenInDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {MAINNET_TOKENS.map((token) => (
                    <div
                      key={token.address}
                      onClick={() => {
                        setTokenIn(token);
                        setShowTokenInDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-purple-600/30 cursor-pointer transition flex items-center gap-2"
                    >
                      <TokenIcon token={token} size={20} />
                      <div>
                        <p className="font-bold text-white">{token.symbol}</p>
                        <p className="text-xs text-gray-400">{token.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount In */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full px-4 py-4 bg-black/30 border border-white/20 rounded-lg text-white text-2xl placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              />
              {isConnected && tokenIn && parseFloat(balanceIn) > 0 && (
                <button
                  onClick={() => setAmountIn(balanceIn)}
                  className="ml-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Swap Direction Icon */}
          <div className="flex justify-center my-4">
            <button
              onClick={switchTokens}
              className="bg-purple-600 rounded-full p-3 cursor-pointer hover:bg-purple-700 transition hover:scale-110"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </div>

          {/* Token Out */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-300 font-medium">To</label>
              {isConnected && tokenOut && (
                <span className="text-gray-400 text-sm">
                  Balance: {parseFloat(balanceOut).toFixed(4)} {tokenOut.symbol}
                </span>
              )}
            </div>
            <div className="relative">
              <div
                onClick={() => setShowTokenOutDropdown(!showTokenOutDropdown)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white cursor-pointer hover:border-purple-500 transition flex justify-between items-center"
              >
                {tokenOut ? (
                  <div className="flex items-center gap-2">
                    <TokenIcon token={tokenOut} size={24} />
                    <div>
                      <p className="font-bold">{tokenOut.symbol}</p>
                      <p className="text-xs text-gray-400">{tokenOut.name}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Select token</span>
                )}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {showTokenOutDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {MAINNET_TOKENS.filter(t => t.address !== tokenIn?.address).map((token) => (
                    <div
                      key={token.address}
                      onClick={() => {
                        setTokenOut(token);
                        setShowTokenOutDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-purple-600/30 cursor-pointer transition flex items-center gap-2"
                    >
                      {token.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={token.image} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      ) : (
                        <span className="text-2xl">{token.logo}</span>
                      )}
                      <div>
                        <p className="font-bold text-white">{token.symbol}</p>
                        <p className="text-xs text-gray-400">{token.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expected Output */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2 font-medium">
              You will receive (estimated)
            </label>
            <div className="px-4 py-4 bg-black/30 border border-white/20 rounded-lg">
              {quoting ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Getting quote...</span>
                </div>
              ) : amountOut ? (
                <div>
                  <p className="text-white text-2xl font-bold">
                    {parseFloat(amountOut).toFixed(6)} {tokenOut?.symbol}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    💡 Price includes 0.3% trading fee
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-xl">Enter amount to see quote</p>
              )}
            </div>
          </div>

          {/* Slippage */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 font-medium">
              Slippage Tolerance (%)
            </label>
            <div className="flex gap-2">
              {['0.1', '0.5', '1.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    slippage === value
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
                step="0.1"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Success Message */}
          {txHash && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <p className="text-green-300 mb-2">Transaction successful!</p>
              <a
                href={`https://chainscan.0g.ai/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 underline text-sm break-all"
              >
                View on Explorer
              </a>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={loading || !isConnected}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              loading || !isConnected
                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : (
              'Swap'
            )}
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>⚠️ Always verify token addresses before swapping</p>
          <p className="mt-2">Network: 0G Mainnet (Chain ID: 16661)</p>
        </div>
      </div>
    </div>
  );
};

export default TestDexPage;