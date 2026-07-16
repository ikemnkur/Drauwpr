require('dotenv').config();
const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.SIMPLE_TX_VALIDATOR_PORT || 5055);
const TATUM_API_KEY = String(process.env.TATUM_API_KEY || '').trim();
const TATUM_BASE_URL = 'https://api.tatum.io/v3';

const CHAIN_ORDER = ['BTC', 'ETH', 'LTC', 'SOL'];
const CHAIN_ALIASES = {
  BTC: 'BTC',
  BITCOIN: 'BTC',
  ETH: 'ETH',
  ETHEREUM: 'ETH',
  LTC: 'LTC',
  LITECOIN: 'LTC',
  SOL: 'SOL',
  SOLANA: 'SOL',
};

const CHAIN_CONFIG = {
  BTC: {
    symbol: 'BTC',
    coinId: 'bitcoin',
    wallet: String(process.env.MONITOR_BTC_WALLET || 'bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6').trim(),
    esploraBase: String(process.env.BTC_ESPLORA || 'https://blockstream.info/api').trim(),
    decimals: 8,
  },
  ETH: {
    symbol: 'ETH',
    coinId: 'ethereum',
    wallet: String(process.env.MONITOR_ETH_WALLET || '0x9a61f30347258A3D03228F363b07692F3CBb7f27').trim(),
    etherscanKey: String(process.env.ETHERSCAN_API_KEY || '').trim(),
    decimals: 18,
  },
  LTC: {
    symbol: 'LTC',
    coinId: 'litecoin',
    wallet: String(process.env.MONITOR_LTC_WALLET || 'ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh').trim(),
    esploraBase: String(process.env.LTC_ESPLORA || 'https://litecoinspace.org/api').trim(),
    decimals: 8,
  },
  SOL: {
    symbol: 'SOL',
    coinId: 'solana',
    wallet: String(process.env.MONITOR_SOL_WALLET || 'qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU').trim(),
    rpcUrl: String(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com').trim(),
    decimals: 9,
  },
};

const fallbackRates = { BTC: 45000, ETH: 3000, LTC: 100, SOL: 150 };

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function addressEquals(left, right) {
  return normalizeAddress(left) && normalizeAddress(left) === normalizeAddress(right);
}

function uniqueAddresses(addresses = []) {
  return [...new Set(addresses.filter(Boolean).map((addr) => String(addr).trim()))];
}

function extractSolSenderCandidatesFromInstructions(instructions, walletAddress) {
  const wallet = normalizeAddress(walletAddress);
  const candidates = [];

  for (const ins of instructions || []) {
    const info = ins?.parsed?.info || {};
    const destination = normalizeAddress(info.destination || info.to || info.account || '');
    const sourceLike = [
      info.source,
      info.from,
      info.authority,
      info.owner,
      info.multisigAuthority,
    ];

    if (destination && destination === wallet) {
      for (const source of sourceLike) {
        if (source && !addressEquals(source, walletAddress)) {
          candidates.push(source);
        }
      }
    }
  }

  return uniqueAddresses(candidates);
}

function formatUnits(value, decimals) {
  const n = BigInt(value);
  const d = BigInt(10) ** BigInt(decimals);
  const whole = (n / d).toString();
  const frac = (n % d).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

function absBigInt(value) {
  return value < 0n ? -value : value;
}

function toDateTimeFromSeconds(seconds) {
  if (!seconds) return null;
  const n = Number(seconds);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${text ? ` - ${text.slice(0, 120)}` : ''}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${text ? ` - ${text.slice(0, 120)}` : ''}`);
  }
  return response.text();
}

async function fetchCryptoRate(chain) {
  const cfg = CHAIN_CONFIG[chain];
  if (!cfg || !cfg.coinId) return fallbackRates[chain] || 1;

  try {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cfg.coinId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    );
    const rate = Number(data?.[cfg.coinId]?.usd);
    if (!Number.isFinite(rate) || rate <= 0) return fallbackRates[chain] || 1;
    return rate;
  } catch (error) {
    return fallbackRates[chain] || 1;
  }
}

function toCoinGeckoHistoryDate(timestamp) {
  const date = timestamp instanceof Date
    ? timestamp
    : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

async function fetchCryptoRateAtTime(chain, timestamp) {
  const cfg = CHAIN_CONFIG[chain];
  const fallback = fallbackRates[chain] || 1;
  if (!cfg || !cfg.coinId || !timestamp) return fallback;

  const historyDate = toCoinGeckoHistoryDate(timestamp);
  if (!historyDate) return fallback;

  try {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/coins/${cfg.coinId}/history?date=${historyDate}&localization=false`,
      { headers: { Accept: 'application/json' } }
    );

    const rate = Number(data?.market_data?.current_price?.usd);
    if (!Number.isFinite(rate) || rate <= 0) return fallback;
    return rate;
  } catch (error) {
    return fallback;
  }
}

