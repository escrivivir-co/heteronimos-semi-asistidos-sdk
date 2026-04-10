# Federation Demo — Standalone CyborgBot

Standalone example of a bot that implements the RNFP/1.0 federation protocol.

Uses a single `CyborgBot` (pluginCode `cy`) that inherits all protocol behaviour
from `FederationBotPlugin` — this class only configures operator identity.

## Quick start

```bash
# From repo root:
bun run build:sdk
cd examples/federation-demo
bun install
bun run main.ts --mock
```

## Commands

All commands are prefixed with `cy_`:

| Command | Description |
|---------|-------------|
| `/cy_invite <peer>` | Send a federation INVITE |
| `/cy_accept` | Accept a pending INVITE |
| `/cy_reject` | Reject a pending INVITE |
| `/cy_revoke` | Revoke an active federation |
| `/cy_announce` | Announce a graph package |
| `/cy_identity` | Show local identity card |
| `/cy_peers` | List active federation peers |
| `/cy_fed_status` | Show federation protocol status |

## Relationship to the Dashboard

The **dashboard** (`examples/dashboard/`) integrates federation via `SpiderBot`
(pluginCode `sp`) alongside `HorseBot` (IACM) and `RabbitBot` (broadcast).

This demo is a **standalone single-protocol example** — useful for learning and
testing federation in isolation. For production, use the dashboard's multi-plugin
architecture.
