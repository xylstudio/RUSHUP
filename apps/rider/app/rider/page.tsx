'use client';

import React from 'react';

export default function RiderDashboard() {
  return (
    <div className="flex flex-col gap-4">
      {/* Current Job or Empty State */}
      <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No Active Deliveries</h2>
        <p className="text-gray-500 text-sm">Wait for new incoming orders...</p>
      </div>

      {/* Available Jobs List */}
      <h3 className="font-semibold text-gray-700 mt-4">Available Jobs</h3>
      
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Order #1024</span>
            <p className="font-bold text-gray-800 mt-1">2.5 km • ฿45</p>
          </div>
          <span className="text-xs text-gray-500">1 min ago</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <p>Xylem Cafe (Branch 1)</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <p>123 Customer Street, District</p>
        </div>
        
        <button className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg mt-2 active:bg-orange-600 transition-colors">
          Accept Delivery
        </button>
      </div>
    </div>
  );
}
