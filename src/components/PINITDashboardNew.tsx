import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  FileText,
  Share2,
  Activity,
  Briefcase,
  BookOpen,
  Shield,
  CheckCircle,
  TrendingUp,
  Eye,
  Download,
  Clock,
  Smartphone,
  MapPin,
  Copy,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PINITDashboardProps {
  userId?: string;
}

export function PINITDashboard({ userId }: PINITDashboardProps) {
  const [currentPage, setCurrentPage] = useState<"home" | "vault" | "portfolios" | "activity" | "security">("home");
  const [copied, setCopied] = useState(false);

  const deviceId = "DEV-PINIT-" + (userId || "USER").substring(0, 8).toUpperCase();

  const profileData = {
    name: "Manish Kumar",
    college: "Delhi Institute of Technology",
    course: "B.Tech Computer Science",
    year: "3rd Year",
    profileCompletion: 85,
    profilePhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manish",
    verified: true,
  };

  const stats = [
    { label: "Documents", value: "12", icon: FileText, bgColor: "from-blue-600 to-blue-700" },
    { label: "Storage", value: "2.3GB / 5GB", icon: BookOpen, bgColor: "from-purple-600 to-purple-700" },
    { label: "Portfolios", value: "3", icon: Briefcase, bgColor: "from-emerald-600 to-emerald-700" },
    { label: "Shared Links", value: "8", icon: Share2, bgColor: "from-amber-600 to-amber-700" },
    { label: "Total Views", value: "247", icon: Eye, bgColor: "from-cyan-600 to-cyan-700" },
    { label: "Downloads", value: "34", icon: Download, bgColor: "from-rose-600 to-rose-700" },
  ];

  const documents = [
    { id: 1, name: "10th Marksheet", category: "Academics", date: "2024-03-15", status: "verified", size: "2.4 MB" },
    { id: 2, name: "12th Marksheet", category: "Academics", date: "2024-03-14", status: "verified", size: "2.1 MB" },
    { id: 3, name: "Java Certification", category: "Certificates", date: "2024-02-20", status: "verified", size: "1.8 MB" },
    { id: 4, name: "Portfolio PDF", category: "Projects", date: "2024-03-10", status: "verified", size: "5.2 MB" },
  ];

  const portfolios = [
    { id: 1, name: "Placement Profile", type: "placement", shared: 3, views: 12, status: "active" },
    { id: 2, name: "Masters Application", type: "masters", shared: 1, views: 5, status: "active" },
    { id: 3, name: "Academic Portfolio", type: "general", shared: 4, views: 230, status: "active" },
  ];

  const recentActivity = [
    { type: "view", message: "Careersol Recruiter viewed Placement Portfolio", time: "2 hours ago", icon: Eye },
    { type: "download", message: "Your Resume was downloaded", time: "5 hours ago", icon: Download },
    { type: "expiry", message: "Shared link expires in 2 days", time: "1 day ago", icon: Clock },
    { type: "share", message: "Created new shared link for Masters Portfolio", time: "3 days ago", icon: Share2 },
  ];

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pageVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // ===================== HOME PAGE =====================
  const HomePage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      {/* Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={profileData.profilePhoto}
            alt={profileData.name}
            className="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profileData.name}</h1>
            <p className="text-blue-100 text-sm">{profileData.course}</p>
            <p className="text-blue-50 text-xs">{profileData.college} • {profileData.year}</p>
          </div>
          {profileData.verified && <CheckCircle className="w-8 h-8 text-green-300" />}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-2">
            <span>Profile Completion</span>
            <span className="font-bold">{profileData.profileCompletion}%</span>
          </div>
          <Progress value={profileData.profileCompletion} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Statistics Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">📊 Key Statistics</h2>
        <motion.div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl p-4 text-white shadow-lg`}>
              <stat.icon className="w-6 h-6 mb-2" />
              <p className="text-sm font-medium opacity-90">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h2>
        <motion.div className="grid grid-cols-2 gap-3">
          <motion.div variants={itemVariants}>
            <Button className="w-full h-24 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 hover:shadow-xl transition flex flex-col gap-2">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Upload</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button className="w-full h-24 bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 hover:shadow-xl transition flex flex-col gap-2">
              <Camera className="w-6 h-6" />
              <span className="text-sm font-medium">Capture</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("portfolios")} className="w-full h-24 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 hover:shadow-xl transition flex flex-col gap-2">
              <Briefcase className="w-6 h-6" />
              <span className="text-sm font-medium">Portfolios</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button className="w-full h-24 bg-gradient-to-br from-amber-600 to-amber-700 text-white border-0 hover:shadow-xl transition flex flex-col gap-2">
              <Share2 className="w-6 h-6" />
              <span className="text-sm font-medium">Share</span>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">📂 Explore</h2>
        <motion.div className="grid grid-cols-2 gap-3">
          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("vault")}
              className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-blue-400 cursor-pointer hover:shadow-xl transition"
            >
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-white font-medium">My Vault</p>
                <p className="text-slate-400 text-xs mt-1">{documents.length} documents</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("activity")}
              className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-cyan-400 cursor-pointer hover:shadow-xl transition"
            >
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-white font-medium">Activity</p>
                <p className="text-slate-400 text-xs mt-1">Live tracking</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("security")}
              className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-emerald-400 cursor-pointer hover:shadow-xl transition"
            >
              <CardContent className="p-4 text-center">
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-medium">Security</p>
                <p className="text-slate-400 text-xs mt-1">Device & access</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-amber-400 cursor-pointer hover:shadow-xl transition">
              <CardContent className="p-4 text-center">
                <Briefcase className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-white font-medium">Portfolios</p>
                <p className="text-slate-400 text-xs mt-1">{portfolios.length} active</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );

  // ===================== MY VAULT PAGE =====================
  const VaultPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">My Vault</h1>
      </div>

      <motion.div className="space-y-3">
        {documents.map((doc) => (
          <motion.div key={doc.id} variants={itemVariants}>
            <Card className="bg-slate-700/50 border-slate-600 hover:border-blue-400 cursor-pointer transition">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{doc.name}</h3>
                  <p className="text-slate-400 text-sm">{doc.category} • {doc.size}</p>
                </div>
                <div className="text-right">
                  {doc.status === "verified" && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  // ===================== PORTFOLIOS PAGE =====================
  const PortfoliosPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">My Portfolios</h1>
      </div>

      <motion.div className="space-y-4">
        {portfolios.map((portfolio) => (
          <motion.div key={portfolio.id} variants={itemVariants}>
            <Card className="bg-slate-700/50 border-slate-600 hover:border-amber-400 cursor-pointer transition">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">{portfolio.name}</h3>
                    <p className="text-slate-400 text-sm">{portfolio.type === "placement" ? "For Recruiters" : portfolio.type === "masters" ? "For Higher Studies" : "Academic"}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600/30 text-emerald-300 text-xs font-medium rounded-full">Active</span>
                </div>
                <div className="flex gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Eye className="w-4 h-4" />
                    {portfolio.views} views
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Share2 className="w-4 h-4" />
                    Shared with {portfolio.shared}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0">View</Button>
                  <Button size="sm" className="flex-1 bg-slate-600 hover:bg-slate-500 text-white border-0">Share</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  // ===================== ACTIVITY PAGE =====================
  const ActivityPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Activity Tracking</h1>
      </div>

      <motion.div className="space-y-3">
        {recentActivity.map((activity, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="bg-slate-700/50 border-slate-600">
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-3 rounded-lg flex-shrink-0 ${
                  activity.type === "view" ? "bg-cyan-600/20 text-cyan-400" :
                  activity.type === "download" ? "bg-emerald-600/20 text-emerald-400" :
                  activity.type === "expiry" ? "bg-yellow-600/20 text-yellow-400" :
                  "bg-purple-600/20 text-purple-400"
                }`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{activity.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{activity.time}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  // ===================== SECURITY PAGE =====================
  const SecurityPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="text-slate-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Security & Devices</h1>
      </div>

      {/* Security Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border-emerald-500/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-600/30 rounded-lg">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-300">Security Status</p>
              <p className="text-emerald-300 text-2xl font-bold">Safe</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device ID - IMMUTABLE */}
      <motion.div variants={itemVariants}>
        <Card className="bg-slate-700/50 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Device ID (Permanent)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-600 flex items-center gap-3">
              <code className="flex-1 text-amber-300 font-mono text-sm break-all">{deviceId}</code>
              <Button
                onClick={copyDeviceId}
                size="sm"
                className={`flex-shrink-0 ${copied ? "bg-green-600 hover:bg-green-600" : "bg-slate-600 hover:bg-slate-500"} text-white border-0`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-slate-400 text-xs">🔒 This Device ID is permanently linked to your vault. It cannot be changed and is used for security.</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device Info */}
      <motion.div variants={itemVariants} className="space-y-3">
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Last Login</p>
              <p className="text-white font-medium">Today, 2:30 PM</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Location</p>
              <p className="text-white font-medium">New Delhi, India</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 rounded-xl">
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" />}
        {currentPage === "vault" && <VaultPage key="vault" />}
        {currentPage === "portfolios" && <PortfoliosPage key="portfolios" />}
        {currentPage === "activity" && <ActivityPage key="activity" />}
        {currentPage === "security" && <SecurityPage key="security" />}
      </AnimatePresence>
    </div>
  );
}

export default PINITDashboard;
