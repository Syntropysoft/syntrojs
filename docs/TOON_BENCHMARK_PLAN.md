# TOON Format Benchmark Plan

## 🎯 Objective

Validate TOON's efficiency claims with real-world infrastructure testing comparing Express, Fastify, and SyntroJS using actual cloud deployments and measurable costs.

---

## 📊 Benchmark Design

### Test Scenario

**Endpoint:** `GET /api/users`

**Response:** 100 user objects with realistic data

**Sample Payload Structure:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "address": {
        "street": "123 Main Street",
        "city": "Springfield",
        "state": "IL",
        "country": "USA",
        "zipCode": "62701"
      },
      "company": {
        "name": "Acme Corporation",
        "position": "Senior Developer",
        "department": "Engineering"
      },
      "orders": [
        {
          "id": 1001,
          "total": 250.50,
          "items": 3,
          "date": "2024-01-15T10:30:00Z"
        },
        {
          "id": 1002,
          "total": 180.00,
          "items": 2,
          "date": "2024-02-20T14:45:00Z"
        }
      ],
      "metadata": {
        "lastLogin": "2024-11-06T08:00:00Z",
        "accountStatus": "active",
        "emailVerified": true,
        "twoFactorEnabled": false
      }
    }
    // ... 99 more users
  ]
}
```

**Expected Payload Sizes:**
- JSON: ~45 KB (45,000 bytes)
- TOON: ~18 KB (18,000 bytes) - **60% reduction**

---

## 🏗️ Infrastructure Setup

### Applications

```
frameworks-benchmark/
├── apps/
│   ├── express-app/
│   │   ├── package.json
│   │   ├── server.js
│   │   ├── data.js           # Shared user generator
│   │   └── Dockerfile
│   ├── fastify-app/
│   │   ├── package.json
│   │   ├── server.js
│   │   ├── data.js
│   │   └── Dockerfile
│   └── syntrojs-app/
│       ├── package.json
│       ├── server.js
│       ├── data.js
│       └── Dockerfile
├── load-testing/
│   ├── artillery.yml
│   ├── k6-script.js
│   └── locust.py
├── monitoring/
│   ├── grafana-dashboard.json
│   └── collect-metrics.js
├── results/
│   └── .gitkeep
└── docker-compose.yml
```

---

## 💻 Implementation

### Express App

**File: `apps/express-app/server.js`**

```javascript
const express = require('express');
const compression = require('compression');
const { generateUsers } = require('./data');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression (standard practice)
app.use(compression());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', framework: 'express' });
});

// Main endpoint
app.get('/api/users', (req, res) => {
  const users = generateUsers(100);
  res.json({ users });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
```

---

### Fastify App

**File: `apps/fastify-app/server.js`**

```javascript
const fastify = require('fastify')({ logger: false });
const { generateUsers } = require('./data');

const PORT = process.env.PORT || 3000;

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', framework: 'fastify' };
});

