/**
 * rnfp-store.test.ts — Tests for federation store implementations.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { MemoryFederationStore } from "../src/core/rnfp/rnfp-store";
import type { CyborgIdentity, FederationPeer, FederationPolicy } from "../src/core/rnfp/rnfp-types";

function makeIdentity(override: Partial<CyborgIdentity> = {}): CyborgIdentity {
  return {
    operator_name: "alice",
    fingerprint: "fp-alice-001",
    created_at: "2026-01-01T00:00:00.000Z",
    status: "active",
    ...override,
  };
}

function makePeer(id: string, status = "active" as const, override: Partial<FederationPeer> = {}): FederationPeer {
  return {
    operator_id: id,
    fingerprint: `fp-${id}-001`,
    federation_status: status,
    first_federated_at: "2026-01-01T00:00:00.000Z",
    ...override,
  };
}

describe("MemoryFederationStore — identity", () => {
  let store: MemoryFederationStore;
  beforeEach(() => { store = new MemoryFederationStore(); });

  test("loadIdentity returns null initially", () => {
    expect(store.loadIdentity()).toBeNull();
  });

  test("saveIdentity and loadIdentity round-trip", () => {
    const id = makeIdentity();
    store.saveIdentity(id);
    expect(store.loadIdentity()?.operator_name).toBe("alice");
    expect(store.loadIdentity()?.fingerprint).toBe("fp-alice-001");
  });

  test("overwrites previous identity", () => {
    store.saveIdentity(makeIdentity({ operator_name: "alice" }));
    store.saveIdentity(makeIdentity({ operator_name: "newAlice" }));
    expect(store.loadIdentity()?.operator_name).toBe("newAlice");
  });
});

describe("MemoryFederationStore — peers", () => {
  let store: MemoryFederationStore;
  beforeEach(() => { store = new MemoryFederationStore(); });

  test("loadPeers returns empty array initially", () => {
    expect(store.loadPeers()).toEqual([]);
  });

  test("upsertPeer adds new peer", () => {
    store.upsertPeer(makePeer("bob"));
    expect(store.loadPeers()).toHaveLength(1);
    expect(store.getPeer("bob")?.operator_id).toBe("bob");
  });

  test("upsertPeer updates existing peer", () => {
    store.upsertPeer(makePeer("bob", "active"));
    store.upsertPeer(makePeer("bob", "suspended"));
    expect(store.loadPeers()).toHaveLength(1);
    expect(store.getPeer("bob")?.federation_status).toBe("suspended");
  });

  test("getPeer returns undefined for missing peer", () => {
    expect(store.getPeer("nonexistent")).toBeUndefined();
  });

  test("savePeers replaces all peers", () => {
    store.upsertPeer(makePeer("bob"));
    store.savePeers([makePeer("charlie"), makePeer("dave")]);
    expect(store.loadPeers()).toHaveLength(2);
    expect(store.getPeer("bob")).toBeUndefined();
    expect(store.getPeer("charlie")).toBeDefined();
  });
});

describe("MemoryFederationStore — policies", () => {
  let store: MemoryFederationStore;
  beforeEach(() => { store = new MemoryFederationStore(); });

  test("loadPolicies returns empty array initially", () => {
    expect(store.loadPolicies()).toEqual([]);
  });

  test("upsertPolicy and getPolicy", () => {
    const policy: FederationPolicy = {
      peer_id: "bob",
      can_share_event_types: ["cyborg_session"],
      mode: "consent_required",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    store.upsertPolicy(policy);
    expect(store.getPolicy("bob")?.mode).toBe("consent_required");
  });

  test("getPolicy returns undefined for missing", () => {
    expect(store.getPolicy("missing")).toBeUndefined();
  });
});

describe("MemoryFederationStore — shared events", () => {
  let store: MemoryFederationStore;
  beforeEach(() => { store = new MemoryFederationStore(); });

  test("loadSharedEvents returns empty initially", () => {
    expect(store.loadSharedEvents()).toEqual([]);
  });

  test("appendSharedEvent accumulates events", () => {
    store.appendSharedEvent({
      source_peer_id: "bob",
      recipient_peer_id: "alice",
      timestamp_shared: "2026-01-01T00:00:00.000Z",
      signature: "sig-001",
      status: "delivered",
    });
    store.appendSharedEvent({
      source_peer_id: "charlie",
      recipient_peer_id: "alice",
      timestamp_shared: "2026-01-02T00:00:00.000Z",
      signature: "sig-002",
      status: "pending",
    });
    expect(store.loadSharedEvents()).toHaveLength(2);
  });
});
