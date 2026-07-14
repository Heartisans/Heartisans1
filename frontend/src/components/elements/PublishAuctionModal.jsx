import { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { FaPlay, FaTimes } from "react-icons/fa";

export const PublishAuctionModal = ({ isOpen, onClose, request, onPublish }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(60); // minutes
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startTime) {
      setError("Start time is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`http://localhost:5000/api/auction-requests/${request._id}/publish`, {
        predictedBasePrice: request.predictedBasePrice,
        predictedCeilingPrice: request.predictedCeilingPrice,
        duration: parseInt(duration),
        startTime: new Date(startTime).toISOString()
      });
      
      onPublish(res.data.liveAuction);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to publish auction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-green-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <FaPlay className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Start Live Auction</h2>
              <p className="text-green-100 text-sm">{request.productName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg transition-colors hover:bg-white/10"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 font-medium">Base Price</p>
              <p className="text-xl font-bold text-gray-900">₹{request.predictedBasePrice?.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-medium">Ceiling Price</p>
              <p className="text-xl font-bold text-gray-900">₹{request.predictedCeilingPrice?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Start Date & Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Duration (Minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="15"
              required
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Publishing..." : <><FaPlay /> Go Live</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
