const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePricing } = require('../src/pricing');

const cases = [
  { totalAmount: 650000, discountAmount: 0, finalAmount: 650000 },
  { totalAmount: 999999, discountAmount: 0, finalAmount: 999999 },
  { totalAmount: 1000000, discountAmount: 100000, finalAmount: 900000 },
  { totalAmount: 1300000, discountAmount: 130000, finalAmount: 1170000 },
  { totalAmount: 2000000, discountAmount: 200000, finalAmount: 1800000 },
  { totalAmount: 2250000, discountAmount: 200000, finalAmount: 2050000 },
];

for (const expected of cases) {
  test(`Tính giá cho tổng tiền ${expected.totalAmount} VND`, () => {
    assert.deepEqual(calculatePricing(expected.totalAmount), expected);
  });
}
