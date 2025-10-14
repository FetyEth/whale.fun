"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import Header from "@/components/layout/Header";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useConnect,
  useDisconnect,
} from "wagmi";
import {
  parseUnits,
  formatUnits,
  Address,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";
import { injected } from "wagmi/connectors";
import mainnetAddresses from "@/contracts/deployments/mainnet-addresses.json";

// Import contract addresses from mainnet-addresses.json
const DEX_CONTRACTS = {
  WETH: (mainnetAddresses as any).contracts.WETH,
  DexFactory: (mainnetAddresses as any).contracts.DexFactory,
  DexRouter: (mainnetAddresses as any).contracts.DexRouter,
  QUOTER: (mainnetAddresses as any).contracts.QUOTER,
  NFT: (mainnetAddresses as any).contracts.NFT,
  V3MULTICALL: (mainnetAddresses as any).contracts.V3MULTICALL,
} as const;

// Popular tokens on 0G Mainnet - From Jaine DEX
const MAINNET_TOKENS = [
  {
    address: "0x564770837Ef8bbF077cFe54E5f6106538c815B22",
    symbol: "stgWETH",
    name: "Bridged WETH",
    decimals: 18,
    logo: "🟣",
    image: "/tokens/stgeth.png",
  },
  {
    address: "0x9FBBAFC2Ad79af2b57eD23C60DfF79eF5c2b0FB5",
    symbol: "stgUSDT",
    name: "Bridged stgUSDT",
    decimals: 6,
    logo: "💚",
    image: "/tokens/stgusdt.png",
  },
  {
    address: "0x8a2B28364102Bea189D99A475C494330Ef2bDD0B",
    symbol: "stgUSDC",
    name: "Bridged USDC (Stargate)",
    decimals: 6,
    logo: "💠",
    image: "/tokens/stgusdc.png",
  },
  {
    address: "0x1Cd0690fF9a693f5EF2dD976660a8dAFc81A109c",
    symbol: "W0G",
    name: "Wrapped 0G",
    decimals: 18,
    logo: "💎",
    image: "/tokens/wa0gi.png",
  },
  {
    address: "0x7bBC63D01CA42491c3E084C941c3E86e55951404",
    symbol: "st0G",
    name: "Gimo Staked 0G",
    decimals: 18,
    logo: "🔵",
    image: "/tokens/stOG.svg",
  },
  {
    address: "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    logo: "💵",
    image: "/tokens/USDCe.svg",
  },
  {
    address: "0x161a128567BF0C005b58211757F7e46eed983F02",
    symbol: "wstETH",
    name: "Wrapped stETH",
    decimals: 18,
    logo: "⚗️",
    image: "/tokens/wstETH.svg",
  },
  {
    address: "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    symbol: "PAI",
    name: "Panda AI",
    decimals: 18,
    logo: "🐼",
    image: "/tokens/PAI.svg",
  },
];

// Factory ABI to get pool address
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Jaine V3 Multicall ABI (batch eth_call)
const V3_MULTICALL_ABI = [
  {
    name: "getCurrentBlockTimestamp",
    type: "function",
    inputs: [],
    outputs: [{ name: "timestamp", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getEthBalance",
    type: "function",
    inputs: [{ name: "addr", type: "address", internalType: "address" }],
    outputs: [{ name: "balance", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "multicall",
    type: "function",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        internalType: "struct jaineV3Multicall.Call[]",
        components: [
          { name: "target", type: "address", internalType: "address" },
          { name: "gasLimit", type: "uint256", internalType: "uint256" },
          { name: "callData", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "blockNumber", type: "uint256", internalType: "uint256" },
      {
        name: "returnData",
        type: "tuple[]",
        internalType: "struct jaineV3Multicall.Result[]",
        components: [
          { name: "success", type: "bool", internalType: "bool" },
          { name: "gasUsed", type: "uint256", internalType: "uint256" },
          { name: "returnData", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    stateMutability: "nonpayable",
  },
];

// Pool ABI to get slot0 (current price)
const POOL_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      {
        internalType: "uint16",
        name: "observationCardinality",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16",
      },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Quoter ABI (from user-provided mainnet contract at 0xd008...be02)
const QUOTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "path", type: "bytes" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
    ],
    name: "quoteExactInput",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Router ABI for swap functions (struct-based params per mainnet router)
const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountOutMinimum",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "bytes", name: "path", type: "bytes" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountOutMinimum",
            type: "uint256",
          },
        ],
        internalType: "struct ISwapRouter.ExactInputParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInput",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
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
const TokenIcon: React.FC<{ token: Token; size?: number }> = ({
  token,
  size = 24,
}) => {
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

  const [tokenIn, setTokenIn] = useState<Token | null>(MAINNET_TOKENS[3]);
  const [tokenOut, setTokenOut] = useState<Token | null>(MAINNET_TOKENS[5]);
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  const [slippage, setSlippage] = useState<string>("0.5");
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [deadlineMinutes, setDeadlineMinutes] = useState<string>("20");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [balanceIn, setBalanceIn] = useState<string>("0");
  const [balanceOut, setBalanceOut] = useState<string>("0");
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
  const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
  const [detectedFee, setDetectedFee] = useState<
    100 | 500 | 700 | 3000 | 10000 | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<
    "single" | "usdc_e" | "stg_usdc" | "stg_usdt" | "stg_weth" | null
  >(null);
  const [selectedPathBytes, setSelectedPathBytes] = useState<
    `0x${string}` | null
  >(null);
  const [selectedFees, setSelectedFees] = useState<{
    fee?: number;
    fee1?: number;
    fee2?: number;
  } | null>(null);
  const [expandSearch, setExpandSearch] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const USDC_E = "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E";
  const STG_USDC = "0x8a2B28364102Bea189D99A475C494330Ef2bDD0B";
  const [tokenInReady, setTokenInReady] = useState<boolean>(false);
  const [tokenOutReady, setTokenOutReady] = useState<boolean>(false);
  const poolsCacheRef = React.useRef<Map<string, string>>(new Map()); // key: `${a}-${b}-${fee}` => pool
  const quoteCacheRef = React.useRef<Map<string, bigint>>(new Map()); // key: `${pathHex}-${amountInWei}` => out

  // Fetch token balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address || !publicClient || !isConnected) return;

      try {
        if (
          tokenIn &&
          tokenIn.address !== "0x0000000000000000000000000000000000000000"
        ) {
          try {
            const balance = await publicClient.readContract({
              address: tokenIn.address as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            });
            setBalanceIn(formatUnits(balance, tokenIn.decimals));
          } catch (err) {
            console.log("Token In balance fetch failed, setting to 0");
            setBalanceIn("0");
          }
        } else if (tokenIn) {
          const balance = await publicClient.getBalance({ address });
          setBalanceIn(formatUnits(balance, 18));
        }

        if (
          tokenOut &&
          tokenOut.address !== "0x0000000000000000000000000000000000000000"
        ) {
          try {
            const balance = await publicClient.readContract({
              address: tokenOut.address as Address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            });
            setBalanceOut(formatUnits(balance, tokenOut.decimals));
          } catch (err) {
            console.log("Token Out balance fetch failed, setting to 0");
            setBalanceOut("0");
          }
        } else if (tokenOut) {
          const balance = await publicClient.getBalance({ address });
          setBalanceOut(formatUnits(balance, 18));
        }
      } catch (err) {
        console.error("Error fetching balances:", err);
      }
    };

    fetchBalances();
  }, [address, publicClient, isConnected, tokenIn, tokenOut]);

  // Fetch allowance for router when tokenIn or address changes or amountIn updates
  useEffect(() => {
    const loadAllowance = async () => {
      try {
        if (!publicClient || !address || !tokenIn) return;
        // native token has no allowance
        if (tokenIn.address === "0x0000000000000000000000000000000000000000") {
          setAllowance(BigInt(2) ** BigInt(256) - BigInt(1));
          return;
        }
        const value: bigint = await publicClient.readContract({
          address: tokenIn.address as Address,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as Address, DEX_CONTRACTS.DexRouter as Address],
        });
        setAllowance(value);
      } catch {
        setAllowance(BigInt(0));
      }
    };
    loadAllowance();
  }, [publicClient, address, tokenIn, amountIn]);

  // Ensure decimals are correct by reading from chain when token changes
  useEffect(() => {
    const loadMeta = async () => {
      if (!publicClient || !tokenIn) return;
      try {
        setTokenInReady(false);
        const onChainDecimals: number = await publicClient.readContract({
          address: tokenIn.address as Address,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
        if (onChainDecimals !== tokenIn.decimals) {
          setTokenIn({ ...tokenIn, decimals: Number(onChainDecimals) });
        }
      } catch (_) {
        // ignore, keep provided decimals
      } finally {
        setTokenInReady(true);
      }
    };
    loadMeta();
  }, [tokenIn, publicClient]);

  useEffect(() => {
    const loadMeta = async () => {
      if (!publicClient || !tokenOut) return;
      try {
        setTokenOutReady(false);
        const onChainDecimals: number = await publicClient.readContract({
          address: tokenOut.address as Address,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
        if (onChainDecimals !== tokenOut.decimals) {
          setTokenOut({ ...tokenOut, decimals: Number(onChainDecimals) });
        }
      } catch (_) {
        // ignore, keep provided decimals
      } finally {
        setTokenOutReady(true);
      }
    };
    loadMeta();
  }, [tokenOut, publicClient]);

  // Get quote when amount changes (factory-pruned, single multicall)
  useEffect(() => {
    const getQuote = async () => {
      if (
        !tokenIn ||
        !tokenOut ||
        !amountIn ||
        !publicClient ||
        !tokenInReady ||
        !tokenOutReady
      ) {
        setAmountOut("");
        setDetectedFee(null);
        setSelectedPath(null);
        setSelectedPathBytes(null);
        setSelectedFees(null);
        return;
      }

      if (parseFloat(amountIn) <= 0) {
        setAmountOut("");
        setDetectedFee(null);
        setSelectedPath(null);
        setSelectedPathBytes(null);
        setSelectedFees(null);
        return;
      }

      try {
        setQuoting(true);
        setError("");
        const amountInWei = parseUnits(amountIn, tokenIn.decimals);

        // Fee tiers and mids (fast by default, expanded when toggle on)
        const feeTiers: number[] = expandSearch
          ? [100, 300, 500, 700, 2500, 3000]
          : [100, 500, 3000];
        const mids = expandSearch
          ? [
              {
                addr: "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E",
                label: "usdc_e",
              },
              {
                addr: "0x8a2B28364102Bea189D99A475C494330Ef2bDD0B",
                label: "stg_usdc",
              },
              {
                addr: "0x9FBBAFC2Ad79af2b57eD23C60DfF79eF5c2b0FB5",
                label: "stg_usdt",
              },
              {
                addr: "0x564770837Ef8bbF077cFe54E5f6106538c815B22",
                label: "stg_weth",
              },
            ]
          : [
              {
                addr: "0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E",
                label: "usdc_e",
              },
              {
                addr: "0x8a2B28364102Bea189D99A475C494330Ef2bDD0B",
                label: "stg_usdc",
              },
            ];

        // Helpers
        const encodePath = (
          segments: Array<string | number>
        ): `0x${string}` => {
          const hex = segments
            .map((seg) =>
              typeof seg === "string"
                ? seg.toLowerCase().replace(/^0x/, "")
                : seg.toString(16).padStart(6, "0")
            )
            .join("");
          return ("0x" + hex) as `0x${string}`;
        };

        // Batch factory getPool calls via V3MULTICALL and cache
        const probePairs: Array<{ a: string; b: string; fee: number }> = [];
        for (const f of feeTiers)
          probePairs.push({ a: tokenIn.address, b: tokenOut.address, fee: f });
        for (const m of mids)
          for (const f1 of feeTiers)
            probePairs.push({ a: tokenIn.address, b: m.addr, fee: f1 });
        for (const m of mids)
          for (const f2 of feeTiers)
            probePairs.push({ a: m.addr, b: tokenOut.address, fee: f2 });

        const callsPools: Array<{
          target: Address;
          gasLimit: bigint;
          callData: `0x${string}`;
        }> = [];
        const needIdx: number[] = [];
        probePairs.forEach((p, idx) => {
          const key = `${p.a.toLowerCase()}-${p.b.toLowerCase()}-${p.fee}`;
          if (!poolsCacheRef.current.has(key)) {
            const callData = encodeFunctionData({
              abi: FACTORY_ABI as any,
              functionName: "getPool",
              args: [p.a as Address, p.b as Address, p.fee as any],
            });
            callsPools.push({
              target: DEX_CONTRACTS.DexFactory as Address,
              gasLimit: BigInt(300_000),
              callData,
            });
            needIdx.push(idx);
          }
        });
        if (callsPools.length) {
          const [, returnData] = (await publicClient.readContract({
            address: DEX_CONTRACTS.V3MULTICALL as Address,
            abi: V3_MULTICALL_ABI as any,
            functionName: "multicall",
            args: [callsPools],
          })) as [
            bigint,
            Array<{
              success: boolean;
              gasUsed: bigint;
              returnData: `0x${string}`;
            }>
          ];
          returnData.forEach((rd, i) => {
            const pair = probePairs[needIdx[i]];
            const key = `${pair.a.toLowerCase()}-${pair.b.toLowerCase()}-${
              pair.fee
            }`;
            if (!rd.success) {
              poolsCacheRef.current.set(
                key,
                "0x0000000000000000000000000000000000000000"
              );
              return;
            }
            try {
              const pool = decodeFunctionResult({
                abi: FACTORY_ABI as any,
                functionName: "getPool",
                data: rd.returnData,
              }) as unknown as Address;
              poolsCacheRef.current.set(key, (pool as string).toLowerCase());
            } catch {
              poolsCacheRef.current.set(
                key,
                "0x0000000000000000000000000000000000000000"
              );
            }
          });
        }

        // Build candidates based on discovered pools
        const singleHopCandidates: Array<{ fee: number }> = [];
        for (const f of feeTiers) {
          const k = `${tokenIn.address.toLowerCase()}-${tokenOut.address.toLowerCase()}-${f}`;
          const pool = poolsCacheRef.current.get(k);
          if (pool && pool !== "0x0000000000000000000000000000000000000000")
            singleHopCandidates.push({ fee: f });
        }

        const twoHopCandidates: Array<{
          mid: string;
          fee1: number;
          fee2: number;
          label: string;
          path: `0x${string}`;
        }> = [];
        for (const m of mids) {
          for (const f1 of feeTiers) {
            for (const f2 of feeTiers) {
              const k1 = `${tokenIn.address.toLowerCase()}-${m.addr.toLowerCase()}-${f1}`;
              const k2 = `${m.addr.toLowerCase()}-${tokenOut.address.toLowerCase()}-${f2}`;
              const p1 = poolsCacheRef.current.get(k1);
              const p2 = poolsCacheRef.current.get(k2);
              if (
                p1 &&
                p1 !== "0x0000000000000000000000000000000000000000" &&
                p2 &&
                p2 !== "0x0000000000000000000000000000000000000000"
              ) {
                const path = encodePath([
                  tokenIn.address,
                  f1,
                  m.addr,
                  f2,
                  tokenOut.address,
                ]);
                twoHopCandidates.push({
                  mid: m.addr,
                  fee1: f1,
                  fee2: f2,
                  label: m.label,
                  path,
                });
              }
            }
          }
        }

        // Batch Quoter calls via V3MULTICALL
        type QuoteItem =
          | { kind: "single"; fee: number }
          | {
              kind: "twohop";
              fee1: number;
              fee2: number;
              path: `0x${string}`;
              label: string;
            };
        const items: QuoteItem[] = [];
        singleHopCandidates.forEach((c) =>
          items.push({ kind: "single", fee: c.fee })
        );
        twoHopCandidates.forEach((c) =>
          items.push({
            kind: "twohop",
            fee1: c.fee1,
            fee2: c.fee2,
            path: c.path,
            label: c.label,
          })
        );

        let bestOut = BigInt(0);
        let bestMode: typeof selectedPath = null;
        let bestFeeSingle: number | null = null;
        let bestPathBytes: `0x${string}` | null = null;
        let bestFee1: number | null = null;
        let bestFee2: number | null = null;

        if (items.length) {
          const calls = items.map((it) =>
            it.kind === "single"
              ? {
                  target: DEX_CONTRACTS.QUOTER as Address,
                  gasLimit: BigInt(1_000_000),
                  callData: encodeFunctionData({
                    abi: QUOTER_ABI as any,
                    functionName: "quoteExactInputSingle",
                    args: [
                      tokenIn.address as Address,
                      tokenOut.address as Address,
                      it.fee as any,
                      amountInWei,
                      BigInt(0),
                    ],
                  }),
                }
              : {
                  target: DEX_CONTRACTS.QUOTER as Address,
                  gasLimit: BigInt(1_000_000),
                  callData: encodeFunctionData({
                    abi: QUOTER_ABI as any,
                    functionName: "quoteExactInput",
                    args: [it.path, amountInWei],
                  }),
                }
          );

          const [, returnData] = (await publicClient.readContract({
            address: DEX_CONTRACTS.V3MULTICALL as Address,
            abi: V3_MULTICALL_ABI as any,
            functionName: "multicall",
            args: [calls],
          })) as [
            bigint,
            Array<{
              success: boolean;
              gasUsed: bigint;
              returnData: `0x${string}`;
            }>
          ];

          returnData.forEach((rd, i) => {
            if (!rd.success) return;
            const it = items[i];
            const fn =
              it.kind === "single"
                ? "quoteExactInputSingle"
                : "quoteExactInput";
            try {
              const out = decodeFunctionResult({
                abi: QUOTER_ABI as any,
                functionName: fn as any,
                data: rd.returnData,
              }) as unknown as bigint;
              if (out > bestOut) {
                bestOut = out;
                if (it.kind === "single") {
                  bestMode = "single";
                  bestFeeSingle = it.fee;
                  bestPathBytes = null;
                  bestFee1 = null;
                  bestFee2 = null;
                } else {
                  bestMode = it.label as any;
                  bestFeeSingle = null;
                  bestPathBytes = it.path;
                  bestFee1 = it.fee1;
                  bestFee2 = it.fee2;
                }
              }
            } catch {}
          });
        }

        if (!bestMode) {
          setDetectedFee(null);
          setSelectedPath(null);
          setSelectedPathBytes(null);
          setSelectedFees(null);
          setAmountOut("");
          setError("No pool/liquidity found for this pair.");
          return;
        }

        setSelectedPath(bestMode);
        setSelectedPathBytes(bestPathBytes);
        setDetectedFee((bestFeeSingle as any) ?? null);
        setSelectedFees(
          bestFeeSingle != null
            ? { fee: bestFeeSingle }
            : bestFee1 != null && bestFee2 != null
            ? { fee1: bestFee1, fee2: bestFee2 }
            : null
        );
        const formatted = formatUnits(bestOut, tokenOut.decimals);
        console.log(
          "Best route:",
          bestMode,
          "fees:",
          bestFeeSingle ?? `${bestFee1}+${bestFee2}`,
          "amountOut:",
          formatted
        );
        setAmountOut(formatted);
      } catch (err: any) {
        console.error("Quote error:", err);
        setAmountOut("");
        setDetectedFee(null);
        setSelectedPath(null);
        setSelectedPathBytes(null);
        setSelectedFees(null);
      } finally {
        setQuoting(false);
      }
    };

    const timeoutId = setTimeout(getQuote, 800);
    return () => clearTimeout(timeoutId);
  }, [
    amountIn,
    tokenIn,
    tokenOut,
    publicClient,
    tokenInReady,
    tokenOutReady,
    expandSearch,
  ]);

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  const switchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn("");
    setAmountOut("");
  };

  const handleSwap = async () => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      setError("Please connect your wallet");
      return;
    }

    if (!tokenIn || !tokenOut || !amountIn) {
      setError("Please fill in all fields");
      return;
    }

    if (!detectedFee && !selectedPathBytes) {
      setError(
        "No pool found for this pair/fee. Try a different direction or token."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const amountInWei = parseUnits(amountIn, tokenIn.decimals);

      // Approve router only if needed (skip for native token)
      if (tokenIn.address !== "0x0000000000000000000000000000000000000000") {
        let currentAllowance = allowance;
        if (currentAllowance < amountInWei) {
          const approveTx = await walletClient.writeContract({
            address: tokenIn.address as Address,
            abi: ERC20_ABI,
            functionName: "approve",
            // set exact needed or choose a larger allowance; here set exact needed amount
            args: [DEX_CONTRACTS.DexRouter as Address, amountInWei],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
          currentAllowance = amountInWei;
          setAllowance(currentAllowance);
        }
      }

      // Calculate minimum amount out with slippage
      const slippagePercent = parseFloat(slippage);
      // If user provided expected output, use it with slippage
      // Otherwise, set minAmountOut to 0 (accept any amount - risky but allows swap without quote)
      const minAmountOut =
        amountOut && parseFloat(amountOut) > 0
          ? parseUnits(
              (parseFloat(amountOut) * (1 - slippagePercent / 100)).toFixed(6),
              tokenOut.decimals
            )
          : BigInt(0);

      // Execute swap using configurable deadline
      const dlMinutes = Number.parseInt(deadlineMinutes || "20", 10);
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + Math.max(1, dlMinutes) * 60
      );

      const swapTx = await walletClient.writeContract({
        address: DEX_CONTRACTS.DexRouter as Address,
        abi: ROUTER_ABI,
        functionName: selectedPathBytes ? "exactInput" : "exactInputSingle",
        args: selectedPathBytes
          ? [
              {
                path: selectedPathBytes,
                recipient: address as Address,
                deadline,
                amountIn: amountInWei,
                amountOutMinimum: minAmountOut,
              },
            ]
          : [
              {
                tokenIn: tokenIn.address as Address,
                tokenOut: tokenOut.address as Address,
                fee: detectedFee as number,
                recipient: address as Address,
                deadline,
                amountIn: amountInWei,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: BigInt(0),
              },
            ],
        value:
          tokenIn.address === "0x0000000000000000000000000000000000000000"
            ? amountInWei
            : BigInt(0),
      });

      await publicClient.waitForTransactionReceipt({ hash: swapTx });
      setTxHash(swapTx);
      setError("");
      setAmountIn("");
      setAmountOut("");
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message || "Swap failed");
    } finally {
      setLoading(false);
    }
  };

  const isSwapReady =
    isConnected &&
    !!tokenIn &&
    !!tokenOut &&
    !!amountIn &&
    parseFloat(amountIn) > 0 &&
    (!!detectedFee || !!selectedPathBytes);

  const amountInWeiForReady =
    tokenIn && amountIn ? parseUnits(amountIn, tokenIn.decimals) : BigInt(0);
  const needsApproval =
    !!tokenIn &&
    tokenIn.address !== "0x0000000000000000000000000000000000000000" &&
    isSwapReady &&
    allowance < amountInWeiForReady;

  return (
    <div className="min-h-screen bg-white relative flex flex-col w-full">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 relative">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-2xl p-4 md:p-5 border border-gray-800 relative z-10 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Swap</h2>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-300"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>

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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:border-purple-500 transition flex justify-between items-center"
              >
                {tokenIn ? (
                  <div className="flex items-center gap-3">
                    <TokenIcon token={tokenIn} size={28} />
                    <div>
                      <p className="font-bold text-lg">{tokenIn.symbol}</p>
                      <p className="text-xs text-gray-500">{tokenIn.name}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Select token</span>
                )}
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {showTokenInDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {MAINNET_TOKENS.map((token) => (
                    <div
                      key={token.address}
                      onClick={() => {
                        setTokenIn(token);
                        setShowTokenInDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-gray-800 cursor-pointer transition flex items-center gap-3"
                    >
                      <TokenIcon token={token} size={24} />
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
          <div className="mb-2">
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-xl placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              />
              {isConnected && tokenIn && parseFloat(balanceIn) > 0 && (
                <button
                  onClick={() => setAmountIn(balanceIn)}
                  className="ml-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Swap Direction Icon */}
          <div className="flex justify-center my-2">
            <button
              onClick={switchTokens}
              className="bg-purple-600 rounded-full p-2 cursor-pointer hover:bg-purple-700 transition hover:scale-110"
            >
              <svg
                className="w-5 h-5 text-white"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-pointer hover:border-purple-500 transition flex justify-between items-center"
              >
                {tokenOut ? (
                  <div className="flex items-center gap-3">
                    <TokenIcon token={tokenOut} size={28} />
                    <div>
                      <p className="font-bold text-lg">{tokenOut.symbol}</p>
                      <p className="text-xs text-gray-500">{tokenOut.name}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">Select token</span>
                )}
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {showTokenOutDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {MAINNET_TOKENS.filter(
                    (t) => t.address !== tokenIn?.address
                  ).map((token) => (
                    <div
                      key={token.address}
                      onClick={() => {
                        setTokenOut(token);
                        setShowTokenOutDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-gray-800 cursor-pointer transition flex items-center gap-3"
                    >
                      <TokenIcon token={token} size={24} />
                      <div>
                        <p className="font-bold text-white">{token.symbol}</p>
                        <p className="text-xs text-gray-400">{token.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Read-only quoted To amount (below To token) */}
            <div className="mt-2.5">
              <input
                type="text"
                readOnly
                value={quoting ? "Fetching…" : amountOut || ""}
                aria-busy={quoting}
                placeholder={quoting ? "Fetching…" : "0.00"}
                className={`w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-xl focus:outline-none ${
                  quoting ? "text-gray-400 italic" : "text-white"
                } placeholder-gray-500`}
              />
            </div>
            {/* <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center ml-4">
                <input
                  type="checkbox"
                  id="expand-search"
                  checked={expandSearch}
                  onChange={(e) => setExpandSearch(e.target.checked)}
                  className="h-4 w-4 text-purple-500 focus:ring-purple-500 border-gray-700 rounded bg-gray-800"
                />
                <label htmlFor="expand-search" className="ml-2 block text-sm text-gray-300">
                  Expand search
                </label>
              </div>
              <div />
            </div> */}

            {/* Details Rows */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Minimum received</span>
                <span className="text-white">
                  {amountOut && parseFloat(amountOut) > 0
                    ? (
                        parseFloat(amountOut) *
                        (1 - (parseFloat(slippage || "0") || 0) / 100)
                      ).toFixed(6)
                    : "0.00"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Slippage</span>
                <span className="text-white">{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price Impact</span>
                <span className="text-white">0.00%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Realized LP Fee</span>
                <span className="text-white">
                  {(() => {
                    const sf = selectedFees;
                    if (sf) {
                      if (typeof (sf as any).fee === "number") {
                        return `${(((sf as any).fee as number) / 10000).toFixed(
                          3
                        )}%`;
                      }
                      const f1 = (sf as any).fee1 || 0;
                      const f2 = (sf as any).fee2 || 0;
                      return `${((f1 + f2) / 10000).toFixed(3)}%`;
                    }
                    if (detectedFee)
                      return `${(detectedFee / 10000).toFixed(3)}%`;
                    return "0.000%";
                  })()}
                </span>
              </div>
            </div>

            {/* Success Message */}
            {txHash && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 mb-2">Transaction successful!</p>
                <a
                  href={`https://chainscan.0g.ai/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 underline text-sm break-all"
                >
                  View on Explorer
                </a>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={loading || !isSwapReady}
            className={`w-full py-2 rounded-lg font-bold text-base transition ${
              loading || !isSwapReady
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
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
            ) : !isSwapReady ? (
              isConnected ? (
                "Enter amount and get quote"
              ) : (
                "Connect Wallet"
              )
            ) : needsApproval ? (
              "Approve & Swap"
            ) : (
              "Swap"
            )}
          </button>
        </div>
      </main>
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40" />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="w-[380px] bg-gray-900 rounded-xl border border-gray-800 shadow-2xl text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <span className="font-semibold">Settings</span>
                <button
                  onClick={() => {
                    setSlippage("0.5");
                    setDeadlineMinutes("20");
                  }}
                  className="px-3 py-1 rounded-full border border-gray-700 text-sm text-gray-200 hover:bg-gray-800"
                >
                  Reset
                </button>
              </div>
              <div className="p-4 space-y-5">
                <div>
                  <div className="text-sm text-gray-300 mb-2">
                    Slippage tolerance
                  </div>
                  <div className="flex gap-2">
                    {["0.1", "0.5", "1.0"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSlippage(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          slippage === v
                            ? "border-purple-500 text-purple-300 bg-purple-500/10"
                            : "border-gray-700 text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="w-28 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      step="0.1"
                      min="0"
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-2">
                    Transaction deadline
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={deadlineMinutes}
                      onChange={(e) => setDeadlineMinutes(e.target.value)}
                      className="w-28 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="1"
                    />
                    <span className="text-sm text-gray-400">minutes</span>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default TestDexPage;
