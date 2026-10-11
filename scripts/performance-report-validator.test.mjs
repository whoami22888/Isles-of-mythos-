import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGameplayEvidence } from "./performance-report-validator.mjs";

const future = new Date(Date.now() + 60_000).toISOString();
const validEvidence = () => ({
  requestedPlayers: 1,
  gameplayCraft: {
    action: "craft",
    recipeId: "tool.wooden-club",
    transactionId: "txn-123",
    persisted: true,
    persistenceEvidence: {
      ledger: { transactionId: "txn-123", recipeId: "tool.wooden-club" },
      inventoryAfter: { "resource.wood": 0, "tool.wooden-club": 1 },
    },
  },
  gameplayMutation: {
    action: "gather_resource",
    resourceId: "node-123",
    itemId: "resource.wood",
    quantity: 2,
    persisted: true,
    persistenceEvidence: { inventoryQuantity: 2, depletedUntil: future },
  },
});

describe("performance report gameplay persistence validator", () => {
  it("rejects a report without gameplayCraft", () => {
    const report = validEvidence();
    delete report.gameplayCraft;
    assert.throws(() => validateGameplayEvidence(report, 1), /gameplayCraft/);
  });

  it("rejects a report without gameplayMutation", () => {
    const report = validEvidence();
    delete report.gameplayMutation;
    assert.throws(() => validateGameplayEvidence(report, 1), /gameplayMutation/);
  });

  it("rejects malformed, empty, and unsuccessful persistence evidence", () => {
    for (const mutate of [
      (r) => { r.gameplayCraft = {}; },
      (r) => { r.gameplayCraft.persisted = false; },
      (r) => { r.gameplayCraft.persistenceEvidence.ledger.transactionId = ""; },
      (r) => { r.gameplayMutation.persistenceEvidence.inventoryQuantity = 0; },
      (r) => { r.gameplayMutation.persisted = false; },
      (r) => { r.gameplayMutation.persistenceEvidence.depletedUntil = "not-a-date"; },
    ]) {
      const report = validEvidence();
      mutate(report);
      assert.throws(() => validateGameplayEvidence(report, 1));
    }
  });

  it("accepts valid evidence of persisted craft and resource mutation", () => {
    assert.equal(validateGameplayEvidence(validEvidence(), 1), undefined);
  });
});
