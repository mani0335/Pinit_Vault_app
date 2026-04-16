import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Shield,
  Download,
  Trash2,
  LogOut,
  Settings,
  ArrowLeft,
  Check,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getActivityStats } from '@/lib/activityUtils';
import { getShareLinks, getCertificates } from '@/lib/sharingUtils';

interface UserProfileProps {
  userId?: string;
  userEmail?: string;
  onBack?: () => void;
  onLogout?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId = 'user',
  userEmail = 'user@example.com',
  onBack,
  onLogout,
}) => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [sessionTime, setSessionTime] = useState<string>('');

  useEffect(() => {
    // Load stats
    const activityStats = getActivityStats(userId);
    setStats(activityStats);

    // Update session time
    const startTime = new Date();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      setSessionTime(`${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 12;
    if (/[A-Z]/.test(pwd)) strength += 12;
    if (/[0-9]/.test(pwd)) strength += 13;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 13;
    setPasswordStrength(Math.min(100, strength));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    calculatePasswordStrength(e.target.value);
  };

  const shareLinksCount = getShareLinks().length;
  const certificatesCount = getCertificates().length;

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'slate';
    if (passwordStrength < 30) return 'red';
    if (passwordStrength < 60) return 'amber';
    if (passwordStrength < 85) return 'emerald';
    return 'emerald';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" />
            User Profile
          </h1>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 mb-6"
        >
          {/* Avatar & Name */}
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {userId.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white">{userId}</h2>
              <div className="flex items-center gap-2 mt-2 text-slate-400">
                <Mail className="w-4 h-4" />
                {userEmail}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 border border-emerald-700 rounded-full">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">Verified</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/30 border border-blue-700 rounded-full">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300">Session: {sessionTime || 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4 pt-8 border-t border-slate-700">
            <StatItem label="Total Activities" value={stats.total || 0} icon={Shield} color="blue" />
            <StatItem label="Certificates" value={certificatesCount} icon={Lock} color="purple" />
            <StatItem label="Share Links" value={shareLinksCount} icon={Settings} color="emerald" />
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Security Settings
          </h3>

          {/* Change Password */}
          <div className="space-y-4 mb-6">
            <label className="block">
              <span className="text-slate-300 font-medium mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                New Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {newPassword && (
              <div className="space-y-2">
                <p className="text-slate-400 text-sm">Password Strength</p>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength}%` }}
                    className={`h-full bg-${getPasswordStrengthColor()}-500`}
                  />
                </div>
                <p className={`text-xs text-${getPasswordStrengthColor()}-400`}>
                  {passwordStrength < 30
                    ? 'Weak'
                    : passwordStrength < 60
                      ? 'Fair'
                      : passwordStrength < 85
                        ? 'Good'
                        : 'Strong'}
                </p>
              </div>
            )}

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
              Update Password
            </button>
          </div>

          {/* Two Factor */}
          <div className="pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-medium">Two-Factor Authentication</p>
                <p className="text-slate-400 text-sm mt-1">Add extra security to your account</p>
              </div>
              <button className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors">
                Enable
              </button>
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Data Management
          </h3>

          <div className="space-y-3">
            <button className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700 text-emerald-300 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download My Data
            </button>

            <button className="w-full bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700 text-amber-300 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Export Vault
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-red-900/20 border border-red-700 rounded-2xl p-8"
        >
          <h3 className="text-lg font-bold text-red-300 mb-6">Danger Zone</h3>

          <div className="space-y-3">
            <button
              onClick={onLogout}
              className="w-full bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700 text-blue-300 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>

            <button
              onClick={() => {
                if (confirm('Delete account? This cannot be undone.')) {
                  // Handle account deletion
                }
              }}
              className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-300 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>

          <p className="text-red-300/70 text-xs mt-4">
            Account deletion will remove your profile and all associated data permanently.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ─── Helper Component ──
const StatItem: React.FC<{ label: string; value: number; icon: any; color: string }> = ({
  label,
  value,
  icon: Icon,
  color,
}) => (
  <div className={`bg-${color}-900/20 border border-${color}-700 rounded-lg p-4`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-${color}-300 text-sm font-medium`}>{label}</p>
        <p className="text-white text-2xl font-bold mt-2">{value}</p>
      </div>
      <Icon className={`w-6 h-6 text-${color}-400 opacity-50`} />
    </div>
  </div>
);

export default UserProfile;
