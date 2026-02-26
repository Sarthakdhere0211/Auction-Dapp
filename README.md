# StellarBid — Real‑Time Stellar Auction dApp

A production-ready, real-time auction platform on **Stellar Testnet** using **Soroban smart contracts**, a **React + TypeScript + Vite** frontend, premium **Tailwind + shadcn/ui** design, and multi‑wallet support (**Freighter + Albedo**).

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

### 4. Configure Frontend

Create `.env` at repository root (preferred) or `frontend/.env`:

```env
VITE_CONTRACT_ID=<YOUR_DEPLOYED_CONTRACT_ID>
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

## Contract Address

> **Testnet Contract ID:** `[Deploy and paste here]`

---

## Example Transaction Hash

> `[Paste a real tx hash from Stellar Expert after deploying]`

---

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

> *(Add screenshots after running the app)*

- Landing page
- Dashboard (auction grid)
- Auction detail page
- Profile page

---

## Environment Notes

- Env lives at the project root and is loaded by Vite.
- After editing `.env`, restart the dev server:
  - `Ctrl+C` then `npm run dev`
