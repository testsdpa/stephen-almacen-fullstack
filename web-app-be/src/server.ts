import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AlchemyProvider, Contract, Wallet, formatUnits, parseUnits } from "ethers";
import { createClient } from "redis";
import { connectDB } from "../src/db/mongoDb.ts";
import { Account } from "./db/models/account.ts";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment
dotenv.config();
connectDB();

// Resolve contract JSON
const jsonPath = resolve("../web-app-contracts/artifacts/contracts/ERC-20.sol/MyToken.json");
const MyTokenArtifact = JSON.parse(readFileSync(jsonPath, "utf-8"));
const TOKEN_ABI = MyTokenArtifact.abi;

// Config
const PORT = process.env.PORT || 5000;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || ""; // deployed ERC-20
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; // backend wallet for gas

// Provider & wallet (match your deploy network!)
const provider = new AlchemyProvider("sepolia", ALCHEMY_API_KEY); // change network if needed
const wallet = new Wallet(PRIVATE_KEY, provider);

// ERC-20 contract
const tokenContract = new Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

// Redis
const redisClient = createClient({ url: process.env.REDIS_URL || "" });
redisClient.connect().catch(console.error);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

/* ------------------- GET token balance ------------------- */
app.get("/api/balance/:address", async (req, res) => {
  const { address } = req.params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address))
    return res.status(400).json({ error: "Invalid address" });

  try {
    const balanceBN = await tokenContract.balanceOf(address);
    const balance = formatUnits(balanceBN, 18); // 18 decimals
    res.json({ balance });
    console.log(`Token balance of ${address}: ${balance}`);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch token balance.", details: err.message });
  }
});

/* ------------------- POST mint token ------------------- */
app.post("/api/mint", async (req, res) => {
  const { address, amount } = req.body;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address))
    return res.status(400).json({ error: "Invalid address" });
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json({ error: "Invalid amount" });

  try {
    const amountInUnits = parseUnits(amount.toString(), 18); // convert to token decimals
    const tx = await tokenContract.mint(address, amountInUnits);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
    console.log(`Minted ${amount} tokens to ${address}, txHash: ${tx.hash}`);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Minting failed.", details: err.message });
  }
});

app.get("/api/transactions/:address", async (req, res) => {
  const { address } = req.params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return res.status(400).json({ error: "Invalid address" });

  try {
    const cacheKey = `txs:${address}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // Call Alchemy API
    const url = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const body = {
      jsonrpc: "2.0",
      id: 0,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        fromAddress: address,
        category: ["external", "internal", "erc20", "erc721", "erc1155"]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result: any = await response.json();
    console.log(result);

    const transfers = result.result.transfers || [];

    // Format the last 10 transactions
    const txs = transfers
      .slice(-10)
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.asset === "ETH" ? parseFloat(formatUnits(tx.rawContract.value, "ether")) : parseFloat(formatUnits(tx.rawContract.value, 18)),
        asset: tx.asset,
        category: tx.category,
        blockNum: parseInt(tx.blockNum, 16),
        timestamp: tx.metadata?.blockTimestamp || null,
      }));

    // Cache the result for 20 seconds
    await redisClient.setEx(cacheKey, 20, JSON.stringify(txs));

    res.json(txs);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transactions", details: err.message });
  }
});
// POST send tokens
app.post("/api/transfer", async (req, res) => {
  const { to, amount } = req.body;

  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return res.status(400).json({ error: "Invalid recipient address" });
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    console.log("Transfer API called with:", to, amount);
    const amountInUnits = parseUnits(amount.toString(), 18); // handle decimals
    const tx = await tokenContract.transferTokens(to, amountInUnits);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Transfer failed.", details: err.message });
  }
});


/* ------------------- START SERVER ------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
