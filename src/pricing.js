function calculatePricing(totalAmount) {
  const discountAmount = totalAmount >= 1000000
    ? Math.min(Math.round(totalAmount * 0.1), 200000)
    : 0;

  return {
    totalAmount,
    discountAmount,
    finalAmount: totalAmount - discountAmount,
  };
}

module.exports = { calculatePricing };