// Main endpoint
fastify.get('/api/users', async (request, reply) => {
  const users = generateUsers(100);
  return { users };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Fastify server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

---

### SyntroJS App

**File: `apps/syntrojs-app/server.js`**

```javascript
import { SyntroJS } from 'syntrojs';
import { generateUsers } from './data.js';

const PORT = process.env.PORT || 3000;

// JSON version (for comparison)
const appJSON = new SyntroJS({ 
  title: 'SyntroJS Benchmark (JSON)',
  docs: false
});

appJSON.get('/api/users', {
  handler: () => ({ users: generateUsers(100) })
});

// TOON version (the differentiator)
const appTOON = new SyntroJS({ 
  title: 'SyntroJS Benchmark (TOON)',
  serialization: 'toon',
  docs: false
});

appTOON.get('/api/users', {
  handler: () => ({ users: generateUsers(100) })
});

// Run both on different ports
await appJSON.listen(3000);
await appTOON.listen(3001);

console.log('SyntroJS JSON server running on port 3000');
console.log('SyntroJS TOON server running on port 3001');
```

---

### Shared Data Generator

**File: `data.js`** (same for all apps)

```javascript
function generateUser(id) {
  return {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    username: `user${id}`,
    address: {
      street: `${100 + id} Main Street`,
      city: 'Springfield',
      state: 'IL',
      country: 'USA',
      zipCode: `${62700 + id}`
    },
    company: {
      name: `Company ${id % 10}`,
      position: id % 2 === 0 ? 'Senior Developer' : 'Product Manager',
      department: id % 3 === 0 ? 'Engineering' : 'Product'
    },
    orders: [
      {
        id: 1000 + id,
        total: 100 + (id * 1.5),
        items: 1 + (id % 5),
        date: new Date(2024, 0, id % 28 + 1).toISOString()
      },
      {
        id: 2000 + id,
        total: 200 + (id * 2.5),
        items: 2 + (id % 3),
        date: new Date(2024, 1, id % 28 + 1).toISOString()
      }
    ],
    metadata: {
      lastLogin: new Date().toISOString(),
      accountStatus: id % 10 === 0 ? 'inactive' : 'active',
      emailVerified: id % 2 === 0,
      twoFactorEnabled: id % 5 === 0
    }
  };
}

function generateUsers(count) {
  return Array.from({ length: count }, (_, i) => generateUser(i + 1));
}

module.exports = { generateUsers };
// or: export { generateUsers };
```

---

## 🧪 Load Testing

### Option 1: Artillery (Recommended)

**File: `load-testing/artillery.yml`**

```yaml
config:
  target: "{{ $processEnvironment.TARGET_URL }}"
  phases:
    - duration: 300  # 5 minutes
      arrivalRate: 10  # 10 requests/second
      name: "Warm up"
    - duration: 600  # 10 minutes
      arrivalRate: 30  # 30 requests/second
      name: "Sustained load"
    - duration: 300  # 5 minutes
      arrivalRate: 50  # 50 requests/second
      name: "Peak load"
  
  processor: "./collect-metrics.js"

scenarios:
  - name: "Get users endpoint"
    flow:
      - get:
          url: "/api/users"
          afterResponse: "captureMetrics"
```

**File: `load-testing/collect-metrics.js`**

```javascript
const fs = require('fs');
const path = require('path');

let totalBytes = 0;
let requestCount = 0;
let latencies = [];

module.exports = {
  captureMetrics: function(requestParams, response, context, ee, next) {
    const contentLength = parseInt(response.headers['content-length'] || 0);
    totalBytes += contentLength;
    requestCount++;
    
    const latency = response.timings?.end || 0;
    latencies.push(latency);
    
    // Save every 100 requests
    if (requestCount % 100 === 0) {
      const metrics = {
        timestamp: new Date().toISOString(),
        totalBytes,
        requestCount,
        avgPayloadSize: totalBytes / requestCount,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95Latency: percentile(latencies, 95),
        p99Latency: percentile(latencies, 99)
      };
      
      const resultsFile = path.join(__dirname, '../results/metrics.jsonl');
      fs.appendFileSync(resultsFile, JSON.stringify(metrics) + '\n');
    }
    
    return next();
  }
};

function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[index];
}
```

---

### Option 2: k6 (Alternative)

**File: `load-testing/k6-script.js`**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const payloadSize = new Trend('payload_size');
const totalBytes = new Counter('total_bytes');

export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Warm up
    { duration: '10m', target: 30 },  // Sustained
    { duration: '5m', target: 50 },   // Peak
    { duration: '2m', target: 0 },    // Cool down
  ],
};

