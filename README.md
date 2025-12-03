# Stephen Almacen Fullstack Web3 Project

## 1. Project Overview
This fullstack Web3 application allows users to:

- Connect their Ethereum wallet (MetaMask)
- View ETH and ERC-20 token balances
- Mint new tokens (ERC-20)
- Send tokens to other addresses
- View recent transactions

**Tech stack:**  
- Backend: Node.js, Express, Redis, MongoDB, ethers.js, Alchemy  
- Frontend: React, TypeScript  
- Smart Contract: ERC-20 (Sepolia testnet)  

---

## 2. Prerequisites

Before setting up, make sure you have:

- Node.js >= 18  
- npm or yarn  
- MetaMask wallet  
- MongoDB account or local instance  
- Redis server (local or cloud)  
- Alchemy API key (Sepolia testnet)  
- Git

---

## 3. Setup Instructions

### Step 1: Clone the repository
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
cd <REPO_NAME>
```

### Step 2: Create `.env` files
Create `.env` files in both **backend** and **frontend** folders. Replace placeholders with your own keys.

**Backend `.env`:**
```
ALCHEMY_API_KEY=<YOUR_ALCHEMY_API_KEY>
PORT=5000
REDIS_URL=<YOUR_REDIS_URL>
MONGO_URI=<YOUR_MONGO_URI>
TOKEN_ADDRESS=<DEPLOYED_ERC20_CONTRACT_ADDRESS>
PRIVATE_KEY=<BACKEND_WALLET_PRIVATE_KEY>
RPC_URL=<YOUR_RPC_URL>
TESTNET=true
```

**Frontend `.env`:**
```
REACT_APP_TOKEN_ADDRESS=<DEPLOYED_ERC20_CONTRACT_ADDRESS>
REACT_APP_ALCHEMY_API_KEY=<YOUR_ALCHEMY_API_KEY>
REACT_APP_RPC_URL=<YOUR_RPC_URL>
```

---

## 4. Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the backend server:
```bash
npm run dev
# or
yarn dev
```

---

## 5. Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the frontend:
```bash
npm start
# or
yarn start
```

---

## 6. Smart Contract

- Type: **ERC-20**  
- Network: **Sepolia testnet**  
- Functions: `balanceOf`, `mint`, `transfer`  
- Address: `<DEPLOYED_ERC20_CONTRACT_ADDRESS>`  

> The backend handles minting to protect private keys. Update the `.env` in both BE and FE with the deployed contract address.

---

## 7. Architectural Decisions & Assumptions

- ERC-20 tokens are used for minting and transfers.  
- Redis caches transaction history for 20 seconds to reduce repeated blockchain queries.  
- Sepolia testnet is used for development.  
- **Frontend (FE)** communicates directly with the blockchain RPC to fetch wallet addresses, ETH balances, and to send tokens.  
- **Backend (BE)** handles minting new tokens and retrieving transaction history from the blockchain or cache.  
- Frontend uses the backend API for minting and accessing transaction data, while BE communicates with the smart contract and manages private keys securely.  
- FE and BE together ensure a separation of responsibilities: FE for user interactions and immediate wallet actions, BE for sensitive operations and data aggregation.

