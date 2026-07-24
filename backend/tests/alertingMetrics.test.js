'use strict';

/**
 * Covers the metrics added to close the payment-processing alerting gap:
 * MongoDB connection health and the concurrent payment processor's queue
 * depth / backpressure thresholds. Alert rules in monitoring/alerts/ read
 * these directly, so a silent regression here means those alerts go blind.
 */

const mongoose = require('mongoose');

const {
  mongoConnectionState,
  mongoConnectionErrorsTotal,
  paymentProcessorQueueDepth,
  paymentProcessorQueueHighWater,
  paymentProcessorQueueMaxDepth,
} = require('../src/metrics');

async function gaugeValue(gauge) {
  const result = await gauge.get();
  return result.values[0] ? result.values[0].value : undefined;
}

beforeEach(() => {
  mongoConnectionErrorsTotal.reset();
});

describe('mongodb_connection_state', () => {
  test('reflects the live mongoose readyState', async () => {
    mongoose.connection.readyState = 1;
    expect(await gaugeValue(mongoConnectionState)).toBe(1);

    mongoose.connection.readyState = 0;
    expect(await gaugeValue(mongoConnectionState)).toBe(0);
  });
});

describe('mongodb_connection_errors_total', () => {
  test('increments when the driver emits an error event', async () => {
    const database = require('../src/config/database');
    database.setupConnectionEventHandlers();
    mongoose.connection.emit('error', new Error('simulated connection error'));
    expect(await gaugeValue(mongoConnectionErrorsTotal)).toBe(1);
  });
});

describe('payment_processor_queue_depth', () => {
  test('reflects concurrentPaymentProcessor.getStats().queueDepth', async () => {
    const { concurrentPaymentProcessor } = require('../src/services/concurrentPaymentProcessor');
    const original = concurrentPaymentProcessor.activeCount;
    concurrentPaymentProcessor.activeCount = 42;
    try {
      expect(await gaugeValue(paymentProcessorQueueDepth)).toBe(42);
    } finally {
      concurrentPaymentProcessor.activeCount = original;
    }
  });
});

describe('payment_processor_queue_backpressure_high_water / _max_depth', () => {
  test('mirror the configured thresholds so alerts stay correct across env overrides', async () => {
    const config = require('../src/config');
    expect(await gaugeValue(paymentProcessorQueueHighWater)).toBe(config.QUEUE_BACKPRESSURE_HIGH_WATER);
    expect(await gaugeValue(paymentProcessorQueueMaxDepth)).toBe(config.MAX_QUEUE_DEPTH);
  });
});
