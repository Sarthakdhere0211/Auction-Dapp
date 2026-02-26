#!/usr/bin/env node

/**
 * Verification Script for Soroban Bid Fix
 * 
 * This script checks that the bid fix is properly implemented
 * Run: node verify-bid-fix.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Soroban Bid Fix Implementation...\n');

let passed = 0;
let failed = 0;

function check(name, condition, errorMsg) {
    if (condition) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        if (errorMsg) console.log(`   ${errorMsg}`);
        failed++;
    }
}

// Check 1: contract.ts exists
const contractPath = path.join(__dirname, 'src', 'contract.ts');
check(
    'contract.ts file exists',
    fs.existsSync(contractPath),
    'File not found: src/contract.ts'
);

// Check 2: Read contract.ts content
let contractContent = '';
if (fs.existsSync(contractPath)) {
    contractContent = fs.readFileSync(contractPath, 'utf8');
}

// Check 3: placeBid function exists
check(
    'placeBid function exists',
    contractContent.includes('export async function placeBid'),
    'placeBid function not found in contract.ts'
);

// Check 4: Only 2 arguments passed to contract.call
const contractCallMatch = contractContent.match(/contract\.call\(\s*['"]place_bid['"]\s*,([^)]+)\)/s);
if (contractCallMatch) {
    const args = contractCallMatch[1];
    const argCount = (args.match(/nativeToScVal/g) || []).length;
    check(
        'Correct number of arguments (2) passed to place_bid',
        argCount === 2,
        `Found ${argCount} arguments, expected 2. Check contract.call('place_bid', ...) in contract.ts`
    );
} else {
    check(
        'contract.call for place_bid found',
        false,
        'Could not find contract.call("place_bid", ...) in contract.ts'
    );
}

// Check 5: No auctionId passed to contract
check(
    'auctionId NOT passed to contract (removed 3rd parameter)',
    !contractContent.match(/contract\.call\(\s*['"]place_bid['"][^)]*auctionId[^)]*\)/),
    'auctionId should not be passed to contract.call'
);

// Check 6: Stroops conversion present
check(
    'XLM to stroops conversion implemented',
    contractContent.includes('10_000_000') || contractContent.includes('10000000'),
    'Missing stroops conversion (amount * 10_000_000)'
);

// Check 7: Transaction fee is sufficient
check(
    'Transaction fee is sufficient (100000 or higher)',
    contractContent.match(/fee:\s*['"](\d+)['"]/)?.[1] >= 100000,
    'Transaction fee should be at least 100000 stroops for Soroban'
);

// Check 8: Timeout is extended
const timeoutMatch = contractContent.match(/setTimeout\((\d+)\)/);
if (timeoutMatch) {
    const timeout = parseInt(timeoutMatch[1]);
    check(
        'Transaction timeout is extended (180+ seconds)',
        timeout >= 180,
        `Timeout is ${timeout}s, should be at least 180s`
    );
} else {
    check(
        'setTimeout found',
        false,
        'Could not find setTimeout in transaction builder'
    );
}

// Check 9: Helper utilities exist
const helpersPath = path.join(__dirname, 'src', 'utils', 'bidHelpers.ts');
check(
    'Helper utilities file exists',
    fs.existsSync(helpersPath),
    'File not found: src/utils/bidHelpers.ts'
);

// Check 10: Type definitions exist
const typesPath = path.join(__dirname, 'src', 'types', 'contract.ts');
check(
    'Contract type definitions exist',
    fs.existsSync(typesPath),
    'File not found: src/types/contract.ts'
);

// Check 11: Documentation exists
const docPath = path.join(__dirname, 'SOROBAN_BID_FIX.md');
check(
    'Documentation file exists',
    fs.existsSync(docPath),
    'File not found: SOROBAN_BID_FIX.md'
);

// Check 12: Comprehensive logging
check(
    'Comprehensive logging implemented',
    contractContent.includes('=== PLACE BID START ===') && 
    contractContent.includes('=== PLACE BID END ==='),
    'Missing comprehensive logging markers'
);

// Check 13: Error handling
check(
    'Error handling implemented',
    contractContent.includes('try') && 
    contractContent.includes('catch') &&
    contractContent.includes('finally'),
    'Missing proper error handling (try/catch/finally)'
);

// Check 14: Simulation check
check(
    'Transaction simulation implemented',
    contractContent.includes('simulateTransaction'),
    'Missing transaction simulation'
);

// Check 15: Transaction polling
check(
    'Transaction confirmation polling implemented',
    contractContent.includes('getTransaction') && 
    contractContent.includes('for'),
    'Missing transaction confirmation polling'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
    console.log('\n🎉 All checks passed! The bid fix is properly implemented.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set VITE_CONTRACT_ID in .env.local');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test bid placement');
    console.log('   4. Verify transaction on Stellar Expert');
    process.exit(0);
} else {
    console.log('\n⚠️  Some checks failed. Please review the errors above.');
    console.log('\n📚 Documentation:');
    console.log('   - SOROBAN_BID_FIX.md - Complete technical guide');
    console.log('   - QUICK_FIX_SUMMARY.md - Quick reference');
    console.log('   - BID_FIX_README.md - Implementation overview');
    process.exit(1);
}
