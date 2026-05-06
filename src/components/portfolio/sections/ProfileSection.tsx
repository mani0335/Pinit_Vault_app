import { useState } from "react";

interface ProfileSectionProps {
  profile: {
    name: string;
    role: string;
    email: string;
  };
  onChange: (profile: { name: string; role: string; email: string }) => void;
}

export function ProfileSection({ profile, onChange }: ProfileSectionProps) {
  const handleChange = (field: keyof typeof profile, value: string) => {
    onChange({
      ...profile,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
      
      <div className="bg-gradient-to-br from-slate-800/40 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-6 space-y-6 shadow-xl">
        <div>
          <label className="text-purple-300 text-sm font-semibold mb-2 block">
            Full Name
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={profile.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
          />
        </div>

        <div>
          <label className="text-purple-300 text-sm font-semibold mb-2 block">
            Professional Role
          </label>
          <input
            type="text"
            placeholder="e.g., Software Engineer, Designer, Student"
            value={profile.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
          />
        </div>

        <div>
          <label className="text-purple-300 text-sm font-semibold mb-2 block">
            Email Address
          </label>
          <input
            type="email"
            placeholder="your.email@example.com"
            value={profile.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full bg-slate-700/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/70 focus:bg-slate-700/70 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
