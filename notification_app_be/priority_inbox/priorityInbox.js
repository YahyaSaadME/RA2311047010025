require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const axios = require('axios');
const Log   = require('../../logging_middleware/log');

const TYPE_WEIGHT = { Placement: 3, Result: 2, Event: 1 };

// Min-Heap
class MinHeap {
  constructor() { this.data = []; }

  get size() { return this.data.length; }
  peek()     { return this.data[0]; }

  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top  = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].score <= this.data[i].score) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].score < this.data[smallest].score) smallest = l;
      if (r < n && this.data[r].score < this.data[smallest].score) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

function computeScore(notification) {
  const weight    = TYPE_WEIGHT[notification.Type] || 0;
  const timestamp = new Date(notification.Timestamp).getTime();
  return weight * 1e13 + timestamp;
}

function getTopN(notifications, n) {
  const heap = new MinHeap();

  for (const notif of notifications) {
    const score = computeScore(notif);
    const item  = { ...notif, score };

    if (heap.size < n) {
      heap.push(item);
    } else if (score > heap.peek().score) {
      heap.pop();
      heap.push(item);
    }
  }

  const result = [];
  while (heap.size > 0) result.push(heap.pop());
  return result.reverse();
}

async function main() {
  const TOP_N = 10;

  await Log('backend', 'info', 'service',
    `Priority inbox starting — will compute top ${TOP_N} notifications`);

  let notifications;

  try {
    const res = await axios.get('http://20.207.122.201/evaluation-service/notifications', {
      headers: {
        Authorization: `Bearer ${process.env.EVALUATION_SERVICE_AUTHORIZATION}`,
        'Content-Type': 'application/json',
      },
    });

    notifications = res.data.notifications;
    await Log('backend', 'info', 'service',
      `Fetched ${notifications.length} notifications from evaluation service`);
  } catch (err) {
    await Log('backend', 'error', 'service',
      `Failed to fetch notifications: ${err.message}`);
    console.error('Error fetching notifications:', err.message);
    process.exit(1);
  }

  const topN = getTopN(notifications, TOP_N);

  await Log('backend', 'info', 'service',
    `Top ${TOP_N} computed — #1 is [${topN[0]?.Type}] "${topN[0]?.Message}" at ${topN[0]?.Timestamp}`);

  // ── Display ───────────────────────────────────────────────────────────────
  const line = '─'.repeat(72);
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  PRIORITY INBOX — TOP ${TOP_N} NOTIFICATIONS`);
  console.log(`${'═'.repeat(72)}\n`);
  console.log(`  Total notifications fetched : ${notifications.length}`);
  console.log(`  Showing top                 : ${TOP_N}`);
  console.log(`  Ranking                     : Type weight (Placement > Result > Event) then recency\n`);
  console.log(line);

  const typeLabel = { Placement: '🏢 PLACEMENT', Result: '📋 RESULT', Event: '📅 EVENT' };

  topN.forEach((notif, i) => {
    const rank  = String(i + 1).padStart(2, ' ');
    const label = typeLabel[notif.Type] || notif.Type.toUpperCase();
    console.log(`\n  ${rank}. ${label}`);
    console.log(`      Message   : ${notif.Message}`);
    console.log(`      ID        : ${notif.ID}`);
    console.log(`      Timestamp : ${notif.Timestamp}`);
  });

  console.log(`\n${line}\n`);
}

main();
