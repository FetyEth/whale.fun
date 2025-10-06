"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  getBlockchainConnection,
  getContractInstance,
  formatAddress,
  SUPPORTED_NETWORKS,
} from "@/utils/Blockchain";

// Admin wallet (will gate admin-only controls)
const ADMIN_ADDRESS = "0x95Cf028D5e86863570E300CAD14484Dc2068eB79".toLowerCase();

// ZeroG testnet chainId
const CHAIN_ID = 16602;

// Import deployed addresses JSON (source of truth)
// Note: imported at runtime on client side to avoid SSR issues
async function loadAddresses() {
  const mod = await import("@/contracts/deployments/zeroGTestnet-addresses.json");
  return mod as any;
}

// Minimal ABIs
const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

const FACTORY_ABI = [
  { type: "function", name: "getPair", stateMutability: "view", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ name: "pair", type: "address" }] },
  { type: "function", name: "createPair", stateMutability: "nonpayable", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ name: "pair", type: "address" }] },
  { type: "function", name: "allPairsLength", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allPairs", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
] as const;

const PAIR_ABI = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [
    { name: "reserve0", type: "uint112" },
    { name: "reserve1", type: "uint112" },
    { name: "blockTimestampLast", type: "uint32" }
  ] },
] as const;

const ROUTER_ABI = [
  { type: "function", name: "factory", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "amountADesired", type: "uint256" },
          { name: "amountBDesired", type: "uint256" },
          { name: "amountAMin", type: "uint256" },
          { name: "amountBMin", type: "uint256" },
          { name: "to", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

function pow10Big(decimals: number) {
  let result = BigInt(1);
  const ten = BigInt(10);
  for (let i = 0; i < decimals; i++) result *= ten;
  return result;
}

function humanToWei(amount: string, decimals: number) {
  const [i, fRaw] = amount.split(".");
  const f = (fRaw || "").padEnd(decimals, "0").slice(0, decimals);
  const bi = BigInt(i || "0");
  const bf = BigInt(f || "0");
  return bi * pow10Big(decimals) + bf;
}

export default function TestDexPage() {
  const [account, setAccount] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [addresses, setAddresses] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // form state
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [amountA, setAmountA] = useState<string>("0");
  const [amountB, setAmountB] = useState<string>("0");
  const [slippageBps, setSlippageBps] = useState<number>(300);
  const [pairAddr, setPairAddr] = useState<string>("");

  // swap form
  const [swapInToken, setSwapInToken] = useState<string>("");
  const [swapOutToken, setSwapOutToken] = useState<string>("");
  const [swapAmountIn, setSwapAmountIn] = useState<string>("0");
  const [minOutPct, setMinOutPct] = useState<number>(97); // 97% min out
  const [pairs, setPairs] = useState<Array<{ pair: string; token0: string; token1: string }>>([]);
  const [approveInfinite, setApproveInfinite] = useState<boolean>(false);
  const [balances, setBalances] = useState<{ a?: string; b?: string }>({});
  const [allowances, setAllowances] = useState<{ a?: string; b?: string }>({});
  const [reserves, setReserves] = useState<{ r0?: string; r1?: string }>({});

  const connect = useCallback(async () => {
    try {
      const { account, network } = await getBlockchainConnection();
      if (Number(network.chainId) !== CHAIN_ID) {
        setStatus(`Wrong network. Please switch to ${SUPPORTED_NETWORKS[CHAIN_ID].name}.`);
        setAccount(account);
      } else {
        setAccount(account);
        setStatus("Connected");
      }
      setIsAdmin(account?.toLowerCase() === ADMIN_ADDRESS);
    } catch (e: any) {
      setStatus(e.message || "Failed to connect");
    }
  }, []);

  useEffect(() => {
    loadAddresses().then(setAddresses).catch(() => setStatus("Failed to load addresses"));
  }, []);

  const defaults = useMemo(() => {
    if (!addresses) return { factory: "", router: "" };
    return {
      factory: addresses.contracts?.DexFactory || "",
      router: addresses.contracts?.DexRouter || "",
    };
  }, [addresses]);

  // Actions
  const onCreatePair = useCallback(async () => {
    try {
      setStatus("Creating pair...");
      if (!defaults.factory || !ethers.isAddress(defaults.factory)) {
        setStatus("Factory address not configured. Check deployments JSON.");
        return;
      }
      if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
        setStatus("Enter valid Token A and Token B addresses first.");
        return;
      }
      const { contract } = await getContractInstance(defaults.factory, FACTORY_ABI, CHAIN_ID);
      const tx = await contract.createPair(tokenA, tokenB);
      const rc = await tx.wait();
      setStatus(`Pair created in tx ${rc?.hash}`);
    } catch (e: any) {
      setStatus(e.message || "Failed createPair");
    }
  }, [defaults.factory, tokenA, tokenB]);

  const onGetPair = useCallback(async () => {
    try {
      setStatus("Reading pair...");
      if (!defaults.factory || !ethers.isAddress(defaults.factory)) {
        setStatus("Factory address not configured. Check deployments JSON.");
        return;
      }
      if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
        setStatus("Enter valid Token A and Token B addresses first.");
        return;
      }
      const { contract } = await getContractInstance(defaults.factory, FACTORY_ABI, CHAIN_ID);
      let p = await contract.getPair(tokenA, tokenB);
      if (!p || p === ethers.ZeroAddress) {
        // try reverse order
        p = await contract.getPair(tokenB, tokenA);
      }
      if (!p || p === ethers.ZeroAddress) {
        setPairAddr("");
        setStatus("No pair found. Create it first.");
      } else {
        setPairAddr(p);
        setStatus(`Pair: ${p}`);
      }
    } catch (e: any) {
      setStatus(e.message || "Failed getPair");
    }
  }, [defaults.factory, tokenA, tokenB]);

  const onAddLiquidity = useCallback(async () => {
    try {
      if (busy) return;
      setBusy(true);
      setStatus("Approving & adding liquidity...");
      if (!defaults.router || !ethers.isAddress(defaults.router)) {
        setStatus("Router address not configured. Check deployments JSON.");
        return;
      }
      // Verify router wired to expected factory
      const { contract: routerView } = await getContractInstance(defaults.router, ROUTER_ABI, CHAIN_ID);
      const routerFactory: string = await routerView.factory();
      if (!routerFactory || routerFactory.toLowerCase() !== (defaults.factory || "").toLowerCase()) {
        setStatus(`Router.factory mismatch. Router points to ${routerFactory}, JSON has ${defaults.factory}.`);
        return;
      }
      if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
        setStatus("Enter valid Token A and Token B addresses first.");
        return;
      }
      // Prepare decimals
      const ercA = await getContractInstance(tokenA, ERC20_ABI, CHAIN_ID);
      const ercB = await getContractInstance(tokenB, ERC20_ABI, CHAIN_ID);
      const decA = Number(await ercA.contract.decimals());
      const decB = Number(await ercB.contract.decimals());
      const amountADesired = humanToWei(amountA, decA);
      const amountBDesired = humanToWei(amountB, decB);
      if (amountADesired <= BigInt(0) || amountBDesired <= BigInt(0)) {
        setStatus("Enter positive amounts for A and B.");
        return;
      }
      // Determine mins based on reserves: if pool empty, set mins = 0 for first add
      let amountAMin = (amountADesired * BigInt(10000 - slippageBps)) / BigInt(10000);
      let amountBMin = (amountBDesired * BigInt(10000 - slippageBps)) / BigInt(10000);
      try {
        const { contract: factory } = await getContractInstance(defaults.factory, FACTORY_ABI, CHAIN_ID);
        const pairAddrLocal: string = await factory.getPair(tokenA, tokenB);
        if (pairAddrLocal && pairAddrLocal !== ethers.ZeroAddress) {
          const { contract: pair } = await getContractInstance(pairAddrLocal, PAIR_ABI, CHAIN_ID);
          const [r0, r1] = await pair.getReserves();
          const reserve0 = BigInt(r0.toString());
          const reserve1 = BigInt(r1.toString());
          if (reserve0 === BigInt(0) && reserve1 === BigInt(0)) {
            amountAMin = BigInt(0);
            amountBMin = BigInt(0);
          }
        }
      } catch (_) {
        // ignore reserve read errors; fallback to slippage mins
      }

      // Check balances
      const meA: string = ercA.account;
      const balA: bigint = await ercA.contract.balanceOf(meA);
      const balB: bigint = await ercB.contract.balanceOf(meA);
      if (balA < amountADesired) {
        setStatus(`Insufficient Token A balance. Have ${balA.toString()}, need ${amountADesired.toString()}.`);
        return;
      }
      if (balB < amountBDesired) {
        setStatus(`Insufficient Token B balance. Have ${balB.toString()}, need ${amountBDesired.toString()}.`);
        return;
      }

      // Approvals to Router
      const { contract: ercAContract } = ercA;
      const { contract: ercBContract } = ercB;
      const MAX_UINT_HEX = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const approveAmountA = approveInfinite ? MAX_UINT_HEX : amountADesired.toString();
      const approveA = await ercAContract.approve(
        defaults.router,
        approveAmountA,
        { gasLimit: "200000" }
      );
      await approveA.wait();
      const approveAmountB = approveInfinite ? MAX_UINT_HEX : amountBDesired.toString();
      const approveB = await ercBContract.approve(
        defaults.router,
        approveAmountB,
        { gasLimit: "200000" }
      );
      await approveB.wait();

      // Add liquidity
      const { contract: router, account: me } = await getContractInstance(defaults.router, ROUTER_ABI, CHAIN_ID);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours
      const params = {
        tokenA,
        tokenB,
        amountADesired: amountADesired.toString(),
        amountBDesired: amountBDesired.toString(),
        amountAMin: amountAMin.toString(),
        amountBMin: amountBMin.toString(),
        to: me,
        deadline,
      };
      // Lightweight prechecks (avoid staticCall on state-changing function)
      if (Number(deadline) <= Math.floor(Date.now() / 1000)) {
        setStatus("Deadline already expired");
        return;
      }
      if (amountADesired <= BigInt(0) || amountBDesired <= BigInt(0)) {
        setStatus("Amounts must be > 0");
        return;
      }
      const tx = await router.addLiquidity(params, { gasLimit: "700000" });
      const rc = await tx.wait();
      setStatus(`Liquidity added in tx ${rc?.hash}`);
    } catch (e: any) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Failed addLiquidity";
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }, [tokenA, tokenB, amountA, amountB, slippageBps, defaults.router, busy, defaults.factory, approveInfinite]);

  const onListPairs = useCallback(async () => {
    try {
      setStatus("Loading pairs...");
      if (!defaults.factory || !ethers.isAddress(defaults.factory)) {
        setStatus("Factory address not configured. Check deployments JSON.");
        return;
      }
      const { contract: factory } = await getContractInstance(defaults.factory, FACTORY_ABI, CHAIN_ID);
      const len: bigint = await factory.allPairsLength();
      const count = Number(len);
      const items: Array<{ pair: string; token0: string; token1: string }> = [];
      const max = Math.min(count, 50); // safety cap
      for (let i = 0; i < max; i++) {
        const addr: string = await factory.allPairs(i);
        if (!addr || addr === ethers.ZeroAddress) continue;
        const { contract: pair } = await getContractInstance(addr, PAIR_ABI, CHAIN_ID);
        const t0: string = await pair.token0();
        const t1: string = await pair.token1();
        items.push({ pair: addr, token0: t0, token1: t1 });
      }
      setPairs(items);
      setStatus(`Loaded ${items.length} pairs`);
    } catch (e: any) {
      setStatus(e.message || "Failed to load pairs");
    }
  }, [defaults.factory]);

  const refreshBalancesAllowances = useCallback(async () => {
    try {
      setStatus("Refreshing balances & allowances...");
      if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB) || !defaults.router) {
        setStatus("Set Token A/B and ensure Router is configured first.");
        return;
      }
      const a = await getContractInstance(tokenA, ERC20_ABI, CHAIN_ID);
      const b = await getContractInstance(tokenB, ERC20_ABI, CHAIN_ID);
      const me = a.account as string;
      const balA: bigint = await a.contract.balanceOf(me);
      const balB: bigint = await b.contract.balanceOf(me);
      const alwA: bigint = await a.contract.allowance(me, defaults.router);
      const alwB: bigint = await b.contract.allowance(me, defaults.router);
      setBalances({ a: balA.toString(), b: balB.toString() });
      setAllowances({ a: alwA.toString(), b: alwB.toString() });
      setStatus("Balances & allowances updated");
    } catch (e: any) {
      setStatus(e?.message || "Failed to refresh balances/allowances");
    }
  }, [tokenA, tokenB, defaults.router]);

  const refreshReserves = useCallback(async () => {
    try {
      setStatus("Refreshing reserves...");
      const { contract: factory } = await getContractInstance(defaults.factory, FACTORY_ABI, CHAIN_ID);
      const pair = await factory.getPair(tokenA, tokenB);
      if (!pair || pair === ethers.ZeroAddress) {
        setReserves({ r0: "0", r1: "0" });
        setStatus("No pair yet");
        return;
      }
      const { contract } = await getContractInstance(pair, PAIR_ABI, CHAIN_ID);
      const [r0, r1] = await contract.getReserves();
      setReserves({ r0: r0.toString(), r1: r1.toString() });
      setStatus("Reserves updated");
    } catch (e: any) {
      setStatus(e?.message || "Failed to refresh reserves");
    }
  }, [defaults.factory, tokenA, tokenB]);

  const quickApprove = useCallback(async (which: 'A'|'B') => {
    try {
      setStatus(`Approving ${which} infinite...`);
      const MAX = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const c = which === 'A' ? await getContractInstance(tokenA, ERC20_ABI, CHAIN_ID) : await getContractInstance(tokenB, ERC20_ABI, CHAIN_ID);
      const tx = await c.contract.approve(defaults.router, MAX, { gasLimit: "200000" });
      await tx.wait();
      setStatus(`${which} approved`);
      refreshBalancesAllowances();
    } catch (e: any) {
      setStatus(e?.message || "Approve failed");
    }
  }, [tokenA, tokenB, defaults.router, refreshBalancesAllowances]);

  const onSwap = useCallback(async () => {
    try {
      setStatus("Approving & swapping...");
      if (!defaults.router || !ethers.isAddress(defaults.router)) {
        setStatus("Router address not configured. Check deployments JSON.");
        return;
      }
      // Verify router wired to expected factory
      const { contract: routerView } = await getContractInstance(defaults.router, ROUTER_ABI, CHAIN_ID);
      const routerFactory: string = await routerView.factory();
      if (!routerFactory || routerFactory.toLowerCase() !== (defaults.factory || "").toLowerCase()) {
        setStatus(`Router.factory mismatch. Router points to ${routerFactory}, JSON has ${defaults.factory}.`);
        return;
      }
      if (!ethers.isAddress(swapInToken) || !ethers.isAddress(swapOutToken)) {
        setStatus("Enter valid Token In and Token Out addresses first.");
        return;
      }
      // decimals
      const inErc = await getContractInstance(swapInToken, ERC20_ABI, CHAIN_ID);
      const decIn = Number(await inErc.contract.decimals());
      const amountIn = humanToWei(swapAmountIn, decIn);
      const amountOutMin = (amountIn * BigInt(minOutPct)) / BigInt(100); // naive minOut

      // approve
      const MAX_UINT_HEX2 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const approveAmt = approveInfinite ? MAX_UINT_HEX2 : amountIn.toString();
      const approve = await inErc.contract.approve(
        defaults.router,
        approveAmt,
        { gasLimit: "200000" }
      );
      await approve.wait();

      const { contract: router, account: me } = await getContractInstance(defaults.router, ROUTER_ABI, CHAIN_ID);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours
      const path = [swapInToken, swapOutToken];
      const tx = await router.swapExactTokensForTokens(
        amountIn.toString(),
        amountOutMin.toString(),
        path,
        me,
        deadline,
        { gasLimit: "700000" }
      );
      const rc = await tx.wait();
      setStatus(`Swap done in tx ${rc?.hash}`);
    } catch (e: any) {
      setStatus(e.message || "Failed swap");
    }
  }, [swapInToken, swapOutToken, swapAmountIn, minOutPct, defaults.router, defaults.factory, approveInfinite]);

  // Prefill tokens from addresses JSON if present
  useEffect(() => {
    if (!addresses) return;
    // If you want defaults to your newly deployed tokens, set them here.
    // setTokenA(addresses.contracts?.WethToken || "");
    // setTokenB(addresses.contracts?.PandaAiToken || "");
  }, [addresses]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Test DEX</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={connect}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Connect Wallet
        </button>
        <div className="text-sm text-gray-600">
          {account ? `Connected: ${formatAddress(account)}` : "Not connected"}
        </div>
        <div className="text-xs text-gray-500">Router: {defaults.router || '-'} | Router.factory: {/* will be fetched on action */}</div>

      {/* Balances & Allowances */}
      <div className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">Balances & Allowances</h2>
        <div className="flex items-center gap-3">
          <button onClick={refreshBalancesAllowances} className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-800">Refresh</button>
          <span className="text-sm text-gray-600">Router: {defaults.router || "(not set)"}</span>
        </div>
        <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <div className="font-mono">Token A: {tokenA || '-'}</div>
            <div>Balance: {balances.a ?? '-'}</div>
            <div>Allowance → Router: {allowances.a ?? '-'}</div>
            <button onClick={() => quickApprove('A')} className="mt-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Approve A ∞</button>
          </div>
          <div>
            <div className="font-mono">Token B: {tokenB || '-'}</div>
            <div>Balance: {balances.b ?? '-'}</div>
            <div>Allowance → Router: {allowances.b ?? '-'}</div>
            <button onClick={() => quickApprove('B')} className="mt-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Approve B ∞</button>
          </div>
        </div>
      </div>

      {/* Reserves Panel */}
      <div className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">Pair Reserves</h2>
        <div className="flex items-center gap-3">
          <button onClick={refreshReserves} className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-800">Refresh</button>
          <span className="text-sm text-gray-600">Factory: {defaults.factory || "(not set)"}</span>
        </div>
        <div className="text-sm">reserve0: {reserves.r0 ?? '-'} | reserve1: {reserves.r1 ?? '-'}</div>
        <div className="text-xs text-gray-500">If both reserves are 0, first add sets mins to 0 automatically.</div>
      </div>

      {/* List Pairs (no input required) */}
      <div className="space-y-4 border rounded p-4">
        <h2 className="font-semibold">Existing Pairs</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onListPairs}
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800"
          >
            Load Pairs
          </button>
          <span className="text-sm text-gray-600">Factory: {defaults.factory || "(not set)"}</span>
        </div>
        {pairs.length > 0 ? (
          <div className="space-y-2">
            {pairs.map((p) => (
              <div key={p.pair} className="text-sm border rounded p-2 flex items-center justify-between">
                <div>
                  <div>Pair: {p.pair}</div>
                  <div className="text-gray-600">token0: {p.token0}</div>
                  <div className="text-gray-600">token1: {p.token1}</div>
                </div>
                <button
                  onClick={() => { setPairAddr(p.pair); setTokenA(p.token0); setTokenB(p.token1); setStatus(`Selected pair ${p.pair}`); }}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Click Load Pairs to fetch from Factory.</div>
        )}
      </div>
        {isAdmin && (
          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
            Admin
          </span>
        )}
      </div>

      {status && (
        <div className="text-sm p-3 rounded bg-gray-100 border border-gray-200">
          {status}
        </div>
      )}

      {/* Admin-only panel */}
      {isAdmin && (
        <div className="space-y-4 border rounded p-4">
          <h2 className="font-semibold">Admin Panel</h2>
          <p className="text-sm text-gray-600">
            This section is only visible to the admin wallet {formatAddress(ADMIN_ADDRESS)}.
          </p>
          <p className="text-sm text-gray-600">
            Future: set feeTo, set protocolFeeBps, emergency actions, etc.
          </p>
        </div>
      )}

      {/* Pair creation */}
      <div className="space-y-4 border rounded p-4">
        <h2 className="font-semibold">Create Pair</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Token A address"
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Token B address"
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
          />
        </div>
        <button
          onClick={onCreatePair}
          disabled={busy}
          className={`px-4 py-2 rounded text-white ${busy ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          Create Pair
        </button>
        <button
          onClick={onGetPair}
          disabled={busy}
          className={`ml-3 px-4 py-2 rounded text-white ${busy ? "bg-gray-300" : "bg-gray-600 hover:bg-gray-700"}`}
        >
          Get Pair
        </button>
        {pairAddr && (
          <div className="text-sm text-gray-700 mt-2">Pair: {pairAddr}</div>
        )}
      </div>

      {/* Add Liquidity */}
      <div className="space-y-4 border rounded p-4">
        <h2 className="font-semibold">Add Liquidity</h2>
        {pairAddr ? (
          <div className="text-sm text-gray-700">Using Pair: {pairAddr}</div>
        ) : (
          <div className="text-xs text-gray-500">Tip: Click &quot;Get Pair&quot; above to fetch the pool before adding liquidity.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Token A address"
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Token B address"
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Amount A (human)"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Amount B (human)"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
          />
          <div className="col-span-1 md:col-span-2 flex items-center gap-3">
            <label className="text-sm text-gray-600">Slippage (bps)</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-32"
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
            />
            <label className="text-sm text-gray-600 ml-4 flex items-center gap-2">
              <input type="checkbox" checked={approveInfinite} onChange={(e) => setApproveInfinite(e.target.checked)} />
              Infinite approval
            </label>
          </div>
        </div>
        <button
          onClick={onAddLiquidity}
          disabled={busy}
          className={`px-4 py-2 rounded text-white ${busy ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
        >
          Add Liquidity
        </button>
      </div>

      {/* Swap */}
      <div className="space-y-4 border rounded p-4">
        <h2 className="font-semibold">Swap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Token In address"
            value={swapInToken}
            onChange={(e) => setSwapInToken(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Token Out address"
            value={swapOutToken}
            onChange={(e) => setSwapOutToken(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Amount In (human)"
            value={swapAmountIn}
            onChange={(e) => setSwapAmountIn(e.target.value)}
          />
          <div className="col-span-1 md:col-span-2 flex items-center gap-3">
            <label className="text-sm text-gray-600">Min Out %</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-32"
              value={minOutPct}
              onChange={(e) => setMinOutPct(Number(e.target.value))}
            />
            <label className="text-sm text-gray-600 ml-4 flex items-center gap-2">
              <input type="checkbox" checked={approveInfinite} onChange={(e) => setApproveInfinite(e.target.checked)} />
              Infinite approval
            </label>
          </div>
        </div>
        <button
          onClick={onSwap}
          disabled={busy}
          className={`px-4 py-2 rounded text-white ${busy ? "bg-purple-300" : "bg-purple-600 hover:bg-purple-700"}`}
        >
          Swap
        </button>
      </div>
    </div>
  );
}
