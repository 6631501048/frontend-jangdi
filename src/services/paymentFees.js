const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const defaultPaymentTerms = {
  feePercent: 5,
  serviceOrderFeePercent: 10,
  serviceOrderFixedFeeAmount: 10,
  mockStripeFeePercent: 3.65,
  mockStripeFixedFeeAmount: 10,
};

// Hirer pays one combined platform line. The Stripe estimate is grossed up
// because Stripe charges its percentage on the full amount, including fees.
export function calculatePaymentFees(amount, terms = {}, { deliveryService = false } = {}) {
  const config = { ...defaultPaymentTerms, ...terms };
  const baseAmount = Math.max(0, Number(amount) || 0);
  const appRate = Number(deliveryService ? config.serviceOrderFeePercent : config.feePercent) / 100;
  const appFixed = deliveryService ? Number(config.serviceOrderFixedFeeAmount) : 0;
  const gatewayRate = Number(config.mockStripeFeePercent) / 100;
  const gatewayFixed = Number(config.mockStripeFixedFeeAmount);
  const appFee = baseAmount * appRate + appFixed;
  const combinedFee = gatewayRate < 1
    ? (appFee + baseAmount * gatewayRate + gatewayFixed) / (1 - gatewayRate)
    : appFee;
  const platformFeeAmount = roundMoney(combinedFee);
  const gatewayFeeAmount = roundMoney((baseAmount + platformFeeAmount) * gatewayRate + gatewayFixed);

  return {
    appFeeAmount: roundMoney(appFee),
    gatewayFeeAmount,
    platformFeeAmount,
    totalDue: roundMoney(baseAmount + platformFeeAmount),
  };
}
