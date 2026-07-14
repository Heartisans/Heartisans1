import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useNavigate } from "react-router-dom";

export const AdminAuctionForm = () => {
  const { user, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    productName: "",
    productDescription: "",
    productImage: null,
    productMaterial: "",
    productWeight: "",
    productColor: "",
    basePrice: "",
    startTime: "",
    duration: "", 
  });
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  useScrollToTop();

  // Redirect non-admins
  useEffect(() => {
    if (isLoaded && (!user || !user.isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isLoaded, navigate]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setForm({ ...form, productImage: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const generateAIDescription = async () => {
    const productName = form.productName?.trim();
    const productMaterial = form.productMaterial?.trim();
    const productWeight = form.productWeight?.trim();
    
    if (!productName || !productMaterial || !productWeight) {
      setMsg("Please enter product name, material, and weight first.");
      return;
    }

    setAiLoading(true);
    setMsg("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/generate-description", {
        productName: form.productName,
        productCategory: "Auction Item",
        productState: "India",
        productMaterial: form.productMaterial,
        productWeight: form.productWeight,
        productColor: form.productColor,
        additionalInfo: `Auction item. ${form.productDescription}`
      });

      if (response.data.success) {
        setAiSuggestion(response.data.description);
        setMsg("AI description generated! You can edit it before using.");
      } else {
        throw new Error('Failed to generate description');
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      if (error.response?.data?.fallbackDescription) {
        setAiSuggestion(error.response.data.fallbackDescription);
        setMsg("Generated a basic description. AI service temporarily unavailable.");
      } else {
        setMsg("Failed to generate AI description. Please try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const useAISuggestion = () => {
    setForm({ ...form, productDescription: aiSuggestion });
    setAiSuggestion("");
    setMsg("AI description applied! You can edit it further if needed.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      // 1. Get Cloudinary signature from backend
      const sigRes = await axios.get("http://localhost:5000/api/cloudinary/cloudinary-signature");
      const { signature, timestamp, apiKey, cloudName } = sigRes.data;

      // 2. Upload image to Cloudinary
      let imageUrl = "";
      if (form.productImage) {
        const data = new FormData();
        data.append("file", form.productImage);
        data.append("api_key", apiKey);
        data.append("timestamp", timestamp);
        data.append("signature", signature);

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          data
        );
        imageUrl = res.data.secure_url;
      }

      // 3. Send direct auction creation data to backend
      const payload = {
        sellerId: user._id,
        sellerName: user.fullName || user.name || "Admin",
        productName: form.productName,
        productDescription: form.productDescription,
        productImageUrl: imageUrl,
        productMaterial: form.productMaterial,
        productWeight: form.productWeight,
        productColor: form.productColor,
        basePrice: Number(form.basePrice),
        startTime: new Date(form.startTime),
        duration: Number(form.duration), 
        hasBegun: false,
        hasEnded: false
      };
      
      await axios.post("http://localhost:5000/api/auctions", payload);
      setMsg("Live Auction successfully started!");
      
      setTimeout(() => navigate('/admin'), 2000);
      
    } catch (err) {
      setMsg("Failed to start auction. Please ensure all required fields are filled correctly.");
    }
    setLoading(false);
  };

  if (!isLoaded || !user?.isAdmin) return null;

  return (
    <>
      <section className="min-h-screen py-20 bg-gradient-to-br from-purple-50 to-indigo-50 border-t border-purple-100">
        <div className="w-full h-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-4 flex-wrap">
              Direct Start Auction <span className="text-sm sm:text-base bg-purple-600 text-white px-4 py-1.5 rounded-full align-middle whitespace-nowrap">Admin</span>
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 max-w-3xl mx-auto">
              Bypass the request pipeline and directly spawn a live auction onto the platform.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    placeholder="Enter your product name"
                    value={form.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl transition-all duration-300 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="basePrice"
                    value={form.basePrice}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="e.g. 500"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg"
                  />
                </div>
              </div>

              {/* Timing details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="e.g. 60"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg"
                  />
                </div>
              </div>

              {/* Product Image */}
              <div className="space-y-2">
                <label className="block text-base sm:text-lg font-medium text-gray-700">
                  Product Image *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="productImage"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 text-lg"
                  />
                </div>
              </div>

              {/* Product Description */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">
                    Product Description *
                  </label>
                  <button
                    type="button"
                    onClick={generateAIDescription}
                    disabled={aiLoading || !form.productName.trim()}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50"
                  >
                    {aiLoading ? "Generating..." : "🤖 Quick AI"}
                  </button>
                </div>
                
                <textarea
                  name="productDescription"
                  placeholder="Describe your product, its features, and craftsmanship..."
                  value={form.productDescription}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none text-lg"
                />
                
                {aiSuggestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-blue-800">🤖 AI Suggestion</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={useAISuggestion} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Use</button>
                        <button type="button" onClick={() => setAiSuggestion("")} className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Dismiss</button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{aiSuggestion}</p>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">Material *</label>
                  <input type="text" name="productMaterial" placeholder="e.g., Silk, Teak Wood" value={form.productMaterial} onChange={handleChange} required className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-lg" />
                </div>
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">Weight (grams)</label>
                  <input type="text" name="productWeight" placeholder="Enter weight in grams" value={form.productWeight} onChange={handleChange} className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-lg" />
                </div>
                <div className="space-y-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700">Color</label>
                  <input type="text" name="productColor" placeholder="e.g., Crimson Red" value={form.productColor} onChange={handleChange} className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-lg" />
                </div>
              </div>

              {/* Messages */}
              {msg && (
                <div className={`p-4 rounded-xl ${msg.includes('successfully') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {msg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 px-6 rounded-xl text-white font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-70 flex justify-center items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800"
              >
                {loading ? "Starting Auction..." : "Start Auction Now"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};
