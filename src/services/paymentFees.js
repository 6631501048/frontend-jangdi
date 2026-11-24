const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const defaultPaymentTerms = {
  feePercent: 7,
  serviceOrderFeePercent: 7,
  serviceOrderFixedFeeAmount: 0,
  mockStripeFeePercent: 3.65,
  mockStripeFixedFeeAmount: 10,
};

// Every job type uses the same flat platform charge; gateway costs come out of it.
export function calculatePaymentFees(amount, terms = {}) {
  const config = { ...defaultPaymentTerms, ...terms };
  const baseAmount = Math.max(0, Number(amount) || 0);
  const appRate = Number(config.feePercent) / 100;
  const appFixed = 0;
  const gatewayRate = Number(config.mockStripeFeePercent) / 100;
  const gatewayFixed = Number(config.mockStripeFixedFeeAmount);
  const appFee = baseAmount * appRate + appFixed;
  const combinedFee = appFee;
  const platformFeeAmount = roundMoney(combinedFee);
  const gatewayFeeAmount = roundMoney((baseAmount + platformFeeAmount) * gatewayRate + gatewayFixed);

  return {
    appFeeAmount: roundMoney(appFee),
    gatewayFeeAmount,
    platformFeeAmount,
    totalDue: roundMoney(baseAmount + platformFeeAmount),
  };
}
