import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Search,
  Filter,
  Eye,
  FileText,
  Home
} from 'lucide-react';

function ContributionVerification({ onNavigate }) {
  const [pendingContributions, setPendingContributions] = useState([
    {
      id: 1,
      volunteerId: 'VOL-2024-001',
      volunteerName: 'Priya Sharma',
      date: '2024-03-10',
      event: 'Food Distribution',
      hours: 3,
      description: 'Distributed meals at community center',
      submittedDate: '2024-03-10',
      status: 'pending'
    },
    {
      id: 2,
      volunteerId: 'VOL-2024-002',
      volunteerName: 'Rahul Verma',
      date: '2024-03-08',
      event: 'Clothes Distribution',
      hours: 4,
      description: 'Organized winter clothing drive',
      submittedDate: '2024-03-09',
      status: 'pending'
    },
    {
      id: 3,
      volunteerId: 'VOL-2024-003',
      volunteerName: 'Anita Desai',
      date: '2024-03-05',
      event: 'Health Camp',
      hours: 5,
      description: 'Assisted in medical checkup camp',
      submittedDate: '2024-03-06',
      status: 'pending'
    },
  ]);

  const [verifiedContributions, setVerifiedContributions] = useState([
    {
      id: 4,
      volunteerId: 'VOL-2024-001',
      volunteerName: 'Priya Sharma',
      date: '2024-03-05',
      event: 'Clothes Distribution',
      hours: 4,
      description: 'Organized winter clothing drive',
      submittedDate: '2024-03-05',
      verifiedDate: '2024-03-06',
      status: 'verified'
    },
    {
      id: 5,
      volunteerId: 'VOL-2024-002',
      volunteerName: 'Rahul Verma',
      date: '2024-02-28',
      event: 'Cleanliness Drive',
      hours: 2,
      description: 'Community cleanup activity',
      submittedDate: '2024-02-28',
      verifiedDate: '2024-03-01',
      status: 'verified'
    },
  ]);

  const [rejectedContributions, setRejectedContributions] = useState([
    {
      id: 6,
      volunteerId: 'VOL-2024-004',
      volunteerName: 'Suresh Kumar',
      date: '2024-03-01',
      event: 'Food Distribution',
      hours: 6,
      description: 'Claimed excessive hours without evidence',
      submittedDate: '2024-03-02',
      rejectedDate: '2024-03-03',
      rejectionReason: 'Hours claimed exceed event duration',
      status: 'rejected'
    },
  ]);

  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (id) => {
    const contribution = pendingContributions.find(c => c.id === id);
    if (contribution) {
      setPendingContributions(pendingContributions.filter(c => c.id !== id));
      setVerifiedContributions([
        {
          ...contribution,
          verifiedDate: new Date().toISOString().split('T')[0],
          status: 'verified'
        },
        ...verifiedContributions
      ]);
    }
  };

  const handleReject = (id) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const contribution = pendingContributions.find(c => c.id === id);
    if (contribution) {
      setPendingContributions(pendingContributions.filter(c => c.id !== id));
      setRejectedContributions([
        {
          ...contribution,
          rejectedDate: new Date().toISOString().split('T')[0],
          rejectionReason,
          status: 'rejected'
        },
        ...rejectedContributions
      ]);
      setRejectionReason('');
      setSelectedContribution(null);
    }
  };

  const filteredContributions = (list) => {
    return list.filter(c =>
      c.volunteerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.volunteerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.event.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const stats = {
    pending: pendingContributions.length,
    verified: verifiedContributions.length,
    rejected: rejectedContributions.length,
    totalHours: verifiedContributions.reduce((sum, c) => sum + c.hours, 0)
  };

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
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary-600" />
              <h1 className="text-4xl font-bold text-gray-900">Contribution Verification</h1>
            </div>
            <p className="text-gray-600">Review and verify volunteer contributions for transparency and accountability</p>
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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-gray-600">Pending</p>
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
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
                <p className="text-gray-600">Verified</p>
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
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-gray-600">Rejected</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-600">{stats.totalHours}h</p>
                <p className="text-gray-600">Total Verified</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by volunteer name, ID, or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 text-sm">Filter by status:</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['pending', 'verified', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === tab
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {stats[tab] > 0 && (
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                  {stats[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contributions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Contributions
          </h3>

          <div className="space-y-4">
            {filteredContributions(
              activeTab === 'pending' ? pendingContributions :
                activeTab === 'verified' ? verifiedContributions :
                  rejectedContributions
            ).map((contribution) => (
              <motion.div
                key={contribution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 rounded-xl p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{contribution.volunteerName}</h4>
                      <p className="text-sm text-gray-500">{contribution.volunteerId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedContribution(
                      selectedContribution?.id === contribution.id ? null : contribution
                    )}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Event Date: {contribution.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Hours: {contribution.hours}h</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Event: {contribution.event}</span>
                  </div>
                </div>

                {selectedContribution?.id === contribution.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-gray-200"
                  >
                    <p className="text-gray-600 mb-4">{contribution.description}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Submitted: {contribution.submittedDate}
                      {contribution.verifiedDate && ` | Verified: ${contribution.verifiedDate}`}
                      {contribution.rejectedDate && ` | Rejected: ${contribution.rejectedDate}`}
                    </p>
                    {contribution.rejectionReason && (
                      <p className="text-sm text-red-600 mb-4">
                        Rejection Reason: {contribution.rejectionReason}
                      </p>
                    )}

                    {activeTab === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(contribution.id)}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedContribution(contribution)}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {selectedContribution?.id === contribution.id && activeTab === 'pending' && (
                      <div className="mt-4">
                        <label className="block text-gray-700 font-medium mb-2">Rejection Reason</label>
                        <textarea
                          rows="2"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
                          placeholder="Provide reason for rejection..."
                        />
                        <button
                          onClick={() => handleReject(contribution.id)}
                          className="mt-2 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {filteredContributions(
            activeTab === 'pending' ? pendingContributions :
              activeTab === 'verified' ? verifiedContributions :
                rejectedContributions
          ).length === 0 && (
              <div className="text-center py-12">
                <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No {activeTab} contributions found</p>
              </div>
            )}
        </motion.div>
      </div>
    </div>
  );
}

export default ContributionVerification;
