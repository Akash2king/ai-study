import React, { useState, useEffect } from 'react';
import { getDatabaseStats } from '../services/databaseService';

const DatabaseStats: React.FC = () => {
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalMessages: 0,
        databaseSize: 0
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await getDatabaseStats();
        setStats(data);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Database Statistics
            </h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                    <span>Total Courses:</span>
                    <span className="font-semibold text-blue-400">{stats.totalCourses}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                    <span>Chat Messages:</span>
                    <span className="font-semibold text-green-400">{stats.totalMessages}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                    <span>Database Size:</span>
                    <span className="font-semibold text-purple-400">{formatBytes(stats.databaseSize)}</span>
                </div>
            </div>
            <button
                onClick={loadStats}
                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
                Refresh Stats
            </button>
        </div>
    );
};

export default DatabaseStats;
