// Loads every model so they are all registered with Mongoose (index building
// depends on it) and can be imported from one place.
module.exports = {
  Counter: require('./Counter'),
  User: require('./User'),
  Volunteer: require('./Volunteer'),
  Activity: require('./Activity'),
  Attendance: require('./Attendance'),
};
