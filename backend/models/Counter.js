const mongoose = require('mongoose');

// Named atomic sequences (used for volunteer IDs). One document per sequence.
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

// Atomically increments the named sequence and returns the new value (1, 2, 3...).
// Two callers racing to create a brand-new sequence can collide on the upsert;
// the loser retries once and then increments the winner's document.
counterSchema.statics.next = async function next(key) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const counter = await this.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      return counter.seq;
    } catch (err) {
      if (err.code !== 11000 || attempt >= 1) throw err;
    }
  }
};

module.exports = mongoose.model('Counter', counterSchema);
