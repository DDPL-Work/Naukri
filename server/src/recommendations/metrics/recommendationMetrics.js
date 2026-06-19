const metrics = {
  recommendationsGenerated: 0,
  emailsSent: 0,
  emailFailures: 0,
  clicks: 0,
  duplicateJobsFiltered: 0,
  elitePriorityJobsSent: 0,
  totalScore: 0,
  totalRuns: 0,
  unsubscribesTotal: 0,
  recommendationsGeneratedTotal: 0,
  recommendationEmailsSentTotal: 0,
  recommendationEmailFailuresTotal: 0,
  recommendationClicksTotal: 0,
  recommendationUnsubscribesTotal: 0,
  usersProcessed: 0,
  usersSkipped: 0,
};

function increment(counter, value = 1) {
  if (counter in metrics) {
    metrics[counter] += value;
  }
}

function getMetrics() {
  const delivered = metrics.emailsSent;
  return {
    ...metrics,
    ctr: delivered > 0 ? ((metrics.clicks / delivered) * 100).toFixed(2) : "0.00",
    recommendationCtr: metrics.recommendationEmailsSentTotal > 0
      ? ((metrics.recommendationClicksTotal / metrics.recommendationEmailsSentTotal) * 100).toFixed(2)
      : "0.00",
  };
}

function reset() {
  for (const key of Object.keys(metrics)) {
    metrics[key] = 0;
  }
}

module.exports = { metrics, increment, getMetrics, reset };