export default function () {
  const res = http.get(__ENV.TARGET_URL + '/api/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has users': (r) => JSON.parse(r.body).users.length === 100,
  });
  
  const size = parseInt(res.headers['Content-Length'] || res.body.length);
  payloadSize.add(size);
  totalBytes.add(size);
  
  sleep(1);
}
```

---

## 📊 Metrics Collection

### What to Measure

1. **Payload Size**
   - Average bytes per request
   - Total bandwidth consumed
   - Compression effectiveness

2. **Performance**
   - Requests per second
   - Average latency
   - P95/P99 latency
   - Error rate

3. **Cost Estimation**
   - Bandwidth cost ($/GB)
   - Compute cost ($/hour)
   - Total cost for 100K requests
   - Projected monthly cost

### Cloud Provider Pricing (November 2024)

**AWS:**
- Data Transfer Out: $0.09/GB (first 10 TB)
- EC2 t3.micro: $0.0104/hour

**Railway (Free Tier):**
- 500 hours/month
- $0.10/GB bandwidth (after 100 GB)

**Render (Free Tier):**
- 750 hours/month
- 100 GB bandwidth free

---

## 🎯 Test Execution Plan

### Phase 1: Local Testing (Day 1)

```bash
# Start all apps with docker-compose
docker-compose up

# Run quick smoke test
artillery quick --count 100 --num 10 http://localhost:3000/api/users
artillery quick --count 100 --num 10 http://localhost:3001/api/users
artillery quick --count 100 --num 10 http://localhost:3002/api/users
artillery quick --count 100 --num 10 http://localhost:3003/api/users

# Verify payload sizes
curl -s http://localhost:3000/api/users | wc -c  # Express
curl -s http://localhost:3001/api/users | wc -c  # Fastify
curl -s http://localhost:3002/api/users | wc -c  # SyntroJS (JSON)
curl -s http://localhost:3003/api/users | wc -c  # SyntroJS (TOON)
```

**Expected output:**
```
Express:          ~45,200 bytes (JSON with compression)
Fastify:          ~45,200 bytes (JSON with compression)
SyntroJS (JSON):  ~45,200 bytes (JSON with compression)
SyntroJS (TOON):  ~18,100 bytes (TOON - 60% smaller!) ⚡
```

---

### Phase 2: Cloud Deployment (Day 2)

**Deploy to Railway/Render:**

```bash
# Express
cd apps/express-app
railway up  # or: render deploy

# Fastify
cd apps/fastify-app
railway up

# SyntroJS (both versions)
cd apps/syntrojs-app
railway up
```

**Verify deployments:**
```bash
curl https://express-benchmark.railway.app/health
curl https://fastify-benchmark.railway.app/health
curl https://syntrojs-json-benchmark.railway.app/health
curl https://syntrojs-toon-benchmark.railway.app/health
```

---

### Phase 3: Load Testing (Days 3-4)

**Run 100K requests distributed over 24 hours:**

```bash
# Express
TARGET_URL=https://express-benchmark.railway.app artillery run load-testing/artillery.yml

# Fastify
TARGET_URL=https://fastify-benchmark.railway.app artillery run load-testing/artillery.yml

# SyntroJS (JSON)
TARGET_URL=https://syntrojs-json-benchmark.railway.app artillery run load-testing/artillery.yml

# SyntroJS (TOON)
TARGET_URL=https://syntrojs-toon-benchmark.railway.app artillery run load-testing/artillery.yml
```

**Monitor in real-time:**
```bash
# Watch metrics file grow
tail -f results/metrics.jsonl

# Dashboard (if using Grafana)
open http://localhost:3001
```

---

### Phase 4: Analysis (Day 5)

**Analyze results:**

```javascript
// File: analyze-results.js
const fs = require('fs');

function analyzeMetrics(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const metrics = lines.map(line => JSON.parse(line));
  
  const totalRequests = metrics[metrics.length - 1].requestCount;
  const totalBytes = metrics[metrics.length - 1].totalBytes;
  const totalGB = totalBytes / (1024 ** 3);
  
  const avgPayload = totalBytes / totalRequests;
  const avgLatency = metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length;
  
  // AWS pricing
  const bandwidthCost = totalGB * 0.09;  // $0.09/GB
  
  // Projection
  const costPerMillion = (bandwidthCost / totalRequests) * 1_000_000;
  const costPerMonth = costPerMillion;  // Assuming 1M req/month
  
  return {
    framework: filePath.includes('express') ? 'Express' : 
               filePath.includes('fastify') ? 'Fastify' :
               filePath.includes('toon') ? 'SyntroJS (TOON)' : 'SyntroJS (JSON)',
    totalRequests,
    totalGB: totalGB.toFixed(2),
    avgPayloadKB: (avgPayload / 1024).toFixed(2),
    avgLatencyMs: avgLatency.toFixed(2),
    bandwidthCost: bandwidthCost.toFixed(2),
    costPerMonth: costPerMonth.toFixed(2)
  };
}

