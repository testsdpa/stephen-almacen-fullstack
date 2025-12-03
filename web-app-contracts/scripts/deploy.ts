import { ethers } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  let deployer: any;
  let users: any[] = [];

  if (process.env.TESTNET === "true") {
    // For testnet deployment
    if (!process.env.PRIVATE_KEY || !process.env.RPC_URL) {
      throw new Error("Please set PRIVATE_KEY and RPC_URL in .env for testnet deployment");
    }
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    users = [deployer]; // for testnet, other users must be real addresses you control
  } else {
    // Local Hardhat testing
    const signers = await ethers.getSigners();
    deployer = signers[0];
    users = signers.slice(1, 4); // user1, user2, user3
  }

  // Deploy the contract
  const TokenFactory = await ethers.getContractFactory("MyToken", deployer);
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();

  console.log("Token deployed to:", await token.getAddress());

  // Helper function to display balances
  async function showBalances() {
    console.log("Balances:");
    console.log("Deployer:", ethers.formatUnits(await token.balanceOf(deployer.address), 18));
    for (let i = 0; i < users.length; i++) {
      console.log(`User${i + 1}:`, ethers.formatUnits(await token.balanceOf(users[i].address), 18));
    }
    console.log("------------------------------------------------");
  }

  await showBalances();

  // Mint tokens for users (only works if mintForSelf is allowed)
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const tx = await token.connect(user).mintForSelf(ethers.parseUnits("2", 18));
      await tx.wait();
      console.log(`User${i + 1} minted 2 tokens: ${user.address}`);
    } catch (e: any) {
      if (e.errorName === "ERC20InsufficientBalance") {
        console.log(
          `Minting for User${i + 1} failed: ${e.errorName}, account: ${e.args[0]}, balance: ${ethers.formatUnits(e.args[1], 18)}, attempted: ${ethers.formatUnits(e.args[2], 18)}`
        );
      } else {
        console.log(`Minting for User${i + 1} failed:`, e.message || e);
      }
    }
  }

  await showBalances();

  // Example transfers
  try {
    console.log("User1 sending 10 tokens to User2...");
    const txTransfer = await token.connect(users[0]).transferTokens(
      users[1].address,
      ethers.parseUnits("10", 18)
    );
    await txTransfer.wait();
    console.log("Transfer successful");
  } catch (e: any) {
    if (e.errorName === "ERC20InsufficientBalance") {
      console.log(
        `Transfer failed: ${e.errorName}, account: ${e.args[0]}, balance: ${ethers.formatUnits(e.args[1], 18)}, attempted: ${ethers.formatUnits(e.args[2], 18)}`
      );
    } else {
      console.log("Transfer failed:", e.message || e);
    }
  }

  await showBalances();
}

main().catch((error) => {
  console.error("Deploy script failed:", error);
  process.exitCode = 1;
});
