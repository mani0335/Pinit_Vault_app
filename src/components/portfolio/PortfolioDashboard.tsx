import { Portfolio } from "@/types/portfolio";
import { useNavigate } from "react-router-dom";

export default function PortfolioDashboard({ portfolios, onDelete }: { portfolios: Portfolio[]; onDelete: (id: string) => void }) {
  const navigate = useNavigate();

  const handleShare = (portfolio: Portfolio) => {
    const link = `${window.location.origin}/portfolio/view/${portfolio.id}`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
  };
  return (
    <div className="p-4 space-y-4">

      {/* Top Banner */}
      <div className="rounded-2xl p-6 text-white 
        bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-sm opacity-80">
              Create and share structured document portfolios securely
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-500">
          <p className="text-sm">Total Portfolios</p>
          <h2 className="text-xl font-bold">{portfolios.length}</h2>
        </div>

        <div className="p-4 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-500">
          <p className="text-sm">Shared Portfolios</p>
          <h2 className="text-xl font-bold">
            {portfolios.filter(p => p.isShared).length}
          </h2>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portfolios.map(p => (
          <div key={p.id}
            className="p-4 rounded-xl text-white 
            bg-gradient-to-r from-purple-600 via-blue-600 to-pink-500 
            hover:scale-105 transition-all">

            <h3 className="font-bold text-lg">
              {p.name}
            </h3>
            <p className="text-sm opacity-80">
              {p.type}
            </p>
            <p className="text-xs mt-2">
              Last updated: {p.updatedAt}
            </p>

            <div className="mt-2 text-sm">
              {p.isShared ? "Shared" : "Private"}
            </div>

            {/* Action Menu */}
            <div className="flex gap-3 mt-3 justify-end">
              <button 
                onClick={() => navigate(`/portfolio/view/${p.id}`)}
                className="text-white hover:bg-white/20 p-2 rounded transition"
                title="View"
              >
                👁️
              </button>
              <button 
                onClick={() => navigate(`/portfolio/edit/${p.id}`)}
                className="text-white hover:bg-white/20 p-2 rounded transition"
                title="Edit"
              >
                ✏️
              </button>
              <button 
                onClick={() => handleShare(p)}
                className="text-white hover:bg-white/20 p-2 rounded transition"
                title="Share"
              >
                🔗
              </button>
              <button 
                onClick={() => onDelete(p.id)}
                className="text-red-400 hover:text-red-600 hover:bg-white/20 p-2 rounded transition"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
