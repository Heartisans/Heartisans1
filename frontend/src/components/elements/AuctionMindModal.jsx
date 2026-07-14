import { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { FaRobot, FaTimes, FaCheck, FaExclamationTriangle } from "react-icons/fa";

export const AuctionMindModal = ({ isOpen, onClose, request, onApprove }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (request) {
      setAdminNotes(request.adminNotes || "");
      setPrediction(null);
      setError("");
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handlePredict = async () => {
    setLoading(true);
    setError("");
    setPrediction(null);
    try {
      // Call the Node.js API which invokes the local python script
      const res = await axios.post("http://localhost:5000/api/predict-price", {
        productName: request.productName,
        productDescription: request.productDescription,
        productMaterial: request.productMaterial || "",
        productWeight: request.productWeight || "",
        productColor: request.productColor || ""
      });
      
      const predictionData = res.data.data;
      setPrediction({
        base_price: predictionData.suggestedPrice,
        ceiling_price: predictionData.priceRange?.max || predictionData.suggestedPrice * 1.5
      });
    } catch (err) {
      console.error(err);
      setError("Failed to connect to AuctionMind AI engine. Is the Python API running?");
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    try {
      if (!prediction) return;
      
      await axios.put(`http://localhost:5000/api/auction-requests/${request._id}/status`, {
        status: "Date Accepted",
        predictedBasePrice: prediction.base_price,
        predictedCeilingPrice: prediction.ceiling_price,
        adminNotes
      });
      
      onApprove(request._id, { ...prediction, status: "Date Accepted", adminNotes });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to approve request");
    }
  };

  const handleReject = async () => {
    try {
      await axios.put(`http://localhost:5000/api/auction-requests/${request._id}/status`, {
        status: "Rejected",
        adminNotes
      });
      
      onApprove(request._id, { status: "Rejected", adminNotes });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to reject request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden border border-purple-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <FaRobot className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AuctionMind AI Pricing</h2>
              <p className="text-purple-200 text-sm opacity-90">Verify & predict optimal auction values</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg transition-colors hover:bg-white/10"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto">
          
          {/* Request Details */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col md:flex-row gap-8">
            <img 
              src={request.productImageUrl} 
              alt={request.productName}
              className="w-full md:w-56 h-56 object-cover rounded-xl shadow-md border border-gray-300 shrink-0"
            />
            <div className="flex-1 flex flex-col">
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{request.productName}</h3>
              <p className="text-sm font-bold text-purple-600 mb-4 bg-purple-100 inline-block px-3 py-1 rounded-full w-fit border border-purple-200">
                Artisan: {request.userName}
              </p>
              
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {request.productDescription || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider block mb-1">Material</span> 
                  <span className="text-gray-900 font-medium">{request.productMaterial || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider block mb-1">Weight</span> 
                  <span className="text-gray-900 font-medium">{request.productWeight ? `${request.productWeight}g` : "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider block mb-1">Color</span> 
                  <span className="text-gray-900 font-medium">{request.productColor || "N/A"}</span>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-3 mt-1 border-t border-gray-100 flex items-center gap-3">
                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider">Verification Date</span>
                  <span className="text-purple-700 bg-purple-50 px-3 py-1 rounded-md text-sm font-bold border border-purple-100">
                    {new Date(request.offlineVerificationDate).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Remarks */}
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <label className="block text-gray-700 font-bold mb-2">Admin Remarks (Optional)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              rows="3"
              placeholder="Add your remarks or reasons for rejection/approval here..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            ></textarea>
          </div>

          {/* AI Controls */}
          {!prediction && !loading && (
            <div className="text-center py-8">
              <button
                onClick={handlePredict}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:-translate-y-1 text-lg flex items-center justify-center gap-3 mx-auto"
              >
                <FaRobot /> Generate AI Price Prediction
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
              <p className="text-purple-800 font-medium text-lg">AuctionMind is analyzing market trends...</p>
              <p className="text-gray-500 text-sm mt-2">Evaluating material, craftsmanship, and demand</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3">
              <FaExclamationTriangle className="text-red-500 mt-1 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Prediction Results */}
          {prediction && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <FaRobot size={100} />
                </div>
                
                <h4 className="text-purple-900 font-bold text-lg mb-6 flex items-center gap-2">
                  <FaCheck className="text-green-500" /> Analysis Complete
                </h4>
                
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <p className="text-gray-500 text-sm font-medium mb-1">Recommended Base Price</p>
                    <p className="text-3xl font-bold text-green-600">₹{prediction.base_price.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-2">Optimal starting point</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <p className="text-gray-500 text-sm font-medium mb-1">Expected Ceiling Price</p>
                    <p className="text-3xl font-bold text-purple-600">₹{prediction.ceiling_price.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-2">Projected final bid</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center shrink-0">
          <button
            onClick={handleReject}
            className="px-6 py-3 rounded-xl font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            Reject Request
          </button>
          <div className="flex gap-4">
            {prediction && (
              <>
                <button
                  onClick={() => setPrediction(null)}
                  className="px-6 py-3 rounded-xl font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Recalculate
                </button>
                <button
                  onClick={handleApprove}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <FaCheck /> Approve Request
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
