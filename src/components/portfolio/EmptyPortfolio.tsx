import { useNavigate } from "react-router-dom";

export default function EmptyPortfolio() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center relative px-4">

      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4 backdrop-blur-md">
        <span className="text-4xl">📁</span>
      </div>

      {/* Text */}
      <h2 className="text-white text-xl font-semibold">
        No portfolios yet
      </h2>

      <p className="text-gray-300 mt-2">
        Create your first portfolio
      </p>

          </div>
  );
}
