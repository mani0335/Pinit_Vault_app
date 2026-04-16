import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Upload,
  Lock,
  Share2,
  Download,
  Trash2,
  Award,
  Eye,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { getActivityLogs, getActivityStats, getActivityTimeline, clearActivityLogs } from '@/lib/activityUtils';

interface ActivityLoggerProps {
  userId?: string;
  onBack?: () => void;
}

export const ActivityLogger: React.FC<ActivityLoggerProps> = ({ userId = 'user', onBack }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    loadActivityData();
    const interval = setInterval(loadActivityData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [userId]);

  const loadActivityData = () => {
    const activityLogs = getActivityLogs(userId);
    const activityStats = getActivityStats(userId);
    const activityTimeline = getActivityTimeline(userId);

    setLogs(activityLogs);
    setStats(activityStats);
    setTimeline(activityTimeline);
  };

  const filteredLogs =
    filterAction === 'all' ? logs : logs.filter((log) => log.action === filterAction);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'encrypt':
        return <Lock className="w-4 h-4" />;
      case 'share':
        return <Share2 className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'certificate':
        return <Award className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload':
        return 'blue';
      case 'encrypt':
        return 'purple';
      case 'share':
        return 'emerald';
      case 'download':
        return 'cyan';
      case 'delete':
        return 'red';
      case 'certificate':
        return 'amber';
      case 'view':
        return 'indigo';
      default:
        return 'slate';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'emerald';
      case 'pending':
        return 'amber';
      case 'failed':
        return 'red';
      default:
        return 'slate';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Activity Log
          </h1>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid md:grid-cols-4 gap-4 mb-6"
        >
          <StatCard title="Total Activities" value={stats.total || 0} icon={TrendingUp} />
          <StatCard title="Encryptions" value={stats.encryptions || 0} icon={Lock} color="purple" />
          <StatCard title="Shares Created" value={stats.shares || 0} icon={Share2} color="emerald" />
          <StatCard title="Success Rate" value={`${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`} icon={Zap} color="amber" />
        </motion.div>

        {/* Filter */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <p className="text-slate-300 font-medium mb-3">Filter by Action</p>
          <div className="flex flex-wrap gap-2">
            {['all', 'upload', 'encrypt', 'share', 'download', 'certificate', 'delete'].map(
              (action) => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    filterAction === action
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              )
            )}
          </div>
        </motion.div>

        {/* Activity List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
        >
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No activities logged</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredLogs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg bg-${getActionColor(log.action)}-900/20`}>
                      <span className={`text-${getActionColor(log.action)}-400 flex`}>
                        {getActionIcon(log.action)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-200 font-medium capitalize">
                          {log.action} – {log.fileName}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium bg-${getStatusColor(
                            log.status
                          )}-900/20 text-${getStatusColor(log.status)}-400`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <p className="text-slate-400 text-sm">{log.details}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="font-mono">{log.assetId}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Clear Logs */}
        {logs.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                if (confirm('Clear all activity logs? This cannot be undone.')) {
                  clearActivityLogs(userId);
                  loadActivityData();
                }
              }}
              className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg transition-colors text-sm"
            >
              Clear All Logs
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Helper Component ──
const StatCard: React.FC<{ title: string; value: string | number; icon: any; color?: string }> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-${color}-900/20 border border-${color}-700 rounded-xl p-4`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-${color}-300 text-sm font-medium`}>{title}</p>
        <p className="text-white text-2xl font-bold mt-2">{value}</p>
      </div>
      <Icon className={`w-8 h-8 text-${color}-400 opacity-50`} />
    </div>
  </motion.div>
);

export default ActivityLogger;
