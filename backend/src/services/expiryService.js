const expiryService = {
  // Dynamically categorize batches based on current date without permanently storing calculated days
  categorizeBatches: (batches) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired = [];
    const within30Days = [];
    const within60Days = [];
    const safe = [];

    batches.forEach((batch) => {
      const expDate = new Date(batch.expiryDate);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const batchData = batch.toObject ? batch.toObject() : { ...batch };
      batchData.daysRemaining = daysRemaining;

      if (daysRemaining <= 0) {
        batchData.status = 'Expired';
        expired.push(batchData);
      } else if (daysRemaining <= 30) {
        batchData.status = 'Near Expiry';
        within30Days.push(batchData);
      } else if (daysRemaining <= 60) {
        batchData.status = 'Monitor';
        within60Days.push(batchData);
      } else {
        batchData.status = 'Normal';
        safe.push(batchData);
      }
    });

    return {
      expired,
      within30Days,
      within60Days,
      safe,
      totalBatches: batches.length,
      counts: {
        expired: expired.length,
        within30Days: within30Days.length,
        within60Days: within60Days.length,
        safe: safe.length,
      },
    };
  },
};

module.exports = expiryService;
