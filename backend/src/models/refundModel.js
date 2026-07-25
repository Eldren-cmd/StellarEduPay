'use strict';

const mongoose = require('mongoose');
const tenantScope = require('../plugins/tenantScope');

const refundSchema = new mongoose.Schema(
  {
    schoolId:       { type: String, required: true, index: true },
    originalTxHash: { type: String, required: true, index: true },
    studentId:      { type: String, required: true, index: true },

    refundTxHash:   { type: String, default: null, unique: true, sparse: true, index: true },
    amount:         { type: Number, required: true },

    status: {
      type: String,
      enum: ['approval_pending', 'pending', 'submitted', 'confirmed', 'failed'],
      default: 'approval_pending',
      index: true,
    },

    reason:         { type: String, required: true, trim: true, maxlength: 1000 },
    initiatedBy:    { type: String, required: true },
    approvedBy:     { type: String, default: null },

    confirmedAt:    { type: Date, default: null },
    approvedAt:     { type: Date, default: null },
    failedAt:       { type: Date, default: null },
    failureReason:  { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

refundSchema.index({ schoolId: 1, originalTxHash: 1 });
refundSchema.index({ schoolId: 1, studentId: 1 });
refundSchema.index({ schoolId: 1, status: 1 });
refundSchema.index({ schoolId: 1, createdAt: -1 });

refundSchema.plugin(tenantScope, { modelName: 'Refund' });

module.exports = mongoose.model('Refund', refundSchema);
