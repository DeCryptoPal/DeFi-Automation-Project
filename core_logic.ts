import { LendingPool, DexRouter, RestakingContract, Bridge } from "./interfaces";

/**
 * Keeper bot function for rebalancing a leveraged DeFi vault.
 *
 * This function checks the health of the vault and decides whether to
 * unwind the position or execute a new leverage loop. It demonstrates
 * how borrowing, swapping, staking, restaking and bridging can be
 * combined into a single batched transaction for efficiency.
 */
export async function rebalanceVault() {
  const healthFactor = await LendingPool.getHealthFactor(vaultAddress);
  const yieldDiff = await estimateYieldDifferential();
  const bridgeCost = await estimateBridgeCost();

  // Safety guard: exit if the position is at risk of liquidation
  if (healthFactor < 1.5) {
    console.log("Health factor too low. Unwinding position.");
    await unwindPosition();
    return;
  }

  // Only proceed if the yield benefit exceeds the cost of rebalancing
  if (yieldDiff > bridgeCost * 1.3) {
    console.log("Executing leverage loop...");

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

/**
 * Reverses a leveraged position by bridging back, unstaking, swapping,
 * repaying and withdrawing. This ensures that the vault can exit the
 * strategy atomically in response to risk events.
 */
export async function unwindPosition() {
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
