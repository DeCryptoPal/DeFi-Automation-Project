/*
 * Entry point for the DeFi automation demo application. This file is used
 * solely to demonstrate that a simple TypeScript project can import and
 * bundle the rebalancing logic defined in core_logic.ts. When executed with
 * `npm run build` the webpack configuration will transpile and bundle
 * this file and its dependencies into a single JavaScript output under the
 * `dist` folder. The rebalance functions are imported to prove that
 * compilation works, but they are not executed in this demo script.
 */

import { rebalanceVault, unwindPosition } from '../core_logic';

function main() {
  console.log('DeFi Automation project build complete.');
  console.log('rebalanceVault and unwindPosition imported successfully:', typeof rebalanceVault === 'function', typeof unwindPosition === 'function');
}

main();
