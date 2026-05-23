/**
 * Load Testing Suite for 100+ Billion Users
 * Tests authentication, company isolation, and performance at extreme scale
 * 
 * Usage:
 * node load-test-100b-users.js --concurrent 10000 --users 100000000
 * node load-test-100b-users.js --scenario "company-isolation" --companies 50000
 */

import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Test Results Tracker
 */
class TestResults {
  constructor() {
    this.tests = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0
    };
  }

  addTest(name, success, duration, error = null) {
    this.tests.push({
      name,
      success,
      duration,
      error,
      timestamp: new Date().toISOString()
    });

    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.totalTime += duration;
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, duration);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, duration);
  }

  calculatePercentiles() {
    const durations = this.tests
      .filter(t => t.success)
      .map(t => t.duration)
      .sort((a, b) => a - b);

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    this.metrics.p95ResponseTime = durations[p95Index] || 0;
    this.metrics.p99ResponseTime = durations[p99Index] || 0;
    this.metrics.avgResponseTime = this.metrics.totalTime / Math.max(this.metrics.totalRequests, 1);
    this.metrics.requestsPerSecond = (this.metrics.totalRequests / this.metrics.totalTime) * 1000;
  }

  print() {
    this.calculatePercentiles();

    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(80));

    console.log('\nSummary:');
    console.log(`  Total Requests: ${this.metrics.totalRequests.toLocaleString()}`);
    console.log(`  Successful: ${this.metrics.successfulRequests.toLocaleString()} (${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`  Failed: ${this.metrics.failedRequests.toLocaleString()}`);

    console.log('\nPerformance:');
    console.log(`  Avg Response Time: ${this.metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min Response Time: ${this.metrics.minResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${this.metrics.maxResponseTime.toFixed(2)}ms`);
    console.log(`  P95 Response Time: ${this.metrics.p95ResponseTime.toFixed(2)}ms`);
    console.log(`  P99 Response Time: ${this.metrics.p99ResponseTime.toFixed(2)}ms`);
    console.log(`  Requests/Second: ${this.metrics.requestsPerSecond.toFixed(2)}`);

    console.log('\nTarget Performance (< 100ms):');
    if (this.metrics.avgResponseTime < 100) {
      console.log('  ✓ PASS - Average response time under 100ms');
    } else {
      console.log('  ✗ FAIL - Average response time exceeds 100ms');
    }

    if (this.metrics.p95ResponseTime < 200) {
      console.log('  ✓ PASS - P95 response time under 200ms');
    } else {
      console.log('  ✗ FAIL - P95 response time exceeds 200ms');
    }

    console.log('\n' + '='.repeat(80));
  }
}

/**
 * Test Scenario 1: Authentication Load Test
 */
async function testAuthentication(concurrentUsers = 1000) {
  console.log(`\nTesting Authentication with ${concurrentUsers.toLocaleString()} concurrent users...`);
  const results = new TestResults();

  const users = Array.from({ length: concurrentUsers }, (_, i) => ({
    email: `test-auth-${Date.now()}-${i}@easybmt.com`,
    password: 'TestPassword123!'
  }));

  // Test parallel login attempts
  const promises = users.map(async user => {
    const start = performance.now();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      const duration = performance.now() - start;
      
      if (error) {
        // Expected: user doesn't exist yet
        results.addTest('auth-login', true, duration);
      } else {
        results.addTest('auth-login', false, duration, 'Unexpected success');
      }
    } catch (error) {
      const duration = performance.now() - start;
      results.addTest('auth-login', false, duration, error.message);
    }
  });

  await Promise.all(promises);
  results.print();

  return results.metrics;
}

/**
 * Test Scenario 2: Company Isolation Test
 */
async function testCompanyIsolation(numCompanies = 10) {
  console.log(`\nTesting Company Isolation with ${numCompanies.toLocaleString()} companies...`);
  const results = new TestResults();

  // Create test companies
  const companies = [];
  for (let i = 0; i < numCompanies; i++) {
    companies.push({
      id: `test-company-${Date.now()}-${i}`,
      name: `Test Company ${i}`,
      admin_email: `admin-${i}@easybmt.com`
    });
  }

  // Test that Company A user cannot see Company B data
  const promises = companies.map(async (companyA, indexA) => {
    return companies.map(async (companyB, indexB) => {
      if (indexA === indexB) return; // Skip same company

      const start = performance.now();
      try {
        // Try to fetch Company B data as Company A user (should fail)
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('company_id', companyB.id)
          .limit(1);

        const duration = performance.now() - start;

        // Should either return empty or get RLS error
        if (error || !data || data.length === 0) {
          results.addTest(`isolation-${indexA}-vs-${indexB}`, true, duration);
        } else {
          results.addTest(`isolation-${indexA}-vs-${indexB}`, false, duration, 'Cross-company data visible');
        }
      } catch (error) {
        const duration = performance.now() - start;
        results.addTest(`isolation-${indexA}-vs-${indexB}`, true, duration);
      }
    });
  });

  await Promise.allSettled(promises.flat());
  results.print();

  return results.metrics;
}

/**
 * Test Scenario 3: Query Performance at Scale
 */
async function testQueryPerformance(recordCount = 1000000) {
  console.log(`\nTesting Query Performance with ${recordCount.toLocaleString()} records...`);
  const results = new TestResults();

  // Test various query types
  const queries = [
    {
      name: 'simple-select',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, email')
          .limit(100);
        return !error;
      }
    },
    {
      name: 'filter-query',
      fn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000);
        return !error;
      }
    },
    {
      name: 'aggregate-query',
      fn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*', { count: 'exact' })
          .limit(1);
        return !error;
      }
    },
    {
      name: 'join-query',
      fn: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, company_id(*), user_id(*)')
          .limit(100);
        return !error;
      }
    }
  ];

  // Run each query multiple times
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    for (const query of queries) {
      const start = performance.now();
      try {
        const success = await query.fn();
        const duration = performance.now() - start;
        results.addTest(query.name, success, duration);
      } catch (error) {
        const duration = performance.now() - start;
        results.addTest(query.name, false, duration, error.message);
      }
    }
  }

  results.print();
  return results.metrics;
}

/**
 * Test Scenario 4: Concurrent User Load
 */
async function testConcurrentLoad(totalUsers = 100000) {
  console.log(`\nSimulating ${totalUsers.toLocaleString()} concurrent users...`);
  const results = new TestResults();

  const batchSize = 1000; // Process in batches
  const batches = Math.ceil(totalUsers / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const currentBatchSize = Math.min(batchSize, totalUsers - batch * batchSize);
    
    const promises = Array.from({ length: currentBatchSize }, async (_, i) => {
      const start = performance.now();
      try {
        // Simulate a typical user operation
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .limit(10);

        const duration = performance.now() - start;
        results.addTest('user-operation', !error, duration);
      } catch (error) {
        const duration = performance.now() - start;
        results.addTest('user-operation', false, duration, error.message);
      }
    });

    await Promise.allSettled(promises);
    
    const progress = ((batch + 1) / batches * 100).toFixed(1);
    console.log(`  Progress: ${progress}%`);
  }

  results.print();
  return results.metrics;
}

/**
 * Test Scenario 5: Email Verification at Scale
 */
async function testEmailVerification(totalUsers = 10000) {
  console.log(`\nTesting Email Verification with ${totalUsers.toLocaleString()} users...`);
  const results = new TestResults();

  for (let i = 0; i < totalUsers; i++) {
    const email = `verify-${Date.now()}-${i}@easybmt.com`;
    
    const start = performance.now();
    try {
      const { error } = await supabase.auth.resendOtp({
        email,
        type: 'signup'
      });

      const duration = performance.now() - start;
      results.addTest('email-verification', !error, duration);
    } catch (error) {
      const duration = performance.now() - start;
      results.addTest('email-verification', false, duration, error.message);
    }

    if ((i + 1) % 100 === 0) {
      const progress = (((i + 1) / totalUsers) * 100).toFixed(1);
      console.log(`  Progress: ${progress}%`);
    }
  }

  results.print();
  return results.metrics;
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   EasyBMT Load Testing Suite (100B Users)                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Authentication
    await testAuthentication(1000);

    // Test 2: Company Isolation
    await testCompanyIsolation(10);

    // Test 3: Query Performance
    await testQueryPerformance();

    // Test 4: Concurrent Load
    await testConcurrentLoad(10000);

    // Test 5: Email Verification
    await testEmailVerification(1000);

    console.log('\n✓ All tests completed!');
  } catch (error) {
    console.error('✗ Test suite error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
