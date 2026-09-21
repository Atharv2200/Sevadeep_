// DESIGN REFERENCE ONLY - not imported anywhere, contains mock data. Retired
// when the real page it informs is built (attendance: Phase 5, contributions: Phase 6).
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  Award,
  Target,
  Home
} from 'lucide-react';

function ContributionTracker({ onNavigate }) {
  const [contributions, setContributions] = useState([
    { id: 1, date: '2024-03-10', event: 'Food Distribution', hours: 3, description: 'Distributed meals at community center', status: 'verified' },
    { id: 2, date: '2024-03-05', event: 'Clothes Distribution', hours: 4, description: 'Organized winter clothing drive', status: 'verified' },
    { id: 3, date: '2024-02-28', event: 'Health Camp', hours: 5, description: 'Assisted in medical checkup camp', status: 'pending' },
  ]);

  const [newContribution, setNewContribution] = useState({
    date: '',
    event: '',
    hours: '',
    description: ''
  });

  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newContribution.date && newContribution.event && newContribution.hours) {
      const contribution = {
        id: contributions.length + 1,
        ...newContribution,
        hours: parseFloat(newContribution.hours),
        status: 'pending'
      };
      setContributions([contribution, ...contributions]);
      setNewContribution({ date: '', event: '', hours: '', description: '' });
      setIsAdding(false);
    }
  };

  const handleDelete = (id) => {
    setContributions(contributions.filter(c => c.id !== id));
  };

  const totalHours = contributions.reduce((sum, c) => sum + c.hours, 0);
  const verifiedHours = contributions.filter(c => c.status === 'verified').reduce((sum, c) => sum + c.hours, 0);
  const pendingHours = contributions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.hours, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50 pt-20">
      <div className="container-custom section-padding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Contribution Tracker</h1>
            <p className="text-gray-600">Log and track your volunteer hours and contributions</p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg shadow-md transition-colors"
          >
            <Home className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-700">Home</span>
          </button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{totalHours}h</p>
                <p className="text-gray-600">Total Hours</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{verifiedHours}h</p>
                <p className="text-gray-600">Verified Hours</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-600">{pendingHours}h</p>
                <p className="text-gray-600">Pending Verification</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Add Contribution Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Log New Contribution</h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isAdding ? 'Cancel' : 'Add Contribution'}
            </button>
          </div>

          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleAdd}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={newContribution.date}
                    onChange={(e) => setNewContribution({ ...newContribution, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Hours Contributed</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={newContribution.hours}
                    onChange={(e) => setNewContribution({ ...newContribution, hours: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    placeholder="e.g., 3.5"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Event/Activity</label>
                <select
                  value={newContribution.event}
                  onChange={(e) => setNewContribution({ ...newContribution, event: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  required
                >
                  <option value="">Select an activity</option>
                  <option value="Clothes Distribution">Clothes Distribution</option>
                  <option value="Books Distribution">Books Distribution</option>
                  <option value="Cleanliness Drives">Cleanliness Drives</option>
                  <option value="Food Distribution">Food Distribution</option>
                  <option value="Health Camps">Health Camps</option>
                  <option value="Elderly Care">Elderly Care</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Description</label>
                <textarea
                  rows="3"
                  value={newContribution.description}
                  onChange={(e) => setNewContribution({ ...newContribution, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                  placeholder="Describe your contribution..."
                />
              </div>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Save Contribution
              </button>
            </motion.form>
          )}
        </motion.div>

        {/* Contributions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Contribution History
          </h3>

          <div className="space-y-4">
            {contributions.map((contribution) => (
              <motion.div
                key={contribution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{contribution.event}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${contribution.status === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {contribution.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {contribution.hours} hours
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(contribution.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {contribution.description && (
                  <p className="text-gray-600 text-sm">{contribution.description}</p>
                )}
              </motion.div>
            ))}
          </div>

          {contributions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contributions logged yet</p>
              <p className="text-gray-400 text-sm">Start tracking your volunteer hours</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default ContributionTracker;
