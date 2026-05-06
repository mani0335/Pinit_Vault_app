import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getPortfolios, deletePortfolio } from "../services/portfolioService";
import { PortfolioCard } from "../components/portfolio/PortfolioCard";
import EmptyPortfolio from "../components/portfolio/EmptyPortfolio";
import PortfolioShareModal from "../components/portfolio/PortfolioShareModal";

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      const data = await getPortfolios();
      setPortfolios(data);
    } catch (error) {
      console.error("Failed to load portfolios:", error);
    }
  };

  const handleView = (portfolio: any) => {
    navigate(`/portfolio/view/${portfolio.id}`);
  };

  const handleEdit = (portfolio: any) => {
    navigate(`/portfolio/edit/${portfolio.id}`);
  };

  const handleShare = (portfolio: any) => {
    setSelectedPortfolio(portfolio);
    setShareModalOpen(true);
  };

  const handleDelete = async (portfolio: any) => {
    try {
      await deletePortfolio(portfolio.id);
      await loadPortfolios(); // reload
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      alert("Failed to delete portfolio");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">

      {/* KEEP EXISTING HEADER (User ID / top bar) */}

      <div className="flex-1 p-4">
        {/* Stats */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-gray-300">Total: {portfolios.length} portfolios</p>
        </div>

        {/* Portfolio Grid */}
        {portfolios.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onView={handleView}
                onEdit={handleEdit}
                onShare={handleShare}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[90px] right-[24px] z-50">
        <button
          onClick={() => navigate("/portfolio/create")}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 text-white text-2xl shadow-lg hover:scale-105 transition-all duration-300"
        >
          +
        </button>
      </div>

      {/* KEEP EXISTING BOTTOM NAVBAR */}

      {/* Share Modal */}
      {shareModalOpen && selectedPortfolio && (
        <PortfolioShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedPortfolio(null);
          }}
          portfolioId={selectedPortfolio.id}
          portfolioName={selectedPortfolio.name || selectedPortfolio.title || 'Portfolio'}
          portfolio={selectedPortfolio}
        />
      )}
    </div>
  );
}