function safeTimestampToDateTime(timestamp) {
  if (!timestamp && timestamp !== 0) return null;

  let date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function normalizeTatumBtcLtc(tx, myAddress) {
  const inputs = tx.inputs || [];
  const outputs = tx.outputs || [];

  let spent = 0n;
  let received = 0n;

  for (const input of inputs) {
    if (addressEquals(input.coin?.address, myAddress)) {
      spent += BigInt(Math.floor((Number(input.coin?.value || 0)) * 1e8));
    }
  }

  for (const output of outputs) {
    if (addressEquals(output.address, myAddress)) {
      received += BigInt(Math.floor((Number(output.value || 0)) * 1e8));
    }
  }

  const net = received - spent;
  const direction = net > 0n ? 'inbound' : net < 0n ? 'outbound' : null;
  const senderCandidates = inputs
    .map((input) => input.coin?.address)
    .filter(Boolean);

  return {
    time: safeTimestampToDateTime(tx.time),
    direction,
    amount: formatUnits(absBigInt(net), 8),
    from: direction === 'inbound' ? (inputs[0]?.coin?.address || null) : myAddress,
    to: direction === 'inbound' ? myAddress : (outputs[0]?.address || null),
    hash: tx.hash,
    senderCandidates,
  };
}

function normalizeTatumEth(tx, myAddress) {
  const from = (tx.from || '').toLowerCase();
  const to = (tx.to || '').toLowerCase();
  const me = myAddress.toLowerCase();

  const direction = (to === me && from !== me) ? 'inbound'
    : (from === me && to !== me) ? 'outbound'
      : null;

  return {
    time: safeTimestampToDateTime(tx.timestamp),
    direction,
    amount: formatUnits(BigInt(tx.value || '0'), 18),
    from: tx.from || null,
    to: tx.to || null,
    hash: tx.hash,
    senderCandidates: [tx.from].filter(Boolean),
  };
}

function normalizeTatumSol(tx, myAddress) {
  const meta = tx.meta || {};
  const message = tx.transaction?.message || {};
  const accounts = message.accountKeys || [];
  const txInstructions = message.instructions || [];
  const innerInstructions = (meta.innerInstructions || []).flatMap((entry) => entry?.instructions || []);

  const idx = accounts.findIndex((a) => addressEquals(a, myAddress));
  let net = 0n;

  if (idx >= 0) {
    const pre = BigInt(meta.preBalances?.[idx] || 0);
    const post = BigInt(meta.postBalances?.[idx] || 0);
    net = post - pre;
  }

  const direction = net > 0n ? 'inbound' : net < 0n ? 'outbound' : null;
  const counterparty = accounts.find((a) => !addressEquals(a, myAddress)) || null;
  const parsedCandidates = extractSolSenderCandidatesFromInstructions(
    [...txInstructions, ...innerInstructions],
    myAddress
  );
  const senderCandidates = uniqueAddresses([
    ...parsedCandidates,
    counterparty,
  ]).filter((addr) => !addressEquals(addr, myAddress));
  const derivedSender = senderCandidates[0] || null;

  return {
    time: safeTimestampToDateTime(tx.blockTime),
    direction,
    amount: formatUnits(absBigInt(net), 9),
    from: direction === 'inbound' ? derivedSender : myAddress,
    to: direction === 'inbound' ? myAddress : (derivedSender || counterparty),
    hash: tx.signature || tx.hash,
    senderCandidates,
  };
}

function normalizeTatumResponse(chain, myAddress, data) {
  const txList = Array.isArray(data) ? data : (data?.data || data?.result || []);
  const rows = [];

  for (const tx of txList) {
    let normalized = null;
    if (chain === 'BTC' || chain === 'LTC') normalized = normalizeTatumBtcLtc(tx, myAddress);
    if (chain === 'ETH') normalized = normalizeTatumEth(tx, myAddress);
    if (chain === 'SOL') normalized = normalizeTatumSol(tx, myAddress);
    if (normalized) rows.push(normalized);
  }

  return rows;
}

async function fetchTatumTransactions(chain, address, limit = 50) {
  if (!TATUM_API_KEY) return [];

  const chainMap = {
    BTC: 'bitcoin',
    LTC: 'litecoin',
    ETH: 'ethereum',
    SOL: 'solana',
  };

  const tatumChain = chainMap[chain];
  if (!tatumChain) return [];

  let url;
  let query;

  if (chain === 'BTC' || chain === 'LTC') {
    url = `${TATUM_BASE_URL}/${tatumChain}/transaction/address/${address}`;
    query = `pageSize=${Math.min(50, limit)}`;
  } else if (chain === 'ETH') {
    url = `${TATUM_BASE_URL}/ethereum/account/transaction/${address}`;
    query = `pageSize=${Math.min(50, limit)}`;
  } else if (chain === 'SOL') {
    url = `${TATUM_BASE_URL}/solana/account/transaction/${address}`;
    query = `limit=${Math.min(50, limit)}`;
  } else {
    return [];
  }

  const response = await fetch(`${url}?${query}`, {
    headers: {
      Accept: 'application/json',
      'x-api-key': TATUM_API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Tatum ${chain} lookup failed (${response.status})${text ? ` - ${text.slice(0, 160)}` : ''}`);
  }

  const data = await response.json();
  return normalizeTatumResponse(chain, address, data);
}

async function fetchViaTatumByHash(chain, txHash, targetAddress) {
  if (!TATUM_API_KEY) return null;

  const rows = await fetchTatumTransactions(chain, targetAddress, 50);
  const matched = rows.find((row) => {
    const candidateHash = row.hash || row.signature;
    return String(candidateHash || '').toLowerCase() === String(txHash || '').toLowerCase();
  });

  if (!matched) return null;

  return {
    chain,
    txHash,
    sendingAddress: matched.from || null,
    receivingAddress: matched.to || targetAddress,
    direction: matched.direction || null,
    amount: matched.amount || null,
    timeCreated: matched.time || null,
    confirmations: null,
    senderCandidates: Array.isArray(matched.senderCandidates) ? matched.senderCandidates : [matched.from].filter(Boolean),
    providerUsed: 'TATUM',
  };
}

async function fetchBtcLtcByHash(chain, txHash, targetAddress) {
  const cfg = CHAIN_CONFIG[chain];
  const tx = await fetchJson(`${cfg.esploraBase}/tx/${txHash}`, { headers: { Accept: 'application/json' } });

  let spent = 0n;
  let received = 0n;
  const inputAddresses = [];

  for (const vin of tx.vin || []) {
    const addr = vin.prevout?.scriptpubkey_address || null;
    if (addr) inputAddresses.push(addr);
    if (addressEquals(addr, targetAddress)) {
      spent += BigInt(vin.prevout?.value || 0);
    }
  }

  const outputAddresses = [];
  for (const vout of tx.vout || []) {
    const addr = vout.scriptpubkey_address || null;
    if (addr) outputAddresses.push(addr);
    if (addressEquals(addr, targetAddress)) {
      received += BigInt(vout.value || 0);
    }
  }

  const net = received - spent;
  const direction = net > 0n ? 'inbound' : net < 0n ? 'outbound' : null;

  const sender = inputAddresses.find((addr) => !addressEquals(addr, targetAddress))
    || inputAddresses[0]
    || null;

  const hasTargetOutput = outputAddresses.some((addr) => addressEquals(addr, targetAddress));

  const tipText = await fetchText(`${cfg.esploraBase}/blocks/tip/height`, { headers: { Accept: 'text/plain' } });
  const tipHeight = Number(tipText.trim());
  let confirmations = 0;

  if (tx.status?.confirmed) {
    const blockHeight = Number(tx.status?.block_height);
    confirmations = Number.isFinite(tipHeight) && Number.isFinite(blockHeight)
      ? Math.max(0, tipHeight - blockHeight + 1)
      : null;
  }

  return {
    chain,
    txHash,
    sendingAddress: sender,
    receivingAddress: hasTargetOutput ? targetAddress : (outputAddresses[0] || null),
    direction,
    amount: formatUnits(absBigInt(net), cfg.decimals),
    timeCreated: toDateTimeFromSeconds(tx.status?.block_time),
    confirmations,
    senderCandidates: inputAddresses,
  };
}

async function fetchEthByHash(txHash, targetAddress) {
  const cfg = CHAIN_CONFIG.ETH;
  if (!cfg.etherscanKey) {
    throw new Error('ETHERSCAN_API_KEY is required for ETH lookups in this example file');
  }

  const base = 'https://api.etherscan.io/v2/api';
  const common = {
    apikey: cfg.etherscanKey,
    chainid: 1,
    module: 'proxy',
  };

  const txResponse = await fetchJson(
    `${base}?apikey=${encodeURIComponent(common.apikey)}&chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${encodeURIComponent(txHash)}`,
    { headers: { Accept: 'application/json' } }
  );

  const tx = txResponse?.result || null;
  if (!tx) return null;

  const latestResponse = await fetchJson(
    `${base}?apikey=${encodeURIComponent(common.apikey)}&chainid=1&module=proxy&action=eth_blockNumber`,
    { headers: { Accept: 'application/json' } }
  );

  const latestBlock = parseInt(String(latestResponse?.result || '0x0'), 16);
  const txBlock = tx.blockNumber ? parseInt(String(tx.blockNumber), 16) : NaN;

  let blockTimestamp = null;
  if (tx.blockNumber) {
    const blockResponse = await fetchJson(
      `${base}?apikey=${encodeURIComponent(common.apikey)}&chainid=1&module=proxy&action=eth_getBlockByNumber&tag=${encodeURIComponent(tx.blockNumber)}&boolean=false`,
      { headers: { Accept: 'application/json' } }
    );
    const tsHex = blockResponse?.result?.timestamp || null;
    if (tsHex) blockTimestamp = parseInt(String(tsHex), 16);
  }

  let valueWei = 0n;
  if (typeof tx.value === 'string' && tx.value.startsWith('0x')) valueWei = BigInt(tx.value);
  else if (typeof tx.value === 'string' && tx.value) valueWei = BigInt(tx.value);

  const direction = addressEquals(tx.to, targetAddress) && !addressEquals(tx.from, targetAddress)
    ? 'inbound'
    : addressEquals(tx.from, targetAddress) && !addressEquals(tx.to, targetAddress)
      ? 'outbound'
      : null;

  return {
    chain: 'ETH',
    txHash,
    sendingAddress: tx.from || null,
    receivingAddress: tx.to || null,
    direction,
    amount: formatUnits(absBigInt(valueWei), cfg.decimals),
    timeCreated: toDateTimeFromSeconds(blockTimestamp),
    confirmations: Number.isFinite(latestBlock) && Number.isFinite(txBlock)
      ? Math.max(0, latestBlock - txBlock + 1)
      : (tx.blockNumber ? null : 0),
    senderCandidates: uniqueAddresses([tx.from]).filter((addr) => !addressEquals(addr, targetAddress)),
  };
}

async function solRpc(method, params) {
  const response = await fetch(CHAIN_CONFIG.SOL.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SOL RPC HTTP ${response.status}${text ? ` - ${text.slice(0, 120)}` : ''}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'SOL RPC error');
  return data.result;
}

async function fetchSolByHash(txHash, targetAddress) {
  const cfg = CHAIN_CONFIG.SOL;
  const tx = await solRpc('getTransaction', [txHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]);
  if (!tx) return null;

  const keys = (tx.transaction?.message?.accountKeys || []).map((k) => (typeof k === 'string' ? k : k.pubkey));
  const txInstructions = tx.transaction?.message?.instructions || [];
  const innerInstructions = (tx.meta?.innerInstructions || []).flatMap((entry) => entry?.instructions || []);
  const walletIdx = keys.findIndex((k) => addressEquals(k, targetAddress));

  let net = 0n;
  if (walletIdx >= 0) {
    const pre = BigInt(tx.meta?.preBalances?.[walletIdx] || 0);
    const post = BigInt(tx.meta?.postBalances?.[walletIdx] || 0);
    net = post - pre;
  }

  const direction = net > 0n ? 'inbound' : net < 0n ? 'outbound' : null;

  const parsedCandidates = extractSolSenderCandidatesFromInstructions(
    [...txInstructions, ...innerInstructions],
    targetAddress
  );

  let sender = parsedCandidates[0] || null;
  let receiver = addressEquals(tx.transaction?.message?.accountKeys?.[0]?.pubkey, targetAddress)
    ? null
    : targetAddress;

  if (!sender) {
    const counterparty = keys.find((k) => !addressEquals(k, targetAddress)) || null;
    sender = direction === 'inbound' ? counterparty : targetAddress;
    receiver = direction === 'inbound' ? targetAddress : counterparty;
  }

  const senderCandidates = uniqueAddresses([
    ...parsedCandidates,
    ...keys.filter((k) => !addressEquals(k, targetAddress)),
    sender,
  ]).filter((addr) => !addressEquals(addr, targetAddress));

  const statusResult = await solRpc('getSignatureStatuses', [[txHash], { searchTransactionHistory: true }]);
  const status = statusResult?.value?.[0] || null;
  const confirmations = typeof status?.confirmations === 'number'
    ? status.confirmations
    : (status?.confirmationStatus === 'finalized' ? 'finalized' : 0);

  return {
    chain: 'SOL',
    txHash,
    sendingAddress: sender,
    receivingAddress: receiver,
    direction,
    amount: formatUnits(absBigInt(net), cfg.decimals),
    timeCreated: toDateTimeFromSeconds(tx.blockTime),
    confirmations,
    senderCandidates,
  };
}

async function lookupTransactionByHash(chain, txHash, targetAddress) {
  const fromTatum = await fetchViaTatumByHash(chain, txHash, targetAddress).catch(() => null);
  if (fromTatum) return fromTatum;

  if (chain === 'BTC' || chain === 'LTC') {
    const row = await fetchBtcLtcByHash(chain, txHash, targetAddress);
    return { ...row, providerUsed: 'ESPLORA' };
  }
  if (chain === 'ETH') {
    const row = await fetchEthByHash(txHash, targetAddress);
    if (!row) return null;
    return { ...row, providerUsed: 'ETHERSCAN' };
  }
  if (chain === 'SOL') {
    const row = await fetchSolByHash(txHash, targetAddress);
    if (!row) return null;
    return { ...row, providerUsed: 'SOL_RPC' };
  }
  throw new Error(`Unsupported chain: ${chain}`);
}

function normalizeChainInput(chainInput) {
  if (!chainInput) return null;
  const key = String(chainInput).trim().toUpperCase();
  return CHAIN_ALIASES[key] || null;
}

async function validatePayment({ txHash, chain }) {
  const checks = [];
  const selectedChain = normalizeChainInput(chain);
  if (!selectedChain) {
    throw new Error('chain is required. Use BTC, ETH, LTC, or SOL');
  }

  const targetAddress = String(CHAIN_CONFIG[selectedChain]?.wallet || '').trim();
  if (!targetAddress) {
    throw new Error(`No configured receiving wallet for ${selectedChain}`);
  }

  const chainsToTry = selectedChain ? [selectedChain] : CHAIN_ORDER;

  for (const chainSym of chainsToTry) {
    try {
      const details = await lookupTransactionByHash(chainSym, txHash, targetAddress);
      if (!details) {
        checks.push({ chain: chainSym, status: 'not_found' });
        continue;
      }

      const isInbound = details.direction === 'inbound';
      const toWallet = addressEquals(details.receivingAddress, targetAddress);

      if (!isInbound || !toWallet) {
        checks.push({
          chain: chainSym,
          status: 'mismatch',
          reason: {
            isInbound,
            toWallet,
          },
          wallet: targetAddress,
          observed: {
            direction: details.direction,
            sendingAddress: details.sendingAddress,
            receivingAddress: details.receivingAddress,
          },
        });
        continue;
      }

      const usdRate = await fetchCryptoRate(chainSym);
      const amountValue = Number(details.amount || 0);
      const amountInUSD = Number.isFinite(amountValue)
        ? Number((amountValue * usdRate).toFixed(2))
        : null;

      const historicalRate = await fetchCryptoRateAtTime(chainSym, details.timeCreated);
      const amountInUSDatTime = Number.isFinite(amountValue)
        ? Number((amountValue * historicalRate).toFixed(2))
        : null;

      checks.push({ chain: chainSym, status: 'matched' });
      return {
        legit: true,
        checks,
        transaction: {
          amount: details.amount,
          timeCreated: details.timeCreated,
          amountInUSD,
          amountInUSDatTime,
          confirmations: details.confirmations,
          direction: details.direction,
          chain: chainSym,
          provider: details.providerUsed || null,
          txHash: details.txHash,
          sendingAddress: details.sendingAddress,
          receivingAddress: details.receivingAddress,
        },
      };
    } catch (error) {
      checks.push({ chain: chainSym, status: 'error', error: error.message });
    }
  }

  return {
    legit: false,
    error: 'No inbound payment matched the provided tx hash and receiving wallet',
    checks,
  };
}

async function handleValidatePayment(req, res) {
  try {
    const txHash = String(req.body?.txHash || '').trim();
    const chainInput = String(req.body?.chain || '').trim();
    const chain = normalizeChainInput(chainInput);

    if (chainInput && !chain) {
      return res.status(400).json({
        ok: false,
        legit: false,
        error: 'Unsupported chain. Use BTC, ETH, LTC, or SOL',
      });
    }

    if (!txHash || !chain) {
      return res.status(400).json({
        ok: false,
        legit: false,
        error: 'chain and txHash are required',
      });
    }

    const validation = await validatePayment({ txHash, chain });

    if (!validation.legit) {
      return res.json({
        ok: false,
        legit: false,
        error: validation.error,
        checks: validation.checks,
      });
    }

    return res.json({
      ok: true,
      legit: true,
      checks: validation.checks,
      transaction: validation.transaction,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      legit: false,
      error: error.message || 'Validation failed',
    });
  }
}

async function handleValidateTransaction(req, res) {
  try {
    const txHash = String(req.query?.tx || req.query?.txHash || '').trim();
    const chainInput = String(req.query?.chain || '').trim();
    const chain = normalizeChainInput(chainInput);

    if (chainInput && !chain) {
      return res.status(400).json({
        ok: false,
        legit: false,
        error: 'Unsupported chain. Use BTC, ETH, LTC, or SOL',
      });
    }

    if (!txHash || !chain) {
      return res.status(400).json({
        ok: false,
        legit: false,
        error: 'tx (or txHash) and chain are required',
      });
    }

    const validation = await validatePayment({ txHash, chain });

    if (!validation.legit) {
      return res.json({
        ok: false,
        legit: false,
        error: validation.error,
        checks: validation.checks,
      });
    }

    return res.json({
      ok: true,
      legit: true,
      checks: validation.checks,
      transaction: validation.transaction,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      legit: false,
      error: error.message || 'Validation failed',
    });
  }
}

function mountCryptoTxValidatorRoutes(app, options = {}) {
  const basePath = String(options.basePath || '').trim();
  const route = (suffix) => `${basePath}${suffix}`;

  app.post(route('/api/validate-payment'), handleValidatePayment);
  app.get(route('/api/validate-transaction'), handleValidateTransaction);
}

function registerStandaloneHome(app) {
  app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simple TX Validator Example</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fb; color: #1f2937; }
    .card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #dbe3ef; border-radius: 12px; padding: 20px; }
    h1 { margin-top: 0; font-size: 1.4rem; }
    label { display: block; margin-top: 14px; font-weight: 600; font-size: 0.95rem; }
    input, select { width: 100%; margin-top: 6px; border: 1px solid #b8c4d9; border-radius: 8px; padding: 10px; background: #fff; }
    button { margin-top: 16px; border: 0; background: #0e7490; color: #fff; font-weight: 600; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
    pre { margin-top: 16px; background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; overflow-x: auto; }
    .status { margin-top: 12px; min-height: 1.2rem; color: #475569; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Simple TX Validator Example</h1>
    <p>Validate by chain + tx hash. Receiving wallet is auto-selected from chain config.</p>

    <form id="form">
      <label for="chain">chain</label>
      <select id="chain" name="chain" required>
        <option value="LTC">LTC</option>
        <option value="BTC">BTC</option>
        <option value="SOL">SOL</option>
        <option value="ETH">ETH</option>
      </select>

      <label for="txHash">txHash</label>
      <input id="txHash" name="txHash" placeholder="Transaction hash" required />

      <button id="submitBtn" type="submit">Validate</button>
      <div class="status" id="status"></div>
      <pre id="output">{}</pre>
    </form>
  </main>

  <script>
    const form = document.getElementById('form');
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    const chainSelect = document.getElementById('chain');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submitBtn.disabled = true;
      status.textContent = 'Validating...';

      const chain = chainSelect.value;
      const txHash = document.getElementById('txHash').value.trim();
      const payload = { txHash, chain };

      try {
        const response = await fetch('/api/validate-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        output.textContent = JSON.stringify(data, null, 2);
        status.textContent = response.ok ? 'Done' : 'Validation failed';
      } catch (error) {
        output.textContent = JSON.stringify({ error: error.message }, null, 2);
        status.textContent = 'Request failed';
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
  });
}

function createStandaloneApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  registerStandaloneHome(app);
  mountCryptoTxValidatorRoutes(app);
  return app;
}

module.exports = {
  validatePayment,
  normalizeChainInput,
  mountCryptoTxValidatorRoutes,
  createStandaloneApp,
};

if (require.main === module) {
  const app = createStandaloneApp();
  app.listen(PORT, () => {
    console.log(`simpleTXvalidator-example running on http://localhost:${PORT}`);
  });
}
