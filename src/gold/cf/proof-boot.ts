import { parseProofState, type GoldProofState } from "../proof-state";

export type ProofBootResult =
  | { kind: "empty" }
  | { kind: "hydrated"; proof: GoldProofState }
  | { kind: "corrupt"; raw: unknown };

/**
 * Decide how to treat Durable Object `proof` storage on GoldRoom boot.
 * Never treat a present-but-unreadable blob as an empty room: that silently
 * wipes closed trades and P/L after a bad migration or partial write.
 */
export function resolveProofBoot(stored: unknown | undefined | null): ProofBootResult {
  if (stored === undefined || stored === null) return { kind: "empty" };
  const proof = parseProofState(stored);
  if (!proof) return { kind: "corrupt", raw: stored };
  return { kind: "hydrated", proof };
}

export interface ProofHydrateTarget {
  hydrateProof(state: GoldProofState): void;
}

/**
 * Apply stored proof to a fresh trader. Throws when storage has a blob that
 * does not parse, so the room refuses an empty boot instead of starting over.
 */
export function applyProofBoot(trader: ProofHydrateTarget, stored: unknown | undefined | null): "empty" | "hydrated" {
  const result = resolveProofBoot(stored);
  if (result.kind === "corrupt") {
    throw new Error(
      "GoldRoom proof storage is present but unreadable; refusing empty boot to avoid wiping trade history",
    );
  }
  if (result.kind === "hydrated") {
    trader.hydrateProof(result.proof);
    return "hydrated";
  }
  return "empty";
}

/** Post-hydrate sanity check: restored snapshot must match the proof blob. */
export function hydrationLooksIntact(
  proof: GoldProofState,
  snap: { wins?: unknown; losses?: unknown; realizedUsd?: unknown; dummyTrades?: unknown },
): boolean {
  if (!proof.dummy) return true;
  if (snap.wins !== proof.dummy.wins) return false;
  if (snap.losses !== proof.dummy.losses) return false;
  if (typeof snap.realizedUsd === "number") {
    if (Math.abs(snap.realizedUsd - proof.dummy.realized) > 1e-6) return false;
  } else if (snap.realizedUsd !== proof.dummy.realized) {
    return false;
  }
  if (!Array.isArray(snap.dummyTrades)) return false;
  if (snap.dummyTrades.length !== proof.dummy.trades.length) return false;
  return true;
}
