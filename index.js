import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// KENO GAME CONSTANTS
// ============================================================
const TOTAL_NUMBERS = 80;   // Numbers in the pool (1-80)
const NUMBERS_DRAWN = 20;   // House draws 20 numbers
const NUMBERS_NOT_DRAWN = TOTAL_NUMBERS - NUMBERS_DRAWN; // 60

// ============================================================
// MATH UTILITIES
// ============================================================

/**
 * Calculate factorial using BigInt for precision with large numbers
 */
function factorial(n) {
  if (n <= 1n) return 1n;
  let result = 1n;
  for (let i = 2n; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate binomial coefficient C(n, k) = n! / (k! * (n-k)!)
 * Uses BigInt for precision, returns as Number
 */
function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // Optimize by using smaller k
  if (k > n - k) {
    k = n - k;
  }
  
  const nBig = BigInt(n);
  const kBig = BigInt(k);
  
  // Calculate C(n,k) = n! / (k! * (n-k)!)
  // More efficient: multiply n*(n-1)*...*(n-k+1) / k!
  let numerator = 1n;
  for (let i = 0n; i < kBig; i++) {
    numerator *= (nBig - i);
  }
  
  const denominator = factorial(kBig);
  return Number(numerator / denominator);
}

/**
 * Calculate probability of getting exactly k hits when picking n numbers
 * Uses hypergeometric distribution:
 * P(X = k) = C(20, k) * C(60, n-k) / C(80, n)
 * 
 * Where:
 * - 20 = numbers drawn by house (winning numbers)
 * - 60 = numbers NOT drawn (non-winning numbers)
 * - 80 = total numbers in pool
 * - n = numbers picked by player
 * - k = number of hits (matches)
 */
function calculateProbability(picks, hits) {
  if (hits > picks || hits > NUMBERS_DRAWN || (picks - hits) > NUMBERS_NOT_DRAWN) {
    return 0;
  }
  
  // C(20, hits) - ways to choose 'hits' from the 20 winning numbers
  const waysToHit = binomial(NUMBERS_DRAWN, hits);
  
  // C(60, picks - hits) - ways to choose remaining picks from non-winning numbers
  const waysToMiss = binomial(NUMBERS_NOT_DRAWN, picks - hits);
  
  // C(80, picks) - total ways to choose 'picks' numbers from 80
  const totalWays = binomial(TOTAL_NUMBERS, picks);
  
  return (waysToHit * waysToMiss) / totalWays;
}

/**
 * Convert probability to "1 in X" odds format
 */
function probabilityToOdds(probability) {
  if (probability === 0) return 'impossible';
  if (probability === 1) return '1 in 1';
  return `1 in ${(1 / probability).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

// ============================================================
// CSV PARSING
// ============================================================

function parsePayoutsCsv(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  // Parse header row to get hit columns
  const header = lines[0].split(',');
  
  // Build payouts object: payouts[picks][hits] = multiplier
  const payouts = {};
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (!row[0]) continue; // Skip empty rows
    
    const picks = parseInt(row[0], 10);
    if (isNaN(picks)) continue;
    
    payouts[picks] = {};
    
    // Columns 1-11 correspond to hits 0-10
    for (let hitCol = 1; hitCol <= 11; hitCol++) {
      const hits = hitCol - 1;
      const value = row[hitCol];
      
      if (value && value.trim() !== '') {
        payouts[picks][hits] = parseFloat(value);
      }
    }
  }
  
  return payouts;
}

// ============================================================
// MAIN ANALYSIS
// ============================================================

function analyzeKeno(payouts) {
  console.log('═'.repeat(80));
  console.log('                        KENO ODDS & PAYOUT ANALYSIS');
  console.log('═'.repeat(80));
  console.log(`\nGame Rules: ${TOTAL_NUMBERS} numbers in pool, ${NUMBERS_DRAWN} drawn at random`);
  console.log('Players can pick between 1 and 10 numbers\n');
  
  for (let picks = 1; picks <= 10; picks++) {
    console.log('─'.repeat(80));
    console.log(`\n  PICK ${picks} ${picks === 1 ? 'NUMBER' : 'NUMBERS'}`);
    console.log('─'.repeat(80));
    
    let totalExpectedValue = 0;
    let hasAnyPayout = false;
    
    // Table header
    console.log('\n  Hits │ Probability        │ Odds              │ Payout │ EV Contribution');
    console.log('  ─────┼────────────────────┼───────────────────┼────────┼─────────────────');
    
    for (let hits = 0; hits <= picks; hits++) {
      const probability = calculateProbability(picks, hits);
      const probabilityPercent = (probability * 100).toFixed(6);
      const odds = probabilityToOdds(probability);
      
      const payout = payouts[picks]?.[hits] || 0;
      const evContribution = probability * payout;
      totalExpectedValue += evContribution;
      
      if (payout > 0) hasAnyPayout = true;
      
      const payoutStr = payout > 0 ? `${payout}x` : '-';
      const evStr = payout > 0 ? evContribution.toFixed(6) : '-';
      
      console.log(
        `  ${String(hits).padStart(4)} │ ` +
        `${probabilityPercent.padStart(10)}% │ ` +
        `${odds.padEnd(17)} │ ` +
        `${payoutStr.padStart(6)} │ ` +
        `${evStr.padStart(10)}`
      );
    }
    
    // Summary for this pick level
    const houseEdge = (1 - totalExpectedValue) * 100;
    const rtp = totalExpectedValue * 100;
    
    console.log('  ─────┴────────────────────┴───────────────────┴────────┴─────────────────');
    console.log(`\n  📊 Expected Value: ${totalExpectedValue.toFixed(6)} per $1 bet`);
    console.log(`  🏠 House Edge: ${houseEdge.toFixed(2)}%`);
    console.log(`  💰 Return to Player (RTP): ${rtp.toFixed(2)}%\n`);
  }
  
  // Overall summary
  console.log('═'.repeat(80));
  console.log('                              SUMMARY BY PICKS');
  console.log('═'.repeat(80));
  console.log('\n  Picks │ Expected Value │ House Edge │ RTP     │ Max Payout │ Best Odds to Win');
  console.log('  ──────┼────────────────┼────────────┼─────────┼────────────┼──────────────────');
  
  for (let picks = 1; picks <= 10; picks++) {
    let totalEV = 0;
    let maxPayout = 0;
    let bestWinOdds = 0;
    
    for (let hits = 0; hits <= picks; hits++) {
      const prob = calculateProbability(picks, hits);
      const payout = payouts[picks]?.[hits] || 0;
      totalEV += prob * payout;
      
      if (payout > maxPayout) maxPayout = payout;
      if (payout > 0) bestWinOdds += prob;
    }
    
    const houseEdge = (1 - totalEV) * 100;
    const rtp = totalEV * 100;
    const winOddsStr = `1 in ${(1 / bestWinOdds).toFixed(2)}`;
    
    console.log(
      `  ${String(picks).padStart(5)} │ ` +
      `${totalEV.toFixed(6).padStart(14)} │ ` +
      `${houseEdge.toFixed(2).padStart(9)}% │ ` +
      `${rtp.toFixed(2).padStart(6)}% │ ` +
      `${(maxPayout + 'x').padStart(10)} │ ` +
      `${winOddsStr}`
    );
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('  Note: EV = Expected Value (how much you get back per $1 wagered on average)');
  console.log('  House Edge = How much the house keeps on average');
  console.log('  RTP = Return to Player percentage');
  console.log('═'.repeat(80) + '\n');
}

// ============================================================
// RUN
// ============================================================

const payoutsCsvPath = join(__dirname, 'payouts', 'payouts_original.csv');
console.log(`\nReading payouts from: ${payoutsCsvPath}\n`);

const payouts = parsePayoutsCsv(payoutsCsvPath);
analyzeKeno(payouts);

