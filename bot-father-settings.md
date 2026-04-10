# bot-father-settings

## BotFather Commands

Paste into `/setcommands`:

```
rb_aleph - Describes current sync frequency wave
rb_join - To enter a sync event
rb_quit - To quit a sync event
rb_alephs - Allow to navigate through past events
rb_menu - To open options
sp_reset - Reset conversation state
sp_invite - Send a federation INVITE to a peer
sp_accept - Accept a pending federation INVITE
sp_reject - Reject a pending federation INVITE
sp_revoke - Revoke an active federation
sp_announce - Announce a graph package
sp_request - Request a graph package from peer
sp_pkg - Deliver a graph package to peer
sp_identity - Show local identity card
sp_peers - List active federation peers
sp_fed_status - Show federation protocol status
sp_fed - RNFP protocol help
sp_fed - Federation protocol status for scriptorium_zero
hr_reset - Reset conversation state
hr_request - Send a REQUEST to interlocutor
hr_question - Send a QUESTION to interlocutor
hr_report - Send a REPORT to interlocutor
hr_proposal - Send a PROPOSAL to interlocutor
hr_fyi - Send an FYI to interlocutor
hr_urgent - Send an URGENT to interlocutor
hr_ack - Send an ACKNOWLEDGE
hr_accept - Send an ACCEPT
hr_reject - Send a REJECT
hr_defer - Send a DEFER
hr_answer - Send an ANSWER
hr_status - Show IACM protocol status
hr_protocol - Show IACM protocol help
hr_iacm - IACM status page
hr_iacm - IACM protocol status for scriptorium
```

## Menu Tree

```
/rb_menu
└── [start] Start
│   ├── (Help) → help
│   │   ├── [help] Help
│   │   │   ├── (<) → start
│   │   │   ├── (>) → close
│   │   │   │   ├── [close] Close
│   │   │   │   │   ├── (<) → start
│   │   │   │   │   ├── (<coming soon>) → 🔗 https://core.telegram.org/bots/tutorial
│   ├── (>) → close
│   │   ├── [close] Close
│   │   │   ├── (<) → start
│   │   │   ├── (<coming soon>) → 🔗 https://core.telegram.org/bots/tutorial
```

```
/sp_fed
└── [rnfp_help] 📡 RNFP/1.0 — Retro-Native Federation Protocol
```

```
/hr_iacm
└── [iacm_help] 📡 IACM/1.0 Protocol
```