// Analyze all results
const results = [
  analyzeMetrics('results/express-metrics.jsonl'),
  analyzeMetrics('results/fastify-metrics.jsonl'),
  analyzeMetrics('results/syntrojs-json-metrics.jsonl'),
  analyzeMetrics('results/syntrojs-toon-metrics.jsonl')
];

console.table(results);

// Save to JSON for visualization
fs.writeFileSync('results/final-comparison.json', JSON.stringify(results, null, 2));
```

**Expected output:**
```
┌─────────┬──────────────────┬──────────┬──────────┬───────────┬──────────────┐
│ (index) │ framework        │ totalGB  │ avgKB    │ cost      │ monthly cost │
├─────────┼──────────────────┼──────────┼──────────┼───────────┼──────────────┤
│    0    │ Express          │ '4.52'   │ '45.20'  │ '$0.41'   │ '$4.07'      │
│    1    │ Fastify          │ '4.52'   │ '45.20'  │ '$0.41'   │ '$4.07'      │
│    2    │ SyntroJS (JSON)  │ '4.52'   │ '45.20'  │ '$0.41'   │ '$4.07'      │
│    3    │ SyntroJS (TOON)  │ '1.81'   │ '18.10'  │ '$0.16'   │ '$1.63'      │ ⚡
└─────────┴──────────────────┴──────────┴──────────┴───────────┴──────────────┘

💰 SAVINGS with TOON: $2.44/month per 1M requests
💰 At 10M requests/month: $24.40/month saved
💰 Annual savings (10M/month): $292.80/year
```

---

## 📸 Visual Assets

### Screenshots to Capture

1. **Chrome DevTools Network Panel**
   - JSON payload: 45.2 KB
   - TOON payload: 18.1 KB
   - Side by side comparison

2. **Cost Dashboard**
   - Bar chart: Express vs Fastify vs SyntroJS
   - Highlighted savings with TOON

3. **Grafana Dashboard** (if implemented)
   - Real-time metrics during load test
   - Bandwidth consumption over time

4. **Terminal Output**
   - curl commands showing readable TOON
   - Metrics table

---

## 🎬 Video Recording Checklist

- [ ] Clean terminal (clear history)
- [ ] Zoom font size for visibility
- [ ] Record in 1080p
- [ ] Show curl with JSON response
- [ ] Show curl with TOON response (human-readable!)
- [ ] Show network panel side-by-side
- [ ] Show final cost comparison table
- [ ] Highlight the one-line code change

---

## 💰 Budget Breakdown

| Item | Estimated Cost |
|------|---------------|
| Railway free tier | $0 |
| Bandwidth overage (if any) | $5-10 |
| Render free tier | $0 |
| Load testing tools | $0 (open source) |
| **TOTAL** | **$0-10** |

---

## ✅ Validation Criteria

**Success means:**
- ✅ TOON payload is 40-60% smaller than JSON
- ✅ TOON is human-readable (can curl and read it)
- ✅ Performance is comparable (±10% latency)
- ✅ Cost savings are real and measurable
- ✅ Setup is truly "one line of code"

---

## 📝 Next Steps

1. Create GitHub repo: `syntrojs-toon-benchmark`
2. Implement the 4 apps
3. Test locally with docker-compose
4. Deploy to Railway/Render
5. Run load tests
6. Analyze results
7. Create visual assets
8. Record demo video
9. Write blog post with real data
10. Launch! 🚀

---

**This benchmark will be the proof that TOON isn't just theory - it's real savings with real infrastructure.**

