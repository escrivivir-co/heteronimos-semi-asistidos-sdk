/**
 * rnfp-store.ts — Persistencia para el protocolo RNFP.
 *
 * FederationStore es la contraparte de ChatStore (SDS-14) para datos de federación.
 * Persiste identidad local, peers y políticas.
 *
 * Implementaciones:
 *   FileFederationStore  — almacena en JSON en disco (Bun/Node)
 *   MemoryFederationStore — en memoria (tests, demos)
 */

import type {
  CyborgIdentity,
  FederationPeer,
  FederationPolicy,
  SharedEvent,
} from "./rnfp-types.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface FederationStore {
  /** Local identity of this operator. null if not yet initialized. */
  loadIdentity(): CyborgIdentity | null;
  saveIdentity(identity: CyborgIdentity): void;

  loadPeers(): FederationPeer[];
  savePeers(peers: FederationPeer[]): void;
  getPeer(operatorId: string): FederationPeer | undefined;
  upsertPeer(peer: FederationPeer): void;

  loadPolicies(): FederationPolicy[];
  savePolicies(policies: FederationPolicy[]): void;
  getPolicy(peerId: string): FederationPolicy | undefined;
  upsertPolicy(policy: FederationPolicy): void;

  /** Append a shared-event audit record. */
  appendSharedEvent(event: SharedEvent): void;
  loadSharedEvents(): SharedEvent[];
}

// ─── In-memory implementation ─────────────────────────────────────────────────

export class MemoryFederationStore implements FederationStore {
  private identity: CyborgIdentity | null = null;
  private peers: FederationPeer[] = [];
  private policies: FederationPolicy[] = [];
  private events: SharedEvent[] = [];

  loadIdentity(): CyborgIdentity | null { return this.identity; }
  saveIdentity(identity: CyborgIdentity): void { this.identity = identity; }

  loadPeers(): FederationPeer[] { return [...this.peers]; }
  savePeers(peers: FederationPeer[]): void { this.peers = [...peers]; }
  getPeer(operatorId: string): FederationPeer | undefined {
    return this.peers.find(p => p.operator_id === operatorId);
  }
  upsertPeer(peer: FederationPeer): void {
    const idx = this.peers.findIndex(p => p.operator_id === peer.operator_id);
    if (idx >= 0) this.peers[idx] = peer;
    else this.peers.push(peer);
  }

  loadPolicies(): FederationPolicy[] { return [...this.policies]; }
  savePolicies(policies: FederationPolicy[]): void { this.policies = [...policies]; }
  getPolicy(peerId: string): FederationPolicy | undefined {
    return this.policies.find(p => p.peer_id === peerId);
  }
  upsertPolicy(policy: FederationPolicy): void {
    const idx = this.policies.findIndex(p => p.peer_id === policy.peer_id);
    if (idx >= 0) this.policies[idx] = policy;
    else this.policies.push(policy);
  }

  appendSharedEvent(event: SharedEvent): void { this.events.push(event); }
  loadSharedEvents(): SharedEvent[] { return [...this.events]; }
}

// ─── File-backed implementation ───────────────────────────────────────────────

interface FederationStoreData {
  identity: CyborgIdentity | null;
  peers: FederationPeer[];
  policies: FederationPolicy[];
  events: SharedEvent[];
}

export class FileFederationStore implements FederationStore {
  private readonly path: string;
  private cache: FederationStoreData;

  constructor(filePath: string) {
    this.path = filePath;
    this.cache = this.load();
  }

  private load(): FederationStoreData {
    if (!existsSync(this.path)) {
      return { identity: null, peers: [], policies: [], events: [] };
    }
    try {
      const raw = readFileSync(this.path, "utf8");
      return JSON.parse(raw) as FederationStoreData;
    } catch {
      return { identity: null, peers: [], policies: [], events: [] };
    }
  }

  private flush(): void {
    const dir = dirname(this.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.cache, null, 2), "utf8");
  }

  loadIdentity(): CyborgIdentity | null { return this.cache.identity; }
  saveIdentity(identity: CyborgIdentity): void {
    this.cache.identity = identity;
    this.flush();
  }

  loadPeers(): FederationPeer[] { return [...this.cache.peers]; }
  savePeers(peers: FederationPeer[]): void {
    this.cache.peers = [...peers];
    this.flush();
  }
  getPeer(operatorId: string): FederationPeer | undefined {
    return this.cache.peers.find(p => p.operator_id === operatorId);
  }
  upsertPeer(peer: FederationPeer): void {
    const idx = this.cache.peers.findIndex(p => p.operator_id === peer.operator_id);
    if (idx >= 0) this.cache.peers[idx] = peer;
    else this.cache.peers.push(peer);
    this.flush();
  }

  loadPolicies(): FederationPolicy[] { return [...this.cache.policies]; }
  savePolicies(policies: FederationPolicy[]): void {
    this.cache.policies = [...policies];
    this.flush();
  }
  getPolicy(peerId: string): FederationPolicy | undefined {
    return this.cache.policies.find(p => p.peer_id === peerId);
  }
  upsertPolicy(policy: FederationPolicy): void {
    const idx = this.cache.policies.findIndex(p => p.peer_id === policy.peer_id);
    if (idx >= 0) this.cache.policies[idx] = policy;
    else this.cache.policies.push(policy);
    this.flush();
  }

  appendSharedEvent(event: SharedEvent): void {
    this.cache.events.push(event);
    this.flush();
  }
  loadSharedEvents(): SharedEvent[] { return [...this.cache.events]; }
}
