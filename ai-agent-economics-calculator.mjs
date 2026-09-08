export function computeAgentEconomics(input) {
  const required = [
    'volume', 'executionsPerOutcome', 'modelCostPerExecution', 'toolCostPerExecution',
    'fixedMonthlyCost', 'retryRatePct', 'finalFailureRatePct', 'reviewMinutesPerOutcome',
    'reviewHourlyCost', 'businessValuePerSuccess', 'humanMinutesPerSuccess', 'humanHourlyCost'
  ];
  for (const key of required) {
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key}`);
  }
  if (Number(input.volume) <= 0) throw new Error('volume must be greater than zero');
  if (Number(input.executionsPerOutcome) <= 0) throw new Error('executionsPerOutcome must be greater than zero');
  if (Number(input.finalFailureRatePct) >= 100) throw new Error('finalFailureRatePct must be below 100');

  const volume = Number(input.volume);
  const executionsPerOutcome = Number(input.executionsPerOutcome);
  const retryRate = Number(input.retryRatePct) / 100;
  const failureRate = Number(input.finalFailureRatePct) / 100;
  const baseExecutions = volume * executionsPerOutcome;
  const totalExecutions = baseExecutions * (1 + retryRate);
  const successfulOutcomes = volume * (1 - failureRate);
  const variableCost = totalExecutions * (Number(input.modelCostPerExecution) + Number(input.toolCostPerExecution));
  const humanReviewCost = volume * (Number(input.reviewMinutesPerOutcome) / 60) * Number(input.reviewHourlyCost);
  const allInMonthlyCost = variableCost + Number(input.fixedMonthlyCost) + humanReviewCost;
  const costPerSuccessfulOutcome = allInMonthlyCost / successfulOutcomes;
  const grossBusinessValue = successfulOutcomes * Number(input.businessValuePerSuccess);
  const netMonthlyValue = grossBusinessValue - allInMonthlyCost;
  const humanOnlyEquivalentCost = successfulOutcomes * (Number(input.humanMinutesPerSuccess) / 60) * Number(input.humanHourlyCost);
  const aiVsHumanCostDelta = humanOnlyEquivalentCost - allInMonthlyCost;

  return {
    baseExecutions,
    totalExecutions,
    successfulOutcomes,
    variableCost,
    humanReviewCost,
    allInMonthlyCost,
    costPerSuccessfulOutcome,
    grossBusinessValue,
    netMonthlyValue,
    humanOnlyEquivalentCost,
    aiVsHumanCostDelta,
    successRatePct: (1 - failureRate) * 100,
    breakEvenBusinessValuePerSuccess: costPerSuccessfulOutcome
  };
}

export function compareAgentEconomics(current, comparison) {
  const delta = comparison.costPerSuccessfulOutcome - current.costPerSuccessfulOutcome;
  const absoluteDelta = Math.abs(delta);
  const relativeDeltaPct = current.costPerSuccessfulOutcome > 0
    ? (absoluteDelta / current.costPerSuccessfulOutcome) * 100
    : 0;
  return {
    lowerCostScenario: delta < 0 ? 'comparison' : 'current',
    absoluteCostPerSuccessDelta: absoluteDelta,
    relativeCostPerSuccessDeltaPct: relativeDeltaPct
  };
}
