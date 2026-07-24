#!/usr/bin/env node

/**
 * Migration Numbering Validation Script
 *
 * Ensures all migration files have unique, strictly increasing numeric prefixes.
 * Prevents the issues described in #1037 where duplicate migration numbers
 * created ambiguous execution ordering.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../backend/migrations');

function validateMigrations() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js'));

  const migrations = {};
  const issues = [];

  for (const file of files) {
    // Match files like 001_name.js or unnumbered files
    const match = file.match(/^(\d{3})_(.+)\.js$/);

    if (!match) {
      // Unnumbered files should not exist (unless legacy allowed)
      if (!file.match(/^\d{3}_/)) {
        issues.push(`❌ Unnumbered migration file found: ${file}`);
      }
      continue;
    }

    const [, number, name] = match;

    // Check for duplicate numbers
    if (migrations[number]) {
      issues.push(
        `❌ Duplicate migration number ${number}:\n` +
        `   - ${migrations[number]}\n` +
        `   - ${file}`
      );
    } else {
      migrations[number] = file;
    }
  }

  // Check that numbers are sequential (no gaps)
  const numbers = Object.keys(migrations)
    .map(n => parseInt(n, 10))
    .sort((a, b) => a - b);

  if (numbers.length > 0) {
    const firstNum = numbers[0];
    const lastNum = numbers[numbers.length - 1];

    // Check for gaps
    for (let i = firstNum; i <= lastNum; i++) {
      const padded = String(i).padStart(3, '0');
      if (!migrations[padded]) {
        issues.push(`⚠️  Gap detected: Migration ${padded} is missing`);
      }
    }
  }

  if (issues.length > 0) {
    console.error('❌ Migration validation failed!\n');
    issues.forEach(issue => console.error(issue));
    console.error('\n✅ Migration validation rules:');
    console.error('  • All migration files must be named: NNN_description.js (NNN = 3 digits)');
    console.error('  • Migration numbers must be unique');
    console.error('  • Migration numbers should be sequential (001, 002, 003, ...)');
    process.exit(1);
  }

  console.log(`✅ Migration validation passed! (${numbers.length} migrations found)`);
  console.log('   Migrations are properly numbered and sequenced.');
  process.exit(0);
}

validateMigrations();
