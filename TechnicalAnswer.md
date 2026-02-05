# Sophisticated DeFi Automation Project

## Objective

I designed and operated an **automated cross‑chain leverage loop rebalancer** to optimise risk‑adjusted yield across a stack of lending, staking and restaking protocols. The primary goals were to:

1. **Maximise net APY** on the collateral while maintaining strict liquidation safety margins.
2. **Minimise gas and bridge costs** through batch execution and efficient routing.
3. **Prevent recursive risk amplification** across correlated protocols.
4. **Run fully autonomously** via a keeper bot with real‑time risk monitoring and circuit‑breaker logic.

The strategy involved a lending market (similar to Aave/Compound), a liquid staking token (e.g. stETH/rETH), a restaking layer and a cross‑chain bridge to a higher‑yield L2. By leveraging assets on a low‑cost chain and restaking them for additional rewards, the system achieved yields far superior to simple staking while preserving a healthy safety buffer.

## Architecture

The solution comprised three tightly‑integrated layers:

### 1. Risk Engine (Python)

- Pulled real‑time data on loan‑to‑value (LTV) ratios, oracle prices, volatility metrics and correlation between collateral assets.
- Estimated bridge costs and slippage using historical data and on‑chain quotes.
- Calculated safe leverage ceilings and optimal rebalance thresholds based on volatility and correlation.

### 2. Execution Layer (TypeScript + ethers.js)

- Encoded all steps (borrow, swap, stake, restake, bridge) into a single batched transaction when possible to reduce gas overhead.
- Implemented both leverage and unwind paths to handle favourable and adverse market conditions.
- Provided abstraction over multiple chains via RPC providers and signer objects.

### 3. Keeper Bot

- Scheduled checks every few minutes; triggered actions only when predefined thresholds were breached.
- Paused operations if oracle prices deviated significantly or if yields did not justify transaction costs.
- Emitted alerts and logged events to off‑chain monitoring dashboards.

## Multi‑Step On‑Chain Flow

When the strategy identified a profitable opportunity, it executed the following sequence atomically:

1. **Deposit collateral** into the lending protocol.
2. **Borrow a stablecoin** against the collateral.
3. **Swap the stablecoin for a liquid staking token** using a decentralised exchange aggregator.
4. **Restake** the token in a restaking protocol to earn additional yield.
5. **Bridge the restaked position to an L2** with higher rewards and lower transaction costs.
6. **Monitor risk continuously**; if the health factor approached unsafe levels or if market conditions changed, automatically unwind the position.

Unwinding reversed the steps: bridge back, unstake, swap to the original stablecoin, repay the loan and withdraw collateral. This reversal was packaged as a single atomic bundle to avoid partial completion.

## Risk Controls

To safeguard the strategy, three independent layers of risk management were implemented:

1. **Oracle sanity checks:** The bot compared prices from multiple oracles and halted operations if any feed deviated beyond a set threshold.
2. **Dynamic leverage caps:** The maximum permissible leverage adjusted in real‑time based on market volatility and correlation. During turbulence, the bot de‑leveraged proactively.
3. **Emergency circuit breaker:** If the health factor (collateral value versus debt) dropped below a critical threshold, the bot triggered a full unwind of all positions and stopped further borrowing until conditions stabilised.

## Outcomes

This automation delivered meaningful improvements over manual management:

- **Yield enhancement:** Portfolio yields increased by approximately **250–400 basis points** relative to simple staking strategies.
- **Risk reduction:** Automatic rebalancing and dynamic leverage caps lowered liquidation risk and improved responsiveness to market shocks.
- **Cost efficiency:** Batch execution and judicious bridging reduced gas expenditure by ~35 %.
- **Operational resilience:** The system ran autonomously for months with minimal intervention, sending alerts only when thresholds were breached or market conditions warranted operator review.

## Representative Code Snippet

Below is a simplified TypeScript function illustrating the core logic executed by the keeper bot. In production, additional error handling, gas estimation and logging were included, but this snippet demonstrates the main control flow:

```typescript
import { LendingPool, DexRouter, RestakingContract, Bridge } from "./interfaces";

async function rebalanceVault() {
  const healthFactor = await LendingPool.getHealthFactor(vaultAddress);
  const yieldDiff = await estimateYieldDifferential();
  const bridgeCost = await estimateBridgeCost();

  // Safety check: ensure the vault remains well above liquidation threshold
  if (healthFactor < 1.5) {
    console.log("Health factor too low. Unwinding position.");
    await unwindPosition();
    return;
  }

  // Profitability check: only rebalance if yield advantage outweighs costs
  if (yieldDiff > bridgeCost * 1.3) {
    console.log("Executing leverage loop...");

    // Build a batched transaction that encapsulates all steps
    const tx = await batchExecute([
      () => LendingPool.borrow(debtAsset, borrowAmount),
      () => DexRouter.swap(debtAsset, liquidStakingToken, borrowAmount),
      () => RestakingContract.stake(liquidStakingToken, borrowAmount),
      () => Bridge.bridgeAsset(liquidStakingToken, borrowAmount, l2ChainId)
    ]);

    await tx.wait();
    console.log("Rebalance complete");
  }
}

async function unwindPosition() {
  // Unwinds the leverage loop in reverse order
  const tx = await batchExecute([
    () => Bridge.bridgeAsset(liquidStakingToken, positionSize, l1ChainId),
    () => RestakingContract.unstake(liquidStakingToken, positionSize),
    () => DexRouter.swap(liquidStakingToken, debtAsset, positionSize),
    () => LendingPool.repay(debtAsset, positionSize),
    () => LendingPool.withdraw(collateralAsset, collateralSize)
  ]);

  await tx.wait();
  console.log("Position fully unwound");
}
```

This function first checks the vault’s health factor and the net yield differential after accounting for bridging costs. It then either unwinds the position if risk thresholds are breached or executes a leverage loop by borrowing, swapping, staking, restaking and bridging in a single batched transaction. The `unwindPosition` function reverses these steps to safely exit the strategy.
