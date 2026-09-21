import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  User,
  Clock,
  Calendar,
  Award,
  CheckCircle,
  LogOut,
  Download,
  Home,
  ArrowLeft
} from 'lucide-react';

function VolunteerDashboard({ onNavigate }) {
  const [volunteer] = useState({
    id: 'VOL-2024-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 98765 43210',
    joinDate: '2024-01-15',
    totalHours: 45,
    eventsAttended: 12,
    contributions: [
      { id: 1, date: '2024-03-10', event: 'Food Distribution', hours: 3, status: 'verified' },
      { id: 2, date: '2024-03-05', event: 'Clothes Distribution', hours: 4, status: 'verified' },
      { id: 3, date: '2024-02-28', event: 'Health Camp', hours: 5, status: 'pending' },
      { id: 4, date: '2024-02-20', event: 'Cleanliness Drive', hours: 2, status: 'verified' },
    ]
  });

  const [showQR, setShowQR] = useState(false);

  const downloadQR = () => {
    const svg = document.getElementById('volunteer-qr');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `volunteer-qr-${volunteer.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Volunteer Dashboard</h1>
            <p className="text-gray-600">Manage your volunteer profile and track contributions</p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg shadow-md transition-colors"
          >
            <Home className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-700">Home</span>
          </button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {volunteer.name.charAt(0)}
              </div>
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{volunteer.name}</h2>
              <p className="text-gray-600 mb-4">Volunteer ID: {volunteer.id}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{volunteer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{volunteer.totalHours}h Total</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{volunteer.eventsAttended} Events</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Award className="w-4 h-4" />
                  <span className="text-sm">Since {volunteer.joinDate}</span>
                </div>
              </div>
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </motion.div>

        {/* QR Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Your Attendance QR Code</h3>
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {showQR ? 'Hide QR' : 'Show QR'}
            </button>
          </div>

          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="p-4 bg-white border-2 border-primary-200 rounded-xl">
                <QRCodeSVG
                  id="volunteer-qr"
                  value={JSON.stringify({
                    id: volunteer.id,
                    name: volunteer.name,
                    timestamp: new Date().toISOString()
                  })}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-gray-600 text-sm text-center">
                Scan this QR code at event locations for automatic attendance check-in
              </p>
              <button
                onClick={downloadQR}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Contribution History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Contribution History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Event</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Hours</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {volunteer.contributions.map((contribution) => (
                  <tr key={contribution.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-700">{contribution.date}</td>
                    <td className="py-4 px-4 text-gray-700">{contribution.event}</td>
                    <td className="py-4 px-4 text-gray-700">{contribution.hours}h</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${contribution.status === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        <CheckCircle className="w-4 h-4" />
                        {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default VolunteerDashboard;
