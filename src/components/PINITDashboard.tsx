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
  Wallet,
  Lock,
  Zap,
  Image,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PINITDashboardProps {
  userId?: string;
}

export function PINITDashboard({ userId }: PINITDashboardProps) {
  const [currentPage, setCurrentPage] = useState<"home" | "profile" | "vault" | "wallet" | "encryption" | "activity" | "security" | "backend" | "crypto-analyzer">("home");
  const [copied, setCopied] = useState(false);

  const deviceId = "DEV-BIOVAULT-" + (userId || "USER").substring(0, 8).toUpperCase();

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
    { label: "Documents", value: "12", icon: FileText, color: "text-blue-600" },
    { label: "Storage", value: "2.3GB / 5GB", icon: BookOpen, color: "text-purple-600" },
    { label: "Portfolios", value: "3", icon: Briefcase, color: "text-emerald-600" },
    { label: "Shared Links", value: "8", icon: Share2, color: "text-amber-600" },
    { label: "Total Views", value: "247", icon: Eye, color: "text-cyan-600" },
    { label: "Downloads", value: "34", icon: Download, color: "text-rose-600" },
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
    { type: "view", message: "Careersol Recruiter viewed Placement Portfolio", time: "2 hours ago", icon: Eye, color: "bg-blue-100 text-blue-600" },
    { type: "download", message: "Your Resume was downloaded", time: "5 hours ago", icon: Download, color: "bg-emerald-100 text-emerald-600" },
    { type: "expiry", message: "Shared link expires in 2 days", time: "1 day ago", icon: Clock, color: "bg-yellow-100 text-yellow-600" },
    { type: "share", message: "Created new shared link for Masters Portfolio", time: "3 days ago", icon: Share2, color: "bg-purple-100 text-purple-600" },
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
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  // ===================== HOME PAGE =====================
  const HomePage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      {/* Profile Card - Slim */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-3">
          <img
            src={profileData.profilePhoto}
            alt={profileData.name}
            className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">{profileData.name}</h1>
            <p className="text-xs text-gray-700">{profileData.course}</p>
          </div>
          {profileData.verified && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
        </div>
      </div>

      {/* Statistics Grid - Compact */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">📊 STATISTICS</h3>
        <motion.div className="grid grid-cols-3 gap-2">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
              <stat.icon className={`w-5 h-5 mb-1 ${stat.color}`} />
              <p className="text-xs text-gray-600">{stat.label}</p>
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Quick Actions - Small Buttons */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2">⚡ ACTIONS</h3>
        <motion.div className="grid grid-cols-3 gap-1.5 mb-2">
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("profile")} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <FileText className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Profile</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("vault")} className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Briefcase className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Vault</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("wallet")} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Wallet className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Wallet</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("encryption")} className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Lock className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Encrypt</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("activity")} className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Activity className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Activity</span>
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("backend")} className="w-full h-10 bg-red-600 hover:bg-red-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Database className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Backend</span>
            </Button>
          </motion.div>
        </motion.div>
        <motion.div className="grid grid-cols-1 gap-1.5">
          <motion.div variants={itemVariants}>
            <Button onClick={() => setCurrentPage("crypto-analyzer")} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs border-0 flex flex-col items-center justify-center p-1">
              <Image className="w-3 h-3 mb-0.5" />
              <span className="text-xs">Image Crypto Analyzer</span>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation - Small Cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📂 EXPLORE</h3>
        <motion.div className="grid grid-cols-3 gap-2 mb-3">
          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("vault")}
              className="bg-white border border-blue-200 hover:border-blue-400 cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-2 text-center">
                <FileText className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Vault</p>
                <p className="text-xs text-gray-600">Documents</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("encryption")}
              className="bg-white border border-cyan-200 hover:border-cyan-400 cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-2 text-center">
                <Lock className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Encrypt</p>
                <p className="text-xs text-gray-600">Files</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("security")}
              className="bg-white border border-emerald-200 hover:border-emerald-400 cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-2 text-center">
                <Shield className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Security</p>
                <p className="text-xs text-gray-600">Device</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* New Processing Tools */}
        <motion.div className="grid grid-cols-2 gap-2">
          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("backend")}
              className="bg-white border border-red-200 hover:border-red-400 cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-3 text-center">
                <Database className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Backend</p>
                <p className="text-xs text-gray-600">Process Data</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card
              onClick={() => setCurrentPage("crypto-analyzer")}
              className="bg-white border border-indigo-200 hover:border-indigo-400 cursor-pointer shadow-sm hover:shadow-md transition"
            >
              <CardContent className="p-3 text-center">
                <Image className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-900">Crypto</p>
                <p className="text-xs text-gray-600">Analyze Images</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );

  // ===================== MY VAULT PAGE =====================
  const VaultPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">My Vault</h1>
      </div>

      <motion.div className="space-y-2">
        {documents.map((doc) => (
          <motion.div key={doc.id} variants={itemVariants}>
            <Card className="bg-white border border-gray-200 hover:border-blue-300 cursor-pointer transition">
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{doc.name}</h3>
                  <p className="text-xs text-gray-600">{doc.category} • {doc.size}</p>
                </div>
                {doc.status === "verified" && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  // ===================== PORTFOLIOS PAGE =====================
  const PortfoliosPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Portfolios</h1>
      </div>

      <motion.div className="space-y-3">
        {portfolios.map((portfolio) => (
          <motion.div key={portfolio.id} variants={itemVariants}>
            <Card className="bg-white border border-gray-200 hover:border-amber-300 cursor-pointer transition">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{portfolio.name}</h3>
                    <p className="text-xs text-gray-600">{portfolio.type === "placement" ? "For Recruiters" : "For Higher Studies"}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">Active</span>
                </div>
                <div className="flex gap-3 text-xs mb-2 text-gray-600">
                  <span>👁️ {portfolio.views} views</span>
                  <span>📤 Shared {portfolio.shared}x</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs border-0">View</Button>
                  <Button size="sm" className="flex-1 h-7 bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs border-0">Share</Button>
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
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Activity Log</h1>
      </div>

      <motion.div className="space-y-2">
        {recentActivity.map((activity, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${activity.color}`}>
                  <activity.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
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
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Security</h1>
      </div>

      {/* Security Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-emerald-50 border border-emerald-200">
          <CardContent className="p-3 flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Status</p>
              <p className="text-green-700 font-bold">SAFE</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device ID - Immutable */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-l-4 border-l-amber-500 border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600" />
              Device ID (Permanent)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-gray-100 p-2 rounded-lg border border-gray-300 flex items-center gap-2 text-xs">
              <code className="flex-1 text-amber-700 font-mono break-all">{deviceId}</code>
              <Button
                onClick={copyDeviceId}
                size="sm"
                className={`h-7 flex-shrink-0 text-white border-0 ${copied ? "bg-green-600 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}`}
              >
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <p className="text-xs text-gray-600">🔒 Cannot be changed.</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device Info */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Last Login</p>
              <p className="text-sm font-bold text-gray-900">Today, 2:30 PM</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Location</p>
              <p className="text-sm font-bold text-gray-900">New Delhi, India</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  // ===================== PROFILE PAGE =====================
  const ProfilePage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <img src={profileData.profilePhoto} alt="Profile" className="w-16 h-16 rounded-full border-2 border-blue-300" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{profileData.name}</h2>
                {profileData.verified && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
              <p className="text-xs text-gray-600">{profileData.college}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Completion */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Profile Completion</p>
              <p className="text-xs font-bold text-blue-600">{profileData.profileCompletion}%</p>
            </div>
            <Progress value={profileData.profileCompletion} className="h-2" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Academic Info */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3">
            <p className="text-xs text-gray-600 mb-1">Course</p>
            <p className="text-sm font-bold text-gray-900">{profileData.course}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3">
            <p className="text-xs text-gray-600 mb-1">Current Year</p>
            <p className="text-sm font-bold text-gray-900">{profileData.year}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3">
            <p className="text-xs text-gray-600 mb-1">College</p>
            <p className="text-sm font-bold text-gray-900">{profileData.college}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Verification Status */}
      <motion.div variants={itemVariants}>
        <Card className={`border ${profileData.verified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${profileData.verified ? "text-green-600" : "text-yellow-600"}`} />
            <div>
              <p className="text-xs text-gray-600">Verification Status</p>
              <p className={`text-sm font-bold ${profileData.verified ? "text-green-700" : "text-yellow-700"}`}>
                {profileData.verified ? "✅ Verified" : "⏳ Pending"}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  // ===================== WALLET PAGE =====================
  const WalletPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Wallet</h1>
      </div>

      {/* Wallet Balance */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-emerald-700">₹5,240.50</p>
            <p className="text-xs text-gray-600 mt-2">Updated: Today, 2:30 PM</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Methods */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">💳 Payment Methods</h3>
        <div className="space-y-2">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Credit Card</p>
                <p className="text-sm font-bold text-gray-900">•••• •••• •••• 4829</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">UPI</p>
                <p className="text-sm font-bold text-gray-900">manish.kumar@upi</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Net Banking</p>
                <p className="text-sm font-bold text-gray-900">HDFC Bank Account</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📊 Recent Transactions</h3>
        <div className="space-y-2">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Portfolio Subscription</p>
                <p className="text-xs text-gray-400">Yesterday, 3:45 PM</p>
              </div>
              <p className="text-sm font-bold text-rose-600">-₹99.00</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Referral Bonus</p>
                <p className="text-xs text-gray-400">2 days ago</p>
              </div>
              <p className="text-sm font-bold text-green-600">+₹250.00</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Premium Features</p>
                <p className="text-xs text-gray-400">5 days ago</p>
              </div>
              <p className="text-sm font-bold text-rose-600">-₹199.00</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );

  // ===================== ENCRYPTION PAGE =====================
  const EncryptionPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Encryption</h1>
      </div>

      {/* Encryption Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-300">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-6 h-6 text-cyan-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Encryption Status</p>
              <p className="text-lg font-bold text-cyan-700">🔒 Secured</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Encryption Tools */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">🛠️ Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12 bg-cyan-600 hover:bg-cyan-700 text-white border-0">
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-xs">Encrypt File</span>
          </Button>
          <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white border-0">
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-xs">Decrypt File</span>
          </Button>
        </div>
      </motion.div>

      {/* Encrypted Files */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📁 Encrypted Files (3)</h3>
        <div className="space-y-2">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Document1.pdf.enc</p>
                <p className="text-xs text-gray-400">2.4 MB • 2 days ago</p>
              </div>
              <Lock className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Image_scan.jpg.enc</p>
                <p className="text-xs text-gray-400">1.8 MB • 5 days ago</p>
              </div>
              <Lock className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Passport.pdf.enc</p>
                <p className="text-xs text-gray-400">3.2 MB • 10 days ago</p>
              </div>
              <Lock className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Encryption Key Info */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-3">
            <p className="text-xs text-gray-600 mb-1">🔑 Your Master Key</p>
            <p className="text-xs text-gray-400">Uses 256-bit AES encryption standard</p>
            <p className="text-xs text-gray-600 mt-2">Last rotated: 30 days ago</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  // ===================== BACKEND PROCESSING PAGE =====================
  const [backendInput, setBackendInput] = useState("");
  const [backendResults, setBackendResults] = useState<any[]>([]);

  const BackendPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Backend Processing Center</h1>
      </div>

      {/* Backend Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border border-red-300">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Backend Status</p>
              <p className="text-lg font-bold text-red-700">🚀 Active & Connected</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Input */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📝 Input Data</h3>
        <textarea
          value={backendInput}
          onChange={(e) => setBackendInput(e.target.value)}
          placeholder="Enter JSON data for processing..."
          className="w-full p-3 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-red-500"
          rows={3}
        />
      </motion.div>

      {/* Processing Options */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">⚙️ API Operations</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => {
              try {
                const data = JSON.parse(backendInput || "{}");
                setBackendResults([...backendResults, { timestamp: new Date().toLocaleString(), type: "Auth", status: "✓ Success", data }]);
              } catch(e) {
                setBackendResults([...backendResults, { timestamp: new Date().toLocaleString(), type: "Auth", status: "✗ Error", data: e }]);
              }
            }}
            className="h-10 bg-red-600 hover:bg-red-700 text-white border-0 text-xs flex flex-col items-center justify-center"
          >
            <span>Authentication</span>
          </Button>
          <Button className="h-10 bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs">
            <span>Vault Ops</span>
          </Button>
          <Button className="h-10 bg-red-500 hover:bg-red-600 text-white border-0 text-xs">
            <span>Compare</span>
          </Button>
          <Button className="h-10 bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs">
            <span>Certificates</span>
          </Button>
        </div>
      </motion.div>

      {/* Results */}
      {backendResults.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">📊 Processing Results</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {backendResults.map((result, idx) => (
              <Card key={idx} className={`bg-white border ${result.status.includes("Success") ? "border-green-300" : "border-red-300"}`}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-900">{result.type}</p>
                    <p className={`text-xs font-bold ${result.status.includes("Success") ? "text-green-600" : "text-red-600"}`}>{result.status}</p>
                  </div>
                  <p className="text-xs text-gray-400">{result.timestamp}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* API Documentation */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">📡 Available Endpoints</h3>
        <div className="space-y-1 text-xs">
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /auth/login</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /vault/upload</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /compare/save</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">GET</span> /certificates/list</p>
          <p className="text-gray-600"><span className="font-bold text-red-600">POST</span> /admin/users</p>
        </div>
      </motion.div>
    </motion.div>
  );

  // ===================== IMAGE CRYPTO ANALYZER PAGE =====================
  const [cryptoFile, setCryptoFile] = useState<File | null>(null);
  const [cryptoPreview, setCryptoPreview] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [encryptedResult, setEncryptedResult] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  const handleCryptoFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setCryptoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCryptoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setEncryptedResult(null);
      setAnalysisResult(null);
    }
  };

  const generateUUID = () => "UUID-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

  const handleEncryptImage = async () => {
    if (!cryptoFile) return;
    setIsEncrypting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const uuid = generateUUID();
      setEncryptedResult({
        fileName: cryptoFile.name,
        uuid,
        encrypted: true,
        timestamp: new Date().toLocaleString(),
        size: (cryptoFile.size / 1024).toFixed(2) + " KB"
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!cryptoFile) return;
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const types = [
        { type: "Mobile Capture", confidence: 92 },
        { type: "AI-Generated", confidence: 87 },
        { type: "Web Download", confidence: 78 },
        { type: "Screen Capture", confidence: 85 }
      ];
      const result = types[Math.floor(Math.random() * types.length)];
      const analysis = {
        fileName: cryptoFile.name,
        ...result,
        timestamp: new Date().toLocaleString(),
        status: result.confidence > 85 ? "✓ Authentic" : "⚠ Modified"
      };
      setAnalysisResult(analysis);
      setAnalysisHistory([analysis, ...analysisHistory.slice(0, 4)]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const CryptoAnalyzerPage = () => (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={() => setCurrentPage("home")} variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Image Crypto Analyzer</h1>
      </div>

      {/* Analyzer Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-300">
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Crypto Analyzer</p>
              <p className="text-lg font-bold text-indigo-700">✨ Ready to Process</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* File Upload */}
      <motion.div variants={itemVariants}>
        <label className="block">
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition">
            <input
              type="file"
              onChange={handleCryptoFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />
            <Camera className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-900">{cryptoFile ? cryptoFile.name : "Select Image or PDF"}</p>
            <p className="text-xs text-gray-500">Click to upload</p>
          </div>
        </label>
      </motion.div>

      {/* Image Preview */}
      {cryptoPreview && (
        <motion.div variants={itemVariants}>
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-3">
              <img src={cryptoPreview} alt="preview" className="w-full max-h-40 object-cover rounded" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleEncryptImage}
            disabled={!cryptoFile || isEncrypting}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs"
          >
            {isEncrypting ? "🔐 Encrypting..." : "🔐 Encrypt"}
          </Button>
          <Button
            onClick={handleAnalyzeImage}
            disabled={!cryptoFile || isAnalyzing}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
          >
            {isAnalyzing ? "🔍 Analyzing..." : "🔍 Analyze"}
          </Button>
        </div>
      </motion.div>

      {/* Encryption Result */}
      {encryptedResult && (
        <motion.div variants={itemVariants}>
          <Card className="bg-green-50 border border-green-300">
            <CardContent className="p-3">
              <p className="text-xs font-bold text-green-700 mb-2">✓ Encrypted Successfully</p>
              <p className="text-xs text-gray-600">UUID: <code className="font-mono text-xs">{encryptedResult.uuid}</code></p>
              <p className="text-xs text-gray-600">Size: {encryptedResult.size}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <motion.div variants={itemVariants}>
          <Card className={`border ${analysisResult.confidence > 85 ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-900">{analysisResult.type}</p>
                <p className={`text-xs font-bold ${analysisResult.confidence > 85 ? "text-green-600" : "text-yellow-600"}`}>
                  {analysisResult.status}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Confidence: <span className="font-bold">{analysisResult.confidence}%</span></p>
                <p className="text-xs text-gray-600">Time: {analysisResult.timestamp}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">📋 Recent Analysis</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {analysisHistory.map((item, idx) => (
              <Card key={idx} className="bg-white border border-gray-200">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">{item.type}</p>
                    <p className="text-xs font-bold text-indigo-600">{item.confidence}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Features */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-900 mb-2">✨ Features</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p>✓ Image Verification & Authenticity Check</p>
          <p>✓ Metadata Extraction & EXIF Analysis</p>
          <p>✓ Tamper Detection & Forensics</p>
          <p>✓ Travel History Tracking</p>
          <p>✓ Multi-format Support (JPG, PNG, PDF)</p>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="w-full min-h-screen bg-white p-3 md:p-4 rounded-xl">
      <AnimatePresence mode="wait">
        {currentPage === "home" && <HomePage key="home" />}
        {currentPage === "profile" && <ProfilePage key="profile" />}
        {currentPage === "vault" && <VaultPage key="vault" />}
        {currentPage === "wallet" && <WalletPage key="wallet" />}
        {currentPage === "encryption" && <EncryptionPage key="encryption" />}
        {currentPage === "activity" && <ActivityPage key="activity" />}
        {currentPage === "security" && <SecurityPage key="security" />}
        {currentPage === "backend" && <BackendPage key="backend" />}
        {currentPage === "crypto-analyzer" && <CryptoAnalyzerPage key="crypto-analyzer" />}
      </AnimatePresence>
    </div>
  );
}

export default PINITDashboard;
