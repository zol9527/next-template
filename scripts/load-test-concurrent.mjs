#!/usr/bin/env node

/**
 * 并发负载测试脚本 - 测试目标站在 10 并发下的响应情况
 *
 * 使用方式: node scripts/load-test-concurrent.mjs [domain] [concurrency]
 */

const BASE_URL = process.argv[2] || 'https://www.shuoboda.cn';
const CONCURRENCY = parseInt(process.argv[3] || '10', 10);

const PUBLIC_ENDPOINTS = [
  { name: '健康检查', path: '/api/v1/admin/ping' },
  { name: '公共配置', path: '/api/v1/public/config' },
  { name: '产品列表', path: '/api/v1/public/products' },
  { name: '分类列表', path: '/api/v1/public/categories' },
  { name: '公告列表', path: '/api/v1/public/announcements' },
  { name: '博客文章', path: '/api/v1/public/blog/articles' },
  { name: '博客分类', path: '/api/v1/public/blog/categories' },
  { name: '博客标签', path: '/api/v1/public/blog/tags' },
  { name: '轮播图', path: '/api/v1/public/miniprogram/carousels' },
  { name: 'FAQ', path: '/api/v1/public/miniprogram/faq' },
  { name: '首页配置', path: '/api/v1/public/miniprogram/home-config' },
  { name: '商店配置', path: '/api/v1/public/miniprogram/shop-config' },
  { name: '协议列表', path: '/api/v1/public/agreements' },
];

const HOMEPAGE_ENDPOINTS = [
  '/api/v1/public/config',
  '/api/v1/public/miniprogram/carousels',
  '/api/v1/public/miniprogram/home-config',
  '/api/v1/public/miniprogram/shop-config',
  '/api/v1/public/products',
  '/api/v1/public/miniprogram/faq',
];

async function makeRequest(url, label, timeout = 15000) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'LoadTest/1.0' },
    });
    const elapsed = performance.now() - start;
    clearTimeout(timer);
    let bodySize = 0;
    try { const text = await res.text(); bodySize = Buffer.byteLength(text, 'utf-8'); } catch {}
    return { label, url, status: res.status, ok: res.ok, elapsed: Math.round(elapsed * 100) / 100, bodySize, error: null };
  } catch (err) {
    const elapsed = performance.now() - start;
    clearTimeout(timer);
    return { label, url, status: 0, ok: false, elapsed: Math.round(elapsed * 100) / 100, bodySize: 0, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message };
  }
}

async function concurrentRequests(url, label, count) {
  return Promise.all(Array.from({ length: count }, (_, i) => makeRequest(url, `${label}#${i + 1}`)));
}

