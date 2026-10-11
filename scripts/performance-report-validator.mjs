import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_PLAYERS = [1, 50, 250, 1000];

export function validateGameplayEvidence(websocket, players) {
  if (!websocket || typeof websocket !== "object" || Array.isArray(websocket)) {
    throw new Error("Missing WebSocket gameplay report for " + players + " players");
  }

  const craft = websocket.gameplayCraft;
  if (!craft || typeof craft !== "object" || Array.isArray(craft)) {
    throw new Error("Missing or malformed gameplayCraft evidence for " + players + " players");
  }
  if (craft.action !== "craft" ||
      typeof craft.recipeId !== "string" || craft.recipeId.length === 0 ||
      typeof craft.transactionId !== "string" || craft.transactionId.length === 0 ||
      craft.persisted !== true ||
      !craft.persistenceEvidence || typeof craft.persistenceEvidence !== "object" ||
      craft.persistenceEvidence.ledger?.transactionId !== craft.transactionId ||
      craft.persistenceEvidence.ledger?.recipeId !== craft.recipeId ||
      craft.persistenceEvidence.inventoryAfter?.["resource.wood"] !== 0 ||
      craft.persistenceEvidence.inventoryAfter?.["tool.wooden-club"] !== 1) {
    throw new Error("Missing, unsuccessful, or invalid persisted gameplayCraft evidence for " + players + " players");
  }

  const mutation = websocket.gameplayMutation;
  if (!mutation || typeof mutation !== "object" || Array.isArray(mutation)) {
    throw new Error("Missing or malformed gameplayMutation evidence for " + players + " players");
  }
  if (mutation.action !== "gather_resource" ||
      typeof mutation.resourceId !== "string" || mutation.resourceId.length === 0 ||
      typeof mutation.itemId !== "string" || mutation.itemId.length === 0 ||
      !Number.isSafeInteger(mutation.quantity) || mutation.quantity <= 0 ||
      mutation.persisted !== true ||
      !mutation.persistenceEvidence || typeof mutation.persistenceEvidence !== "object" ||
      !Number.isSafeInteger(mutation.persistenceEvidence.inventoryQuantity) ||
      mutation.persistenceEvidence.inventoryQuantity < mutation.quantity ||
      typeof mutation.persistenceEvidence.depletedUntil !== "string" ||
      !Number.isFinite(Date.parse(mutation.persistenceEvidence.depletedUntil))) {
    throw new Error("Missing, unsuccessful, or invalid persisted gameplayMutation evidence for " + players + " players");
  }
}

export function validatePerformanceReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report) ||
      report.event !== "sustained_load_complete" ||
      !Array.isArray(report.scenarios) ||
      report.scenarios.length !== EXPECTED_PLAYERS.length) {
    throw new Error("Performance acceptance report is missing or incomplete");
  }

  for (let index = 0; index < EXPECTED_PLAYERS.length; index += 1) {
    const expected = EXPECTED_PLAYERS[index];
    const scenario = report.scenarios[index];
    if (!scenario || scenario.players !== expected ||
        scenario.http?.requests !== 100 || scenario.http?.errors !== 0) {
      throw new Error("Invalid HTTP/player-load result for " + expected + " players");
    }
    const websocket = scenario.websocket;
    if (websocket?.requestedPlayers !== expected ||
        websocket.connected !== expected ||
        websocket.authenticated !== expected ||
        websocket.errors !== 0 ||
        !Number.isSafeInteger(websocket.pings) || websocket.pings <= 0 ||
        websocket.pongs !== websocket.pings ||
        websocket.pingSuccessRate !== 1) {
      throw new Error("Invalid WebSocket acceptance result for " + expected + " players");
    }
    for (const [name, value] of [["HTTP p95", scenario.http.p95Ms], ["WebSocket p95", websocket.p95Ms]]) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("Missing or invalid " + name + " metric for " + expected + " players");
      }
    }
    validateGameplayEvidence(websocket, expected);
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = JSON.parse(readFileSync("performance-results.json", "utf8"));
  validatePerformanceReport(report);
  console.log("Performance acceptance report verified, including persisted craft and gameplay mutation evidence for 1, 50, 250, and 1000 players.");
}
