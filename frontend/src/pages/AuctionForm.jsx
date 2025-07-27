import { useState } from "react";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";

export const AuctionForm = () => {
  const { user } = useUser();
  const [mongoUserId, setMongoUserId] = useState("");
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
  const [sapAiLoading, setSapAiLoading] = useState(false);
  const [sapAiSuggestion, setSapAiSuggestion] = useState(null);
  const [pricePrediction, setPricePrediction] = useState(null);
  const [isPredictingPrice, setIsPredictingPrice] = useState(false);
  const [showPricingInsights, setShowPricingInsights] = useState(false);

  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      axios.get(`http://localhost:5000/api/user/email/${user.emailAddresses[0].emailAddress}`)
        .then(res => setMongoUserId(res.data._id))
        .catch(() => setMongoUserId(""));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setForm({ ...form, productImage: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const generateAIDescription = async () => {
    if (!form.productName.trim()) {
      setMsg("Please enter a product name first");
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
        additionalInfo: `Auction item with base price ${form.basePrice}. ${form.productDescription}`
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

  // Generate SAP AI content for auction items
  const generateSAPAIDescription = async () => {
    if (!form.productName.trim()) {
      setMsg("Please enter a product name first");
      return;
    }

    setSapAiLoading(true);
    setMsg("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/generate-sap-description", {
        productName: form.productName,
        productCategory: "Auction Item",
        productState: "India",
        productMaterial: form.productMaterial,
        productWeight: form.productWeight,
        productColor: form.productColor,
        listingType: "auction",
        basePrice: form.basePrice,
        additionalInfo: `Auction item with base price ${form.basePrice}. Duration: ${form.duration}. ${form.productDescription}`
      });

      if (response.data.success) {
        setSapAiSuggestion(response.data.data);
        setMsg("SAP AI content generated with enterprise analytics!");
      } else {
        throw new Error('Failed to generate SAP AI content');
      }
    } catch (error) {
      console.error('SAP AI Generation Error:', error);
      setMsg("Failed to generate SAP AI content. Please try again.");
    } finally {
      setSapAiLoading(false);
    }
  };

  const useSAPAISuggestion = () => {
    if (sapAiSuggestion?.description) {
      setForm({ ...form, productDescription: sapAiSuggestion.description });
      setSapAiSuggestion(null);
      setMsg("SAP AI description applied! Enterprise-grade content is now active.");
    }
  };

  // Generate SAP AI price prediction for auction base price
  const generateSAPPricePrediction = async () => {
    if (!form.productName) {
      setMsg("Please fill in product name first");
      return;
    }

    setIsPredictingPrice(true);
    setMsg("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/predict-price", {
        productName: form.productName,
        productCategory: "Auction Item",
        productMaterial: form.productMaterial,
        productWeight: form.productWeight,
        productColor: form.productColor,
        isHandmade: true,
        region: "India"
      });

      if (response.data.success) {
        setPricePrediction(response.data.data);
        setShowPricingInsights(true);
        
        // Suggest base price as 70% of recommended price for auction
        const suggestedBasePrice = Math.round(response.data.data.suggestedPrice * 0.7);
        setForm(prev => ({ 
          ...prev, 
          basePrice: suggestedBasePrice.toString() 
        }));
        
        setMsg("SAP AI auction pricing generated! Base price set to 70% of market value.");
      } else {
        throw new Error(response.data.error || 'Failed to generate price prediction');
      }
    } catch (error) {
      console.error('SAP AI Price prediction error:', error);
      setMsg("Failed to generate SAP AI price prediction. Please try again.");
    } finally {
      setIsPredictingPrice(false);
    }
  };

  const useSAPPrice = (price, percentage = 0.7) => {
    const adjustedPrice = Math.round(price * percentage);
    setForm({ ...form, basePrice: adjustedPrice.toString() });
    setMsg(`SAP AI suggested base price applied! (${Math.round(percentage * 100)}% of market value)`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      // 1. Get Cloudinary signature from backend
      const sigRes = await axios.get("http://localhost:5000/api/cloudinary-signature");
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

      // 3. Send auction data to backend
      const payload = {
        productName: form.productName,
        productDescription: form.productDescription,
        productImageUrl: imageUrl,
        productMaterial: form.productMaterial,
        productWeight: form.productWeight,
        productColor: form.productColor,
        sellerId: mongoUserId,
        sellerName: user?.fullName,
        basePrice: Number(form.basePrice),
        startTime: new Date(form.startTime),
        duration: Number(form.duration), // in seconds or minutes
      };
      await axios.post("http://localhost:5000/api/auctions", payload);
      setMsg("Auction created successfully!");
      setForm({
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
    } catch (err) {
      setMsg("Failed to create auction.");
    }
    setLoading(false);
  };

  return (
    <>
      <section>
        <div>
          <div className="w-full h-[10vh]"></div>
          <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Start an Auction</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="productName"
                placeholder="Product Name"
                value={form.productName}
                onChange={handleChange}
                required
                className="input input-bordered"
              />
              
              {/* AI-Enhanced Product Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Product Description</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={generateAIDescription}
                      disabled={aiLoading || !form.productName.trim()}
                      className="btn btn-sm btn-outline btn-secondary"
                    >
                      {aiLoading ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          🤖 Quick AI
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={generateSAPAIDescription}
                      disabled={sapAiLoading || !form.productName.trim()}
                      className="btn btn-sm btn-outline btn-accent"
                    >
                      {sapAiLoading ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          SAP AI...
                        </>
                      ) : (
                        <>
                          🧠 SAP AI Pro
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <textarea
                  name="productDescription"
                  placeholder="Enter product description or use AI to generate one..."
                  value={form.productDescription}
                  onChange={handleChange}
                  required
                  className="textarea textarea-bordered min-h-[120px]"
                />
                
                {/* Quick AI Suggestion Display */}
                {aiSuggestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-blue-800">
                        🤖 Quick AI Generated Description
                      </h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={useAISuggestion}
                          className="btn btn-xs btn-primary"
                        >
                          Use This
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiSuggestion("")}
                          className="btn btn-xs btn-ghost"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {aiSuggestion}
                    </p>
                  </div>
                )}

                {/* SAP AI Content Generation Display */}
                {sapAiSuggestion && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-600 text-white p-2 rounded-lg">
                          🏆
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-orange-900">SAP AI Auction Content</h4>
                          <p className="text-xs text-orange-600">Enterprise auction intelligence</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={useSAPAISuggestion}
                          className="btn btn-xs btn-primary"
                        >
                          ✓ Use SAP Content
                        </button>
                        <button
                          type="button"
                          onClick={() => setSapAiSuggestion(null)}
                          className="btn btn-xs btn-ghost"
                        >
                          ✕ Dismiss
                        </button>
                      </div>
                    </div>

                    {/* Generated Description */}
                    <div className="bg-white rounded-lg p-4 border-l-4 border-orange-400">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {sapAiSuggestion.description}
                      </p>
                    </div>

                    {/* Auction-Specific SAP Analytics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg border">
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Auction Appeal</h5>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${sapAiSuggestion.sapContentMetrics?.auctionAppeal || 89}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{sapAiSuggestion.sapContentMetrics?.auctionAppeal || 89}/100</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border">
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Bidding Potential</h5>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${sapAiSuggestion.sapContentMetrics?.biddingPotential || 92}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{sapAiSuggestion.sapContentMetrics?.biddingPotential || 92}/100</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border">
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Urgency Factor</h5>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${sapAiSuggestion.sapContentMetrics?.urgencyFactor || 85}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{sapAiSuggestion.sapContentMetrics?.urgencyFactor || 85}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* SAP Metadata */}
                    <div className="text-xs text-orange-600 flex items-center justify-between pt-2 border-t border-orange-200">
                      <span>🕒 {new Date(sapAiSuggestion.timestamp).toLocaleString()}</span>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        <span className="font-medium">{sapAiSuggestion.sapVersion}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <input
                type="file"
                name="productImage"
                accept=".jpg,.jpeg,.png"
                onChange={handleChange}
                required
                className="file-input file-input-bordered"
              />
              <input
                type="text"
                name="productMaterial"
                placeholder="Product Material"
                value={form.productMaterial}
                onChange={handleChange}
                className="input input-bordered"
              />
              <input
                type="text"
                name="productWeight"
                placeholder="Product Weight"
                value={form.productWeight}
                onChange={handleChange}
                className="input input-bordered"
              />
              <input
                type="text"
                name="productColor"
                placeholder="Product Color"
                value={form.productColor}
                onChange={handleChange}
                className="input input-bordered"
              />
              
              {/* SAP AI Base Price Prediction Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Base Price (₹)</label>
                  <button
                    type="button"
                    onClick={generateSAPPricePrediction}
                    disabled={isPredictingPrice || !form.productName.trim()}
                    className="btn btn-sm btn-outline btn-accent"
                  >
                    {isPredictingPrice ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        SAP AI Analyzing...
                      </>
                    ) : (
                      <>
                        🧠 SAP AI Base Price
                      </>
                    )}
                  </button>
                </div>
                
                <input
                  type="number"
                  name="basePrice"
                  placeholder="Base Price for Auction"
                  value={form.basePrice}
                  onChange={handleChange}
                  required
                  className="input input-bordered"
                />
                
                {/* SAP AI Auction Pricing Insights */}
                {pricePrediction && showPricingInsights && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-600 text-white p-3 rounded-lg">
                          🎯
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-purple-900">SAP AI Auction Intelligence</h3>
                          <p className="text-sm text-purple-600">Optimized for auction dynamics</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPricingInsights(false)}
                        className="btn btn-ghost btn-sm"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Auction-specific metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Market Value */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">Market Value</h4>
                        <p className="text-xl font-bold text-green-600">₹{pricePrediction.suggestedPrice?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">SAP AI Estimate</p>
                      </div>

                      {/* Suggested Base Price */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">Auction Base Price</h4>
                        <p className="text-xl font-bold text-purple-600">₹{Math.round(pricePrediction.suggestedPrice * 0.7)?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">70% of market value</p>
                        <button
                          type="button"
                          onClick={() => useSAPPrice(pricePrediction.suggestedPrice, 0.7)}
                          className="btn btn-xs btn-primary mt-2"
                        >
                          Use This Base
                        </button>
                      </div>

                      {/* Expected Final Price */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">Expected Final Price</h4>
                        <p className="text-xl font-bold text-blue-600">₹{Math.round(pricePrediction.suggestedPrice * 1.2)?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">120% of market value</p>
                      </div>
                    </div>

                    {/* Auction Strategy Options */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm mb-4">
                      <h4 className="font-semibold mb-3 text-purple-800">🎯 SAP AI Auction Strategies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => useSAPPrice(pricePrediction.suggestedPrice, 0.6)}
                          className="btn btn-outline btn-sm"
                        >
                          <div className="text-left">
                            <div className="font-medium">Aggressive Start</div>
                            <div className="text-xs">60% base (₹{Math.round(pricePrediction.suggestedPrice * 0.6)?.toLocaleString()})</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => useSAPPrice(pricePrediction.suggestedPrice, 0.7)}
                          className="btn btn-outline btn-sm btn-primary"
                        >
                          <div className="text-left">
                            <div className="font-medium">Balanced Start</div>
                            <div className="text-xs">70% base (₹{Math.round(pricePrediction.suggestedPrice * 0.7)?.toLocaleString()})</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => useSAPPrice(pricePrediction.suggestedPrice, 0.8)}
                          className="btn btn-outline btn-sm"
                        >
                          <div className="text-left">
                            <div className="font-medium">Conservative Start</div>
                            <div className="text-xs">80% base (₹{Math.round(pricePrediction.suggestedPrice * 0.8)?.toLocaleString()})</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* SAP Auction Insights */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h4 className="font-semibold mb-2 text-purple-800">📊 SAP Auction Analytics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Bidding Activity Forecast</h5>
                          {pricePrediction.sapBusinessInsights?.demandForecast && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                                  style={{ width: `${pricePrediction.sapBusinessInsights.demandForecast.score}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{pricePrediction.sapBusinessInsights.demandForecast.score}/100</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Competition Level</h5>
                          <span className="badge badge-secondary">
                            {pricePrediction.sapBusinessInsights?.competitiveAnalysis?.competitorCount || 15} competitors expected
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SAP Metadata */}
                    <div className="mt-4 pt-4 border-t border-purple-200 text-xs text-purple-600 flex items-center justify-between">
                      <span>🕒 {new Date(pricePrediction.timestamp).toLocaleString()}</span>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                        <span className="font-medium">{pricePrediction.sapVersion}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <label>
                Auction Start Time:
                <input
                  type="datetime-local"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                  className="input input-bordered"
                />
              </label>
              <input
                type="number"
                name="duration"
                placeholder="Duration (minutes)"
                value={form.duration}
                onChange={handleChange}
                required
                className="input input-bordered"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit"}
              </button>
              {msg && <div className="text-center mt-2">{msg}</div>}
            </form>
          </div>
        </div>
      </section>
    </>
  );
};