// DESIGN REFERENCE ONLY - not imported anywhere, contains mock data. Retired
// when the real page it informs is built (attendance: Phase 5, contributions: Phase 6).
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { QrCode, CheckCircle, XCircle, Clock, User, Calendar, Home } from 'lucide-react';

function AttendanceScanner({ onNavigate }) {
  const [scannedData, setScannedData] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // idle, success, error
  const [attendanceLog, setAttendanceLog] = useState([
    { id: 1, volunteerId: 'VOL-2024-001', name: 'Priya Sharma', checkIn: '2024-03-10 09:00', checkOut: '2024-03-10 12:00', status: 'completed' },
    { id: 2, volunteerId: 'VOL-2024-002', name: 'Rahul Verma', checkIn: '2024-03-10 09:15', checkOut: null, status: 'checked-in' },
    { id: 3, volunteerId: 'VOL-2024-003', name: 'Anita Desai', checkIn: '2024-03-10 08:45', checkOut: '2024-03-10 11:30', status: 'completed' },
  ]);
  const [manualInput, setManualInput] = useState('');

  const handleScan = (data) => {
    try {
      const parsedData = JSON.parse(data);
      setScannedData(parsedData);
      setScanStatus('success');

      // Simulate attendance record
      const newLog = {
        id: attendanceLog.length + 1,
        volunteerId: parsedData.id,
        name: parsedData.name,
        checkIn: new Date().toLocaleString(),
        checkOut: null,
        status: 'checked-in'
      };
      setAttendanceLog([newLog, ...attendanceLog]);

      setTimeout(() => setScanStatus('idle'), 3000);
    } catch (error) {
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 3000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput);
      setManualInput('');
    }
  };

  const handleCheckOut = (logId) => {
    setAttendanceLog(logs =>
      logs.map(log =>
        log.id === logId
          ? { ...log, checkOut: new Date().toLocaleString(), status: 'completed' }
          : log
      )
    );
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Scanner</h1>
            <p className="text-gray-600">Scan volunteer QR codes for automatic check-in/check-out</p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg shadow-md transition-colors"
          >
            <Home className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-700">Home</span>
          </button>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* QR Scanner Placeholder */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <QrCode className="w-6 h-6 text-primary-600" />
                QR Code Scanner
              </h3>

              <div className="bg-gray-100 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300">
                <QrCode className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center mb-4">
                  Camera access required for QR scanning
                </p>
                <p className="text-gray-400 text-sm text-center">
                  Position volunteer QR code within the frame
                </p>
              </div>

              {/* Manual Input Fallback */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 mb-3 font-medium">Or enter volunteer ID manually:</p>
                <form onSubmit={handleManualSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter volunteer ID or QR data"
                    className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  />
                  <button type="submit" className="btn-primary">
                    Submit
                  </button>
                </form>
              </div>
            </div>

            {/* Scan Status */}
            {scanStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl p-6 flex items-center gap-4 ${scanStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
              >
                {scanStatus === 'success' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <p className={`font-bold ${scanStatus === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {scanStatus === 'success' ? 'Check-in Successful!' : 'Invalid QR Code'}
                  </p>
                  {scannedData && scanStatus === 'success' && (
                    <p className="text-green-700 text-sm">
                      {scannedData.name} ({scannedData.id})
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Attendance Log */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary-600" />
              Today's Attendance Log
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {attendanceLog.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{log.name}</p>
                        <p className="text-sm text-gray-500">{log.volunteerId}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${log.status === 'checked-in'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}>
                      {log.status === 'checked-in' ? 'Active' : 'Completed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Check-in: {log.checkIn}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Check-out: {log.checkOut || 'Active'}</span>
                    </div>
                  </div>

                  {log.status === 'checked-in' && (
                    <button
                      onClick={() => handleCheckOut(log.id)}
                      className="mt-3 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Check Out
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{attendanceLog.length}</p>
                <p className="text-sm text-gray-600">Total Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {attendanceLog.filter(l => l.status === 'checked-in').length}
                </p>
                <p className="text-sm text-gray-600">Currently Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceLog.filter(l => l.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceScanner;
