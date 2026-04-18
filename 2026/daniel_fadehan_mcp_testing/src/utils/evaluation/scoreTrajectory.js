import { clamp, compareArgs } from './helpers.js';

function uniqueNames(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function makeExplanation({
  matchedCount,
  partialCount,
  requiredCount,
  supportCount,
  unexpectedCount,
  missingCount,
}) {
  if (matchedCount === 0 && partialCount === 0 && supportCount > 0) {
    return 'Only support steps ran.';
  }

  if (matchedCount === 0 && partialCount === 0) {
    return 'No required steps matched.';
  }

  if (missingCount > 0 && partialCount > 0) {
    return 'Required tool matched, but arguments diverged and some required steps were missed.';
  }

  if (partialCount > 0) {
    return 'Required tool matched, but arguments diverged.';
  }

  if (missingCount > 0) {
    return 'Expected downstream steps never happened.';
  }

  if (unexpectedCount > 0) {
    return 'Unexpected tools changed the execution path.';
  }

  return `${matchedCount} of ${requiredCount} required steps matched.`;
}

export function scoreTrajectory(scenario, actualToolCalls = []) {
  const expectedToolCalls = scenario?.expectedToolCalls || [];
  const actualCalls = actualToolCalls || [];
  const failOnUnexpectedTools = scenario?.passCriteria?.failOnUnexpectedTools ?? true;
  const allowedSupportTools = new Set(scenario?.allowedToolNames || []);
  const requiredSteps = expectedToolCalls.filter((step) => step.importance !== 'optional');

  if (scenario?.mode === 'negative') {
    const unexpected = actualCalls.map((call) => call.toolName);
    const score = unexpected.length === 0 ? 1 : 0;
    const explanation = unexpected.length === 0
      ? 'No tools were called, which matches this negative case.'
      : 'A tool was called during a negative case.';

    return {
      matched: [],
      partial: [],
      missing: [],
      support: [],
      unexpected,
      reordered: [],
      usedDistractorTools: uniqueNames(unexpected),
      score,
      coverageScore: score,
      argumentScore: score,
      orderScore: score,
      supportScore: score,
      explanation,
      passed: unexpected.length === 0,
      expectedStepStatuses: [],
      actualStepStatuses: actualCalls.map((call) => ({
        id: call.callId,
        toolName: call.toolName,
        status: 'unexpected',
        argsScore: 0,
        explanation: 'Negative cases should not call MCP tools.',
      })),
    };
  }

  const usedActualIndexes = new Set();
  const expectedStepStatuses = [];
  const actualStepStatuses = actualCalls.map((call) => ({
    id: call.callId,
    toolName: call.toolName,
    status: call.status === 'failed' ? 'failed' : 'unexpected',
    argsScore: 0,
    explanation: call.status === 'failed' ? 'Tool execution failed.' : 'This tool was not part of the expected path.',
  }));

  let lastActualIndex = -1;
  let matchedCount = 0;
  let partialCount = 0;
  let argsScoreTotal = 0;
  let matchedInOrderCount = 0;

  expectedToolCalls.forEach((step) => {
    const foundIndex = actualCalls.findIndex((call, index) => (
      !usedActualIndexes.has(index) && call.toolName === step.toolName
    ));
    const isOptional = step.importance === 'optional';

    if (foundIndex < 0) {
      expectedStepStatuses.push({
        id: step.id,
        toolName: step.toolName,
        status: isOptional ? 'support' : 'missing',
        argsScore: 0,
        explanation: isOptional ? 'Optional support step did not run.' : 'Expected step did not run.',
      });
      return;
    }

    usedActualIndexes.add(foundIndex);
    const actualCall = actualCalls[foundIndex];
    const argsScore = compareArgs(step.expectedArgs, actualCall.args, step.argMatchMode);
    const reordered = foundIndex < lastActualIndex;

    if (!isOptional && argsScore >= 1) {
      matchedCount += 1;
    } else if (!isOptional) {
      partialCount += 1;
    }

    if (!isOptional && !reordered) {
      matchedInOrderCount += 1;
    }

    if (!isOptional) {
      argsScoreTotal += argsScore;
    }
    lastActualIndex = Math.max(lastActualIndex, foundIndex);

    const status = isOptional
      ? 'support'
      : reordered
        ? 'reordered'
        : argsScore >= 1
          ? 'matched'
          : 'partial';

    const explanation = isOptional
      ? 'Optional support step ran.'
      : reordered
        ? 'This step ran, but out of the expected order.'
        : argsScore >= 1
          ? 'This step matched the expected tool and arguments.'
          : 'The tool matched, but the arguments diverged.';

    expectedStepStatuses.push({
      id: step.id,
      toolName: step.toolName,
      status,
      argsScore,
      actualCallId: actualCall.callId,
      explanation,
    });

    actualStepStatuses[foundIndex] = {
      id: actualCall.callId,
      toolName: actualCall.toolName,
      status,
      argsScore,
      expectedStepId: step.id,
      explanation,
    };
  });

  actualCalls.forEach((call, index) => {
    if (usedActualIndexes.has(index)) return;
    if (call.status === 'failed') {
      actualStepStatuses[index] = {
        ...actualStepStatuses[index],
        status: 'failed',
      };
      return;
    }

    if (allowedSupportTools.has(call.toolName)) {
      actualStepStatuses[index] = {
        ...actualStepStatuses[index],
        status: 'support',
        explanation: 'Allowed helper step.',
      };
      return;
    }
  });

  const missing = expectedStepStatuses
    .filter((step) => step.status === 'missing')
    .map((step) => step.toolName);
  const matched = expectedStepStatuses
    .filter((step) => step.status === 'matched')
    .map((step) => step.toolName);
  const partial = expectedStepStatuses
    .filter((step) => step.status === 'partial')
    .map((step) => step.toolName);
  const reordered = expectedStepStatuses
    .filter((step) => step.status === 'reordered')
    .map((step) => step.toolName);
  const support = actualStepStatuses
    .filter((step) => step.status === 'support')
    .map((step) => step.toolName);
  const unexpected = actualStepStatuses
    .filter((step) => step.status === 'unexpected')
    .map((step) => step.toolName);

  const requiredMatchedOrPartial = expectedStepStatuses.filter((step) => (
    step.status === 'matched' || step.status === 'partial' || step.status === 'reordered'
  )).length;
  const requiredCount = Math.max(1, requiredSteps.length || expectedToolCalls.length || 1);
  const coverageScore = requiredSteps.length === 0
    ? (expectedToolCalls.length === 0 ? 1 : requiredMatchedOrPartial / Math.max(expectedToolCalls.length, 1))
    : requiredMatchedOrPartial / requiredSteps.length;
  const argumentScore = requiredMatchedOrPartial === 0 ? 0 : argsScoreTotal / requiredMatchedOrPartial;
  const orderScore = requiredMatchedOrPartial === 0 ? 0 : matchedInOrderCount / requiredMatchedOrPartial;
  const supportPenalty = actualCalls.length === 0
    ? 1
    : clamp(1 - (unexpected.length / Math.max(actualCalls.length, 1)));
  const supportScore = support.length > 0 && unexpected.length === 0
    ? 1
    : supportPenalty;

  let score = clamp(
    coverageScore * 0.4 +
    argumentScore * 0.2 +
    orderScore * 0.15 +
    supportScore * 0.25
  );

  if (failOnUnexpectedTools && unexpected.length > 0) {
    score = Math.min(score, 0.49);
  }

  const explanation = makeExplanation({
    matchedCount,
    partialCount,
    requiredCount,
    supportCount: support.length,
    unexpectedCount: unexpected.length,
    missingCount: missing.length,
  });

  const passed = (
    score >= (scenario?.passCriteria?.minTrajectoryScore ?? 0.75) &&
    missing.length === 0 &&
    (!failOnUnexpectedTools || unexpected.length === 0)
  );

  return {
    matched,
    partial,
    missing,
    support,
    unexpected,
    reordered,
    usedDistractorTools: uniqueNames(unexpected),
    score,
    coverageScore,
    argumentScore,
    orderScore,
    supportScore,
    explanation,
    passed,
    expectedStepStatuses,
    actualStepStatuses,
  };
}
