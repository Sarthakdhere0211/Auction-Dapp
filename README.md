# StellarBid — Real‑Time Stellar Auction dApp

A production-ready, real-time auction platform on **Stellar Testnet** using **Soroban smart contracts**, a **React + TypeScript + Vite** frontend, premium **Tailwind + shadcn/ui** design, and multi‑wallet support (**Freighter + Albedo**).


## 🌐 Live Demo

🚀 Live App: https://auctiondap.vercel.app

---

## Overview

StellarBid lets users list items for auction and place bids in **XLM** directly on the Stellar Testnet. All auction state (items, bids, winners) lives on a Soroban smart contract — no backend, no centralized server.

---

## Architecture

```
stellar-auction/
├── contract/                  # Soroban smart contract (Rust)
│   ├── src/lib.rs             # Full auction contract
│   └── Cargo.toml
│
├── frontend/                  # React + TypeScript + Vite
│   └── src/
│       ├── pages/             # 4 main pages
│       │   ├── Home.tsx       # Landing page
│       │   ├── Dashboard.tsx  # Auction grid + filters
│       │   ├── Auction.tsx    # Auction detail + bidding
│       │   └── Profile.tsx    # User profile + history
│       ├── components/
│       │   ├── ui/            # shadcn/ui primitives (Button, Dialog)
│       │   ├── Navbar.tsx
│       │   ├── AuctionCard.tsx
│       │   ├── BidPanel.tsx
│       │   ├── CreateAuctionDialog.tsx
│       │   └── TxStatusModal.tsx
│       ├── contract.ts        # Soroban RPC client + events polling
│       ├── wallet.ts          # Freighter + Albedo integration
│       ├── types.ts           # TypeScript interfaces
│       ├── store/             # Zustand global store
│       └── index.css          # Design system
│
├── scripts/
│   └── deploy.ps1             # Build + deploy contract, write .env
└── README.md
```

---

## Smart Contract

The Soroban contract (`contract/src/lib.rs`) exposes:

| Function | Description |
|---|---|
| `create_auction` | Create a new auction with title, category, duration, min bid |
| `place_bid` | Place a bid — validates amount, updates state, emits event |
| `end_auction` | Mark auction as ended (callable by seller or after end time) |
| `get_auction` | Read a single auction by ID |
| `get_all_auctions` | Read all auctions |
| `get_bid_history` | Get all bids for an auction |
| `get_user_bids` | Get all auction IDs a user has bid on |

**Events emitted:**
- `AucCreat` — when an auction is created
- `NewBid` — on every successful bid
- `AucEnd` — when an auction is ended

---

## Setup

### Prerequisites
- Node.js 18+
- [Freighter Wallet](https://freighter.app) browser extension
- (Optional, for contract) [Rust](https://rustup.rs/) + [Soroban CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Connect Wallet
- Install [Freighter](https://freighter.app) and/or [Albedo](https://albedo.link/)
- Set wallet network to **Testnet**
- Fund your Testnet account via [Friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY)

---

## Contract Deployment (Testnet)

### 1. Install Rust + Soroban

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt
```

### 2. Build the Contract

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

### 3. Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/auction.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet
```

Or on Windows PowerShell:

```powershell
.\scripts\deploy.ps1 -SecretKey <YOUR_SECRET_KEY>
```

### 4. Redeploy if you see "Auction has ended" when placing a bid

If the UI shows the auction as OPEN but placing a bid fails with **"Auction has ended"**, the contract on the network is an older version. The current contract **reopens the auction** when someone bids after the end time. Redeploy the contract (step 3 above or `.\scripts\deploy.ps1 -SecretKey <YOUR_SECRET_KEY>`); the script will update `.env` with the new contract ID. Restart the frontend and try placing a bid again.

### 5. Configure Frontend

Create `.env` at repository root (preferred) or `frontend/.env`:

```env
VITE_CONTRACT_ID=CAHTZRPJVT4SLLOQA3UW5N5XRV3IOHBH2SR4MBREZ75LHIRYGP4NOSKN
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
```

---

## Features

- Multi‑wallet: Freighter + Albedo
- Real‑time bids via Soroban events polling
- Create auctions and place bids with signed transactions
- Transaction status modal with Stellar Expert link
- Premium dark UI with shadcn/ui, Tailwind, and micro‑animations
- Type‑safe forms with zod + react‑hook‑form; debounced inputs
- Global state via Zustand


## Explorer Verification

After placing a bid, the UI shows a transaction hash with a direct link to:

[Stellar Expert Testnet](https://stellar.expert/explorer/testnet)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar Testnet |
| Smart Contract | Soroban (Rust) |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 6 |
| Styling | TailwindCSS Lawson + shadcn/ui |
| Wallet | Freighter, Albedo |
| Routing | React Router v6 |
| Notifications | react-hot-toast |
| Animations | Framer Motion |
| State | Zustand |
| Icons | Lucide React |

---

## Screenshots

<img width="1380" height="375" alt="Screenshot 2026-02-26 141107" src="https://github.com/user-attachments/assets/0ce421c5-9454-4fd0-84f5-18cf6183a05b" />

<img width="1911" height="864" alt="Screenshot 2026-02-26 195640" src="https://github.com/user-attachments/assets/6b115002-290a-467d-8a21-918bbaf9772a" />

---

## ## 🎥 Demo

[Watch Demo](./frontend/demo.mp4)
---

## Test 
<img width="1564" height="468" alt="image" src="https://github.com/user-attachments/assets/1a7bb24a-81b7-4b9b-91ad-ecc8c5f63120" />

## Environment Notes

- Env lives at the project root and is loaded by Vite.
- After editing `.env`, restart the dev server:
  - `Ctrl+C` then `npm run dev`
