'use strict';

/**
 * Tests for migrationRunner.runMigrations directory handling.
 *
 * The migrations directory is a required part of every deployment (it is copied
 * into the production image by backend/Dockerfile). A missing directory must
 * fail loudly rather than silently no-op, so a broken image/deploy cannot
 * silently skip every migration.
 */

const fs = require('fs');

jest.mock('../src/models/migrationModel', () => ({
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));

const { runMigrations } = require('../src/services/migrationRunner');

describe('runMigrations — missing migrations directory', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws (fails loudly) when the migrations directory does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    await expect(runMigrations()).rejects.toThrow(/Migrations directory not found/);
  });

  it('does not throw for a present-but-empty migrations directory', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

    await expect(runMigrations()).resolves.toBeUndefined();
  });
});
