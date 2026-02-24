# ika_dWallet_tutorial

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file in the root directory:
```env
SUI_PRIVATE_KEY=your_private_key_here
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
```

## Commands

### Create a dWallet
Runs the DKG (Distributed Key Generation) process and saves the result to `output/dwallet_result.json`.
```bash
pnpm create-dWallet
```

### Activate a dWallet
Accepts the encrypted user share and activates the dWallet. Requires `output/dwallet_result.json` to exist.
```bash
pnpm activate-dWallet
```

### Create a Presign
Requests a presign from the network. Requires the dWallet to be in `Active` state.
```bash
pnpm create-presign
```

## Order of Operations

Run the commands in this order:

```
1. pnpm create-dWallet
2. pnpm activate-dWallet
3. pnpm create-presign
```
