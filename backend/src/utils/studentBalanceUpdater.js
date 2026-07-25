'use strict';

/**
 * Shared utility for updating student balance fields after a successful payment.
 *
 * Used by verifyPayment, submitTransaction, and syncPaymentsForSchool to ensure
 * consistent balance computation across all payment recording paths.
 * Issue #1034: Consolidates three divergent implementations into one.
 */

const Student = require('../models/studentModel');
const Payment = require('../models/paymentModel');

/**
 * Update a student's balance fields (totalPaid, remainingBalance, feePaid) after
 * a successful payment is recorded.
 *
 * @param {string} schoolId - School ID
 * @param {string} studentId - Student ID
 * @param {Object} options - Optional configuration
 * @param {Object} options.session - Mongoose session for transaction (if applicable)
 * @param {boolean} options.includeFeeCategoryBreakdown - Whether to update individual fee categories
 * @returns {Promise<Object>} - Updated student object or null if not found
 */
async function updateStudentBalance(schoolId, studentId, options = {}) {
  const { session = null, includeFeeCategoryBreakdown = true } = options;

  // Fetch the current student record
  const student = await Student.findOne({ schoolId, studentId }).session(session);
  if (!student) {
    return null;
  }

  // Aggregate all successful, non-suspicious payments for this student
  const paymentAgg = await Payment.aggregate([
    {
      $match: {
        schoolId,
        studentId,
        deletedAt: null,
        status: 'SUCCESS',
        isSuspicious: false,
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]).session(session);

  const cumulativeTotal = paymentAgg.length ? paymentAgg[0].total : 0;
  const cumulativeNormalized = parseFloat(cumulativeTotal.toFixed(7));

  // Compute top-level student balance
  const updateData = {
    totalPaid: cumulativeNormalized,
    remainingBalance: parseFloat(Math.max(0, student.feeAmount - cumulativeNormalized).toFixed(7)),
    feePaid: cumulativeNormalized >= student.feeAmount,
  };

  // If student has per-category fees, update those balances too
  if (includeFeeCategoryBreakdown && student.fees && student.fees.length > 0) {
    const feesUpdated = [...student.fees];

    for (let i = 0; i < feesUpdated.length; i++) {
      const category = feesUpdated[i].category;

      const categoryPayments = await Payment.aggregate([
        {
          $match: {
            schoolId,
            studentId,
            feeCategory: category,
            deletedAt: null,
            status: 'SUCCESS',
            isSuspicious: false,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).session(session);

      const categoryTotalPaid = categoryPayments.length
        ? parseFloat(categoryPayments[0].total.toFixed(7))
        : 0;

      feesUpdated[i].totalPaid = categoryTotalPaid;
      feesUpdated[i].remainingBalance = Math.max(0, feesUpdated[i].amount - categoryTotalPaid);
      feesUpdated[i].paid = categoryTotalPaid >= feesUpdated[i].amount;
    }

    updateData.fees = feesUpdated;
  }

  // Persist the update
  const updatedStudent = await Student.findOneAndUpdate(
    { schoolId, studentId },
    updateData,
    { new: true, session }
  );

  return updatedStudent;
}

module.exports = {
  updateStudentBalance,
};