function computeStats(results) {
  const times = results.map(r => r.elapsed);
  const successes = results.filter(r => r.ok);
  const failures = results.filter(r => !r.ok);
  const timeouts = results.filter(r => r.error === 'TIMEOUT');
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  return {
    total: results.length,
    successCount: successes.length,
    failCount: failures.length,
    timeoutCount: timeouts.length,
    successRate: ((successes.length / results.length) * 100).toFixed(1),
    min: Math.round(times[0] * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    p50: Math.round(times[Math.floor(times.length * 0.5)] * 100) / 100,
    p90: Math.round(times[Math.floor(times.length * 0.9)] * 100) / 100,
    p95: Math.round(times[Math.floor(times.length * 0.95)] * 100) / 100,
    p99: Math.round(times[Math.min(times.length - 1, Math.floor(times.length * 0.99))] * 100) / 100,
    max: Math.round(times[times.length - 1] * 100) / 100,
    errors: failures.map(f => ({ label: f.label, status: f.status, error: f.error })),
  };
}

function printStats(title, stats) {
  console.log(`\n  ┌─────────────────────────────────────────────────┐`);
  console.log(`  │  ${title.padEnd(47)}│`);
  console.log(`  ├─────────────────────────────────────────────────┤`);
  console.log(`  │  总请求:   ${String(stats.total).padEnd(35)}│`);
  console.log(`  │  成功:     ${String(stats.successCount).padEnd(35)}│`);
  console.log(`  │  失败:     ${String(stats.failCount).padEnd(35)}│`);
  console.log(`  │  超时:     ${String(stats.timeoutCount).padEnd(35)}│`);
  console.log(`  │  成功率:   ${(stats.successRate + '%').padEnd(35)}│`);
  console.log(`  ├─────────────────────────────────────────────────┤`);
  console.log(`  │  最小:     ${(stats.min + 'ms').padEnd(35)}│`);
  console.log(`  │  平均:     ${(stats.avg + 'ms').padEnd(35)}│`);
  console.log(`  │  P50:      ${(stats.p50 + 'ms').padEnd(35)}│`);
  console.log(`  │  P90:      ${(stats.p90 + 'ms').padEnd(35)}│`);
  console.log(`  │  P95:      ${(stats.p95 + 'ms').padEnd(35)}│`);
  console.log(`  │  P99:      ${(stats.p99 + 'ms').padEnd(35)}│`);
  console.log(`  │  最大:     ${(stats.max + 'ms').padEnd(35)}│`);
  console.log(`  └─────────────────────────────────────────────────┘`);
  if (stats.errors.length > 0) {
    console.log(`\n  ❌ 错误详情:`);
    stats.errors.forEach(e => console.log(`     - ${e.label}: status=${e.status}, error=${e.error}`));
  }
}

async function testSingleEndpointConcurrency() {
  console.log('\n' + '='.repeat(65));
  console.log(`📋 场景1: 逐个公开端点 × ${CONCURRENCY} 并发`);
  console.log('='.repeat(65));
  const allStats = [];
  for (const ep of PUBLIC_ENDPOINTS) {
    const url = `${BASE_URL}${ep.path}`;
    process.stdout.write(`  ⏳ ${ep.name} (${ep.path}) ... `);
    const results = await concurrentRequests(url, ep.name, CONCURRENCY);
    const stats = computeStats(results);
    allStats.push({ name: ep.name, path: ep.path, ...stats });
    const icon = parseFloat(stats.successRate) === 100 ? '✅' : '⚠️';
    console.log(`${icon} 成功率=${stats.successRate}% 平均=${stats.avg}ms P95=${stats.p95}ms 最大=${stats.max}ms`);
  }
  console.log('\n' + '-'.repeat(65));
  const slow = allStats.filter(s => s.avg > 2000);
  const failed = allStats.filter(s => parseFloat(s.successRate) < 100);
  console.log(`  🐢 慢端点 (>2s): ${slow.length === 0 ? '无' : ''}`);
  slow.forEach(s => console.log(`     - ${s.name}: 平均=${s.avg}ms`));
  console.log(`  ❌ 失败端点: ${failed.length === 0 ? '无' : ''}`);
  failed.forEach(s => console.log(`     - ${s.name}: 成功率=${s.successRate}%`));
  return allStats;
}

async function testHomepageScenario() {
  console.log('\n' + '='.repeat(65));
  console.log(`📋 场景2: 首页加载模拟 × ${CONCURRENCY} 并发用户`);
  console.log('='.repeat(65));
  const userSessions = await Promise.all(
    Array.from({ length: CONCURRENCY }, async (_, userId) => {
      const start = performance.now();
      const results = await Promise.all(
        HOMEPAGE_ENDPOINTS.map(path => makeRequest(`${BASE_URL}${path}`, `U${userId + 1}:${path}`))
      );
      return { userId: userId + 1, totalTime: Math.round((performance.now() - start) * 100) / 100, results, allOk: results.every(r => r.ok) };
    })
  );
  const totalTimes = userSessions.map(u => u.totalTime).sort((a, b) => a - b);
  const failedUsers = userSessions.filter(u => !u.allOk);
  const avgTime = totalTimes.reduce((s, t) => s + t, 0) / totalTimes.length;
  console.log('\n  用户加载时间:');
  userSessions.forEach(u => console.log(`    ${u.allOk ? '✅' : '❌'} 用户#${u.userId}: ${u.totalTime}ms`));
  console.log('\n  ┌─────────────────────────────────────────────────┐');
  console.log('  │            首页加载场景统计                      │');
  console.log('  ├─────────────────────────────────────────────────┤');
  console.log(`  │  并发用户:   ${String(CONCURRENCY).padEnd(35)}│`);
  console.log(`  │  每用户请求: ${String(HOMEPAGE_ENDPOINTS.length).padEnd(35)}│`);
  console.log(`  │  总请求:     ${String(CONCURRENCY * HOMEPAGE_ENDPOINTS.length).padEnd(35)}│`);
  console.log(`  │  失败用户:   ${String(failedUsers.length).padEnd(35)}│`);
  console.log(`  │  最快:       ${(totalTimes[0] + 'ms').padEnd(35)}│`);
  console.log(`  │  平均:       ${(Math.round(avgTime * 100) / 100 + 'ms').padEnd(35)}│`);
  console.log(`  │  最慢:       ${(totalTimes[totalTimes.length - 1] + 'ms').padEnd(35)}│`);
  console.log(`  │  P95:        ${(totalTimes[Math.floor(totalTimes.length * 0.95)] + 'ms').padEnd(35)}│`);
  console.log('  └─────────────────────────────────────────────────┘');
  if (failedUsers.length > 0) {
    console.log('\n  ❌ 失败用户详情:');
    failedUsers.forEach(u => u.results.filter(r => !r.ok).forEach(f =>
      console.log(`     用户#${u.userId} - ${f.label}: status=${f.status}, error=${f.error}`)
    ));
  }
  return { userSessions, totalTimes };
}

async function testSustainedPressure() {
  console.log('\n' + '='.repeat(65));
  console.log(`📋 场景3: 持续压力 - 3 轮 × ${CONCURRENCY} 并发`);
  console.log('='.repeat(65));
  const testUrl = `${BASE_URL}/api/v1/public/config`;
  const roundStats = [];
  for (let round = 1; round <= 3; round++) {
    process.stdout.write(`  ⏳ 第 ${round}/3 轮 ... `);
    const results = await concurrentRequests(testUrl, `R${round}`, CONCURRENCY);
    const stats = computeStats(results);
    roundStats.push(stats);
    const icon = parseFloat(stats.successRate) === 100 ? '✅' : '⚠️';
    console.log(`${icon} 平均=${stats.avg}ms P95=${stats.p95}ms 最大=${stats.max}ms`);
    if (round < 3) await new Promise(r => setTimeout(r, 500));
  }
  const firstAvg = roundStats[0].avg;
  const lastAvg = roundStats[2].avg;
  const degradation = ((lastAvg - firstAvg) / firstAvg) * 100;
  console.log('\n  📈 性能衰减:');
  console.log(`     第1轮: ${firstAvg}ms → 第3轮: ${lastAvg}ms (${degradation > 0 ? '+' : ''}${degradation.toFixed(1)}%)`);
  if (degradation > 50) console.log('     ⚠️  显著衰减 (>50%)，可能存在连接泄漏或资源竞争');
  else if (degradation > 20) console.log('     ⚠️  轻度衰减 (>20%)');
  else console.log('     ✅ 性能稳定');
  return roundStats;
}

async function testBurstAllEndpoints() {
  console.log('\n' + '='.repeat(65));
  console.log(`📋 场景4: 瞬时高并发 - 全部端点 × ${CONCURRENCY}`);
  console.log('='.repeat(65));
  const totalRequests = PUBLIC_ENDPOINTS.length * CONCURRENCY;
  process.stdout.write(`  ⏳ ${totalRequests} 个请求 ... `);
  const start = performance.now();
  const results = await Promise.all(
    PUBLIC_ENDPOINTS.flatMap(ep =>
      Array.from({ length: CONCURRENCY }, (_, i) => makeRequest(`${BASE_URL}${ep.path}`, `${ep.name}#${i + 1}`))
    )
  );
  const totalElapsed = performance.now() - start;
  const stats = computeStats(results);
  console.log(`完成 (总耗时: ${Math.round(totalElapsed)}ms)`);
  printStats(`${totalRequests} 个请求`, stats);
  console.log('\n  📊 各端点:');
  for (const ep of PUBLIC_ENDPOINTS) {
    const epR = results.filter(r => r.label.startsWith(ep.name));
    if (!epR.length) continue;
    const epAvg = Math.round((epR.reduce((s, r) => s + r.elapsed, 0) / epR.length) * 100) / 100;
    const epMax = Math.round(Math.max(...epR.map(r => r.elapsed)) * 100) / 100;
    const epFail = epR.filter(r => !r.ok).length;
    console.log(`    ${epFail === 0 ? '✅' : '❌'} ${ep.name.padEnd(10)} 平均=${String(epAvg + 'ms').padEnd(10)} 最大=${String(epMax + 'ms').padEnd(10)} 失败=${epFail}`);
  }
  return stats;
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║       🔥 并发负载测试 - www.shuoboda.cn                 ║');
  console.log('╠═════════════════════════════════════════════════════════╣');
  console.log(`║  目标: ${BASE_URL.padEnd(47)}║`);
  console.log(`║  并发: ${String(CONCURRENCY).padEnd(47)}║`);
  console.log(`║  时间: ${new Date().toISOString().padEnd(47)}║`);
  console.log('╚═════════════════════════════════════════════════════════╝');

  console.log('\n🔄 预热: 检测连通性 ...');
  const warmup = await makeRequest(`${BASE_URL}/api/v1/admin/ping`, 'warmup');
  if (warmup.error === 'TIMEOUT') { console.log('❌ 无法连接'); process.exit(1); }
  console.log(`   ${warmup.ok ? '✅' : '⚠️'} 连通 (status=${warmup.status}, ${warmup.elapsed}ms)`);

  try {
    await testSingleEndpointConcurrency();
    await testHomepageScenario();
    await testSustainedPressure();
    await testBurstAllEndpoints();
    console.log('\n' + '='.repeat(65));
    console.log('🏁 全部测试完成');
    console.log('='.repeat(65));
  } catch (err) {
    console.error('\n💥 错误:', err.message);
    process.exit(1);
  }
}

main();
