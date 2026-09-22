// Contribution rules shared by the model, the validators and the service.

const STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

const HOURS_STEP = 0.25;
const MAX_HOURS = 24;

const LIMITS = {
  description: { max: 5000 },
  reviewNote: { max: 2000 },
};

module.exports = { STATUSES, HOURS_STEP, MAX_HOURS, LIMITS };
