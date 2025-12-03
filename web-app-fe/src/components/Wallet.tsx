import React, { useState, useEffect } from "react";
import { BrowserProvider, formatEther, ethers } from "ethers";
import Web3Modal from "web3modal";
import MyTokenArtifact from "../abi/MyToken.json";

const Wallet: React.FC = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingMint, setLoadingMint] = useState(false);
  const [loadingSend, setloadingSend] = useState(false);
  const [loadingTokenBalance, setLoadingTokenBalance] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);

  const [mintAmount, setMintAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const web3Modal = new Web3Modal({ cacheProvider: true });
  const TOKEN_ABI = MyTokenArtifact.abi;

  // --- Wallet & Provider Setup ---
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xAA36A7" }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        alert("Please add Sepolia network to MetaMask first.");
      } else {
        console.error(switchError);
      }
    }
  };

  const setupProvider = async (instance: any) => {
    try {
      setLoadingWallet(true);
      switchToSepolia();
      await switchToSepolia();
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      const balanceBN = await provider.getBalance(address);
      setBalance(Number(formatEther(balanceBN)).toFixed(10));

      await fetchTokenBalance(address);
      await fetchTransactionsFromBackend(address);
    } catch (err) {
      console.error(err);
      setError("Failed to setup wallet.");
    } finally {
      setLoadingWallet(false);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      setLoadingConnect(true);
      const instance = await web3Modal.connect();
      await setupProvider(instance);
    } catch (err) {
      console.error(err);
      setError("Failed to connect wallet.");
    } finally {
      setLoadingConnect(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setLoadingDisconnect(true);
      setProvider(null);
      setAccount("");
      setBalance("");
      setTokenBalance("0");
      setTransactions([]);
      setError("");
      await web3Modal.clearCachedProvider();
    } catch (err) {
      console.error(err);
      setError("Failed to disconnect wallet.");
    } finally {
      setLoadingDisconnect(false);
    }
  };

  // --- Token Functions ---
  const mintToken = async (amount: number) => {
    try {
      setLoadingMint(true);
      setError("");

      const res = await fetch("http://localhost:5000/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account, amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mint failed");

      alert(`Mint successful! ${amount} tokens minted.`);
      await fetchTokenBalance(account);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMint(false);
    }
  };

  const fetchTokenBalance = async (address: string) => {
    try {
      setLoadingTokenBalance(true);
      const res = await fetch(`http://localhost:5000/api/balance/${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get token balance");
      setTokenBalance(data.balance);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingTokenBalance(false);
    }
  };

  const fetchTransactionsFromBackend = async (address: string) => {
    try {
      setLoadingTransactions(true);
      const res = await fetch(
        `http://localhost:5000/api/transactions/${address}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch transactions");
      setTransactions(data.slice(0, 10));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const sendTokens = async () => {
    if (!provider) {
      setError("Wallet not connected");
      return;
    }
    if (!recipient || !transferAmount || Number(transferAmount) <= 0) {
      setError("Invalid recipient or amount");
      return;
    }
    try {
      setloadingSend(true);
      setError("");

      const signer = await provider.getSigner();
      const token = new ethers.Contract(
        process.env.REACT_APP_TOKEN_ADDRESS || "",
        TOKEN_ABI,
        signer
      );

      const decimals = 18;
      const parsedAmount = ethers.parseUnits(transferAmount, decimals);

      console.log(recipient);
      const tx = await token.transfer(recipient, parsedAmount);
      await tx.wait();

      alert(`Sent ${transferAmount} tokens to ${recipient}!\nTxHash: ${tx.hash}`);

      const balanceBN = await token.balanceOf(await signer.getAddress());
      setTokenBalance(ethers.formatUnits(balanceBN, decimals));
    } catch (err: any) {
      if (err.code === "ACTION_REJECTED") {
        setError("Contract call rejected by user.");
      } else if (err.code === "UNCONFIGURED_NAME") {
        setError("Invalid address. Please check the recipient address.");
      } else if (err.code === "CALL_EXCEPTION") {
        setError("Insufficient token balance for transfer.");
      } else {
        setError(err.message || "Transfer failed");
      }
    } finally {
      setloadingSend(false);
    }
  };

  // --- Styles ---
  const containerStyle = {
    width: "95%",
    maxWidth: "2000px",
    margin: "20px auto",
    padding: "25px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };

  const sectionStyle = { marginBottom: "20px" };

  const inputStyle = {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    outline: "none",
  };

  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    color: "#fff",
    cursor: "pointer",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const thStyle = {
    padding: "8px",
    borderBottom: "2px solid #ddd",
  };

  const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #eee",
    wordBreak: "break-word" as const,
  };

  return (
    <div style={containerStyle}>
      {!account ? (
        <>
          <div style={{ marginBottom: "20px" }}>
            <h1>Login to your Dashboard</h1>
            <p>Use your credentials to view your MTK account and manage your tokens.</p>
          </div>

          {/* Only show Connect button when no account is connected */}
          <button
            style={{
              ...buttonStyle,
              backgroundColor: "#4CAF50",
              marginBottom: "20px",
            }}
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        </>
      ) : (
        <>
          {/* --- Two Columns Section --- */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            {/* Left Column: Wallet Info */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <h1>Welcome back to MTK!</h1>

              {/* Disconnect button */}
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f44336",
                  marginBottom: "10px",
                }}
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>

              <p>
                <strong>Account:</strong> {account}
              </p>
              <p>
                <strong>ETH Balance:</strong> {balance} ETH
              </p>
            </div>

            {/* Right Column: Token Actions */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <h3>
                Token Balance: {loadingTokenBalance ? "Loading..." : tokenBalance} MTK
              </h3>

              {/* Mint Tokens */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <input
                  type="number"
                  min={0.000000001}
                  value={mintAmount}
                  onChange={(e) => setMintAmount(Number(e.target.value))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#4CAF50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={() => mintToken(mintAmount)}
                  disabled={loadingMint}
                >
                  {loadingMint ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid #fff",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></span>
                      Minting...
                    </>
                  ) : (
                    "Mint"
                  )}
                </button>
              </div>

              {/* Send Tokens */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Recipient address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#2196F3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={sendTokens}
                  disabled={loadingSend} // or use loadingSend if you create a separate state
                >
                  {loadingSend ? ( // or loadingSend
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid #fff",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></span>
                      Sending...
                    </>
                  ) : (
                    "Send Tokens"
                  )}
                </button>
              </div>


              {error && <p style={{ color: "red", marginBottom: "20px" }}>{error}</p>}
            </div>
          </div>

          {/* --- Transactions Table (Full Width) --- */}
          <div style={{ width: "100%", overflowX: "auto", marginTop: "20px", textAlign: "center" }}>
            {loadingTransactions ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 20px",
                  backgroundColor: "#2196F3",
                  color: "#fff",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid #fff",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></span>
                Loading Transactions...
              </div>
            ) : transactions.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Hash</th>
                    <th style={thStyle}>From</th>
                    <th style={thStyle}>To</th>
                    <th style={thStyle}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.hash} style={{ backgroundColor: "#fafafa" }}>
                      <td style={tdStyle}>{tx.hash}</td>
                      <td style={tdStyle}>{tx.from}</td>
                      <td style={tdStyle}>{tx.to}</td>
                      <td style={tdStyle}>{Number(tx.value).toFixed(8)} MTK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No transactions found.</p>
            )}
          </div>
        </>
      )}
    </div>

  );

};
<style>
  {`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`}

</style>
export default Wallet;
