require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const Log   = require('../logging_middleware/log');

const BASE_URL = 'http://20.207.122.201/evaluation-service';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.EVALUATION_SERVICE_AUTHORIZATION}`,
    'Content-Type': 'application/json',
  };
}

async function fetchDepots() {
  await Log('backend', 'info', 'service', 'Requesting depot list from evaluation service');
  try {
    const res = await axios.get(`${BASE_URL}/depots`, { headers: authHeaders() });
    const depots = res.data.depots;
    await Log('backend', 'info', 'service', `Fetched ${depots.length} depots successfully`);
    return depots;
  } catch (err) {
    await Log('backend', 'error', 'service', `Depot fetch failed: ${err.message}`);
    throw err;
  }
}

async function fetchVehicles() {
  await Log('backend', 'info', 'service', 'Requesting vehicle task list from evaluation service');
  try {
    const res = await axios.get(`${BASE_URL}/vehicles`, { headers: authHeaders() });
    const vehicles = res.data.vehicles;
    await Log('backend', 'info', 'service', `Fetched ${vehicles.length} vehicle tasks successfully`);
    return vehicles;
  } catch (err) {
    await Log('backend', 'error', 'service', `Vehicle fetch failed: ${err.message}`);
    throw err;
  }
}

// 0/1 Knapsack — O(n × W) time, O(n × W) space (full table kept for backtracking)
function knapsack(vehicles, capacity) {
  const n = vehicles.length;

  // Build DP table
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { Duration: w, Impact: v } = vehicles[i - 1];
    for (let c = 0; c <= capacity; c++) {
      dp[i][c] = dp[i - 1][c];
      if (c >= w) {
        dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v);
      }
    }
  }

  // Backtrack to find which tasks were selected
  const selected = [];
  let c = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      selected.push(vehicles[i - 1]);
      c -= vehicles[i - 1].Duration;
    }
  }

  return {
    maxImpact:      dp[n][capacity],
    selected:       selected.reverse(),
    hoursUsed:      selected.reduce((sum, v) => sum + v.Duration, 0),
  };
}

function printSeparator(char = '─', width = 60) {
  console.log(char.repeat(width));
}

async function main() {
  await Log('backend', 'info', 'service', 'Vehicle Maintenance Scheduler starting up');
  console.log('\n');
  printSeparator('═');
  console.log('  VEHICLE MAINTENANCE SCHEDULER');
  printSeparator('═');

  let depots, vehicles;

  try {
    [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);
  } catch (err) {
    await Log('backend', 'fatal', 'service', `Failed to load data from evaluation service: ${err.message}`);
    console.error('\nCould not fetch data. Check your EVALUATION_SERVICE_AUTHORIZATION token.\n');
    process.exit(1);
  }

  await Log('backend', 'info', 'service',
    `Starting optimisation: ${depots.length} depots, ${vehicles.length} available vehicle tasks`);

  console.log(`\n  Depots loaded   : ${depots.length}`);
  console.log(`  Vehicle tasks   : ${vehicles.length}`);
  console.log(`  Algorithm       : 0/1 Knapsack (Dynamic Programming)`);
  console.log();

  let combinedImpact = 0;

  for (const depot of depots) {
    await Log('backend', 'debug', 'service',
      `Solving knapsack for depot ${depot.ID} — mechanic budget: ${depot.MechanicHours} hours`);

    const { maxImpact, selected, hoursUsed } = knapsack(vehicles, depot.MechanicHours);
    combinedImpact += maxImpact;

    printSeparator();
    console.log(`  Depot ${depot.ID}   |   Budget: ${depot.MechanicHours} mechanic-hours`);
    printSeparator();
    console.log(`  Max Impact Score : ${maxImpact}`);
    console.log(`  Hours Used       : ${hoursUsed} / ${depot.MechanicHours}`);
    console.log(`  Tasks Selected   : ${selected.length}`);
    console.log();

    if (selected.length === 0) {
      console.log('  (no tasks fit within the available budget)');
    } else {
      console.log('  #   Task ID (short)   Duration   Impact');
      selected.forEach((v, idx) => {
        const shortId = v.TaskID.split('-')[0];
        console.log(`  ${String(idx + 1).padStart(2, '0')}  ${shortId.padEnd(14)}  ${String(v.Duration).padEnd(9)}  ${v.Impact}`);
      });
    }

    console.log();

    await Log('backend', 'info', 'service',
      `Depot ${depot.ID} result — tasks: ${selected.length}, impact: ${maxImpact}, hours used: ${hoursUsed}/${depot.MechanicHours}`);
  }

  printSeparator('═');
  console.log('  SUMMARY');
  printSeparator('═');
  console.log(`  Depots processed      : ${depots.length}`);
  console.log(`  Combined impact score : ${combinedImpact}`);
  printSeparator('═');
  console.log();

  await Log('backend', 'info', 'service',
    `Scheduling complete — ${depots.length} depots processed, combined impact: ${combinedImpact}`);
}

main();
