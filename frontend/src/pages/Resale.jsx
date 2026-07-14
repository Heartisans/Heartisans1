import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useScrollToTop } from '../hooks/useScrollToTop';

export const Resale = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pricePrediction, setPricePrediction] = useState(null);
  const [isPredictingPrice, setIsPredictingPrice] = useState(false);
  const [showPricingInsights, setShowPricingInsights] = useState(false);
  const [sapAiSuggestion, setSapAiSuggestion] = useState(null);
  const [sapAiLoading, setSapAiLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [resaleForm, setResaleForm] = useState({
    productName: '',
    category: '',
    condition: '',
    originalPrice: '',
    description: '',
    material: '',
    weight: '',
    color: '',
    images: []
  });

  useScrollToTop();

  const qualityCategories = [
    {
      id: 'with-tag',
      title: 'With Tag - Just Like New',
      description: 'Original tags intact, pristine condition, no wear signs',
      priceMultiplier: 0.85, // 10-15% less than original
      icon: '🏷️',
      color: 'bg-green-500',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    {
      id: 'without-tag',
      title: 'Without Tag - Good to Fair',
      description: 'Excellent condition, minimal wear, well maintained',
      priceMultiplier: 0.65, // 30-35% less than original
      icon: '✨',
      color: 'bg-orange-500',
      bgGradient: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800'
    },
    {
      id: 'lesser-quality',
      title: 'Lesser Quality',
      description: 'Visible wear, some flaws, but still functional and beautiful',
      priceMultiplier: 0.45, // 50-55% less than original
      icon: '🔄',
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    }
  ];

  const categories = [
    'Art', 'Pottery', 'Fashion', 'Crafts', 'Crochet', 'Accessories',
    'Jewelry', 'Textiles', 'Woodwork', 'Metalwork', 'Paintings', 'Sculptures'
  ];

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.id);
    setResaleForm({ ...resaleForm, condition: category.id });
  };

  const calculateEstimatedPrice = (originalPrice, condition) => {
    if (!originalPrice || !condition) return 0;
    const category = qualityCategories.find(cat => cat.id === condition);
    return Math.round(originalPrice * category.priceMultiplier);
  };

  const generateSAPPricePrediction = async () => {
    if (!resaleForm.productName || !resaleForm.category || !resaleForm.material || !resaleForm.weight || !resaleForm.color || !resaleForm.originalPrice || !selectedCategory) {
      alert("Please fill in all required fields (product name, category, material, weight, color, original price, and condition) first");
      return;
    }

    setIsPredictingPrice(true);
    
    try {
      const response = await axios.post("http://localhost:5000/api/predict-price", {
        productName: resaleForm.productName,
        productDescription: resaleForm.description,
        productMaterial: resaleForm.material,
        productWeight: resaleForm.weight,
        productColor: resaleForm.color
      });

      if (response.data.success) {
        const predictionData = response.data.data;
        setPricePrediction({
          base_price: predictionData.suggestedPrice,
          ceiling_price: predictionData.priceRange?.max || predictionData.suggestedPrice * 1.5
        });
        setShowPricingInsights(true);
      } else {
        throw new Error(response.data.error || 'Failed to generate price prediction');
      }
    } catch (error) {
      console.error('SAP AI Price prediction error:', error);
      alert("Failed to generate price prediction. Please try again.");
    } finally {
      setIsPredictingPrice(false);
    }
  };

  // Generate SAP AI product description
  const generateSAPAIDescription = async () => {
    if (!resaleForm.productName || !resaleForm.category || !resaleForm.material || !resaleForm.weight || !resaleForm.color || !resaleForm.originalPrice || !selectedCategory) {
      alert("Please fill in all required fields (product name, category, material, weight, color, original price, and condition) first");
      return;
    }

    setSapAiLoading(true);
    
    try {
      const response = await axios.post("http://localhost:5000/api/generate-description", {
        productName: resaleForm.productName,
        productCategory: resaleForm.category,
        productState: "India",
        listingType: "resale"
      });

      if (response.data.success) {
        setSapAiSuggestion({ description: response.data.description });
        alert("SAP AI description generated! Review and apply if suitable.");
      } else {
        throw new Error('Failed to generate SAP AI description');
      }
    } catch (error) {
      console.error('SAP AI Description Error:', error);
      alert("Failed to generate SAP AI description. Please try again.");
    } finally {
      setSapAiLoading(false);
    }
  };

  const useSAPAISuggestion = () => {
    if (sapAiSuggestion?.description) {
      setResaleForm({ ...resaleForm, description: sapAiSuggestion.description });
      setSapAiSuggestion(null);
      alert("SAP AI description applied! Enterprise-grade content is now active.");
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + selectedImages.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));
    
    setImagePreview(prev => [...prev, ...newPreviews]);
    setResaleForm({ ...resaleForm, images: [...resaleForm.images, ...files] });
  };

  const removeImage = (indexToRemove) => {
    const updatedImages = selectedImages.filter((_, index) => index !== indexToRemove);
    const updatedPreviews = imagePreview.filter((_, index) => index !== indexToRemove);
    
    // Revoke URL to prevent memory leaks
    if (imagePreview[indexToRemove]) {
      URL.revokeObjectURL(imagePreview[indexToRemove].url);
    }
    
    setSelectedImages(updatedImages);
    setImagePreview(updatedPreviews);
    setResaleForm({ ...resaleForm, images: updatedImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory || !resaleForm.productName || !resaleForm.category || !resaleForm.originalPrice || selectedImages.length === 0) {
      alert('Please fill in all required fields and upload at least one image');
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields
      formData.append('productName', resaleForm.productName);
      formData.append('category', resaleForm.category);
      formData.append('description', resaleForm.description || '');
      formData.append('originalPrice', resaleForm.originalPrice);
      formData.append('condition', selectedCategory);
      
      // Add SAP analytics data if available
      if (pricePrediction) {
        formData.append('sapAnalytics', JSON.stringify({
          pricePrediction: pricePrediction,
          aiVersion: 'SAP Business AI v3.0',
          timestamp: new Date().toISOString()
        }));
      }
      
      // Add images
      selectedImages.forEach((image, index) => {
        formData.append('images', image);
      });

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to create a resale listing');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/resale', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Resale listing created successfully!');
        
        // Reset form
        setResaleForm({
          productName: '',
          category: '',
          condition: '',
          originalPrice: '',
          description: '',
          images: []
        });
        setSelectedCategory('');
        setSelectedImages([]);
        setImagePreview([]);
        setPricePrediction(null);
        setShowPricingInsights(false);
        setSapAiSuggestion(null);
        
        console.log('Resale listing created:', response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Create listing error:', error);
      alert(`Failed to create resale listing: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <>
      <section className="min-h-screen font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
        <div className="w-full h-[10vh]"></div>
        
        {/* Hero Section */}
        <div className="text-center py-8 md:py-12 px-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 font-mhlk" style={{ color: '#479626' }}>
            Resale Marketplace
          </h1>
          <p className="text-lg md:text-2xl lg:text-3xl max-w-3xl mx-auto leading-relaxed" style={{ color: '#479626' }}>
            Give your handcrafted treasures a new life with AI-powered pricing intelligence
          </p>
        </div>

        {/* Content Container */}
        <div className="w-full px-4 md:px-6 lg:px-8 py-8">
          {/* Quality Categories Section */}
          <div className="mb-12">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>
                Choose Your Product Condition
              </h2>
              <p className="text-lg md:text-xl" style={{ color: '#479626' }}>
                Select the condition that best describes your item
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {qualityCategories.map((category) => (
                <div
                  key={category.id}
                  className={`relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                    selectedCategory === category.id 
                      ? 'ring-4 shadow-2xl scale-105' 
                      : 'hover:shadow-lg'
                  }`}
                  style={{
                    ringColor: selectedCategory === category.id ? '#479626' : 'transparent'
                  }}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className={`bg-white border-2 rounded-2xl p-6 h-full shadow-lg ${
                    selectedCategory === category.id ? 'border-2' : 'border-gray-200'
                  }`}
                  style={{
                    borderColor: selectedCategory === category.id ? '#479626' : undefined
                  }}>
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-3">{category.icon}</div>
                      <h3 className="text-xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>
                        {category.title}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <span className="text-sm font-semibold" style={{ color: '#479626' }}>
                        Expected Price: {Math.round(category.priceMultiplier * 100)}% of original
                      </span>
                    </div>

                    {resaleForm.originalPrice && selectedCategory === category.id && (
                      <div className="mt-3 bg-white rounded-lg p-3 text-center border-2" style={{ borderColor: '#479626', backgroundColor: '#f0f9f0' }}>
                        <span className="text-lg font-bold" style={{ color: '#479626' }}>
                          Estimated: ₹{calculateEstimatedPrice(resaleForm.originalPrice, category.id).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resale Form */}
          <div className="w-full">
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mx-auto max-w-4xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>
                  List Your Item for Resale
                </h2>
                <p className="text-lg" style={{ color: '#479626' }}>
                  Fill in the details below to list your handcrafted item
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={resaleForm.productName}
                      onChange={(e) => setResaleForm({ ...resaleForm, productName: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="Enter your product name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Category *
                    </label>
                    <select
                      value={resaleForm.category}
                      onChange={(e) => setResaleForm({ ...resaleForm, category: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Material *
                    </label>
                    <input
                      type="text"
                      value={resaleForm.material}
                      onChange={(e) => setResaleForm({ ...resaleForm, material: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="e.g., Wood, Clay, Cotton"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Weight (grams) *
                    </label>
                    <input
                      type="number"
                      value={resaleForm.weight}
                      onChange={(e) => setResaleForm({ ...resaleForm, weight: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="Enter weight in grams"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Primary Color *
                    </label>
                    <input
                      type="text"
                      value={resaleForm.color}
                      onChange={(e) => setResaleForm({ ...resaleForm, color: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="e.g., Brown, Blue, Multicolor"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Original Purchase Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={resaleForm.originalPrice}
                      onChange={(e) => setResaleForm({ ...resaleForm, originalPrice: e.target.value })}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="Enter original price"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                      Condition Selected
                    </label>
                    <div className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg bg-gray-50">
                      {selectedCategory ? (
                        <span style={{ color: '#479626' }}>
                          {qualityCategories.find(cat => cat.id === selectedCategory)?.title || 'None selected'}
                        </span>
                      ) : (
                        <span className="text-gray-400">Please select a condition above</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2 font-mhlk" style={{ color: '#479626' }}>
                    Product Description
                  </label>
                  <div className="space-y-3">
                    <textarea
                      value={resaleForm.description}
                      onChange={(e) => setResaleForm({ ...resaleForm, description: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg transition-colors"
                      style={{
                        focusRingColor: '#479626',
                        focusBorderColor: '#479626'
                      }}
                      placeholder="Describe your item's current condition, any flaws, history, etc."
                    />
                    
                    {/* SAP AI Description Generator */}
                    <div className="rounded-lg p-4 border-2" style={{ backgroundColor: '#f0f9f0', borderColor: '#479626' }}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold flex items-center font-mhlk" style={{ color: '#479626' }}>
                          <span className="mr-2">🤖</span>
                          SAP AI Description Generator
                        </h4>
                        <button
                          type="button"
                          onClick={generateSAPAIDescription}
                          disabled={sapAiLoading || !resaleForm.productName || !resaleForm.category || !resaleForm.material || !resaleForm.weight || !resaleForm.color || !resaleForm.originalPrice || !selectedCategory}
                          className="text-white px-4 py-2 rounded-md text-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mhlk"
                          style={{ backgroundColor: '#479626' }}
                        >
                          {sapAiLoading ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating...
                            </span>
                          ) : (
                            'Generate Description'
                          )}
                        </button>
                      </div>
                      <p className="text-blue-700 text-lg">
                        Let SAP AI create a professional description for your resale item
                      </p>
                    </div>

                    {/* SAP AI Suggestion Display */}
                    {sapAiSuggestion && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-green-800 text-sm">SAP AI Generated Description</h4>
                          <button
                            type="button"
                            onClick={useSAPAISuggestion}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            Use This Description
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {sapAiSuggestion.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Images (Max 5 images) *
                  </label>
                  
                  <div className="space-y-4">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={selectedImages.length >= 5}
                      />
                      <label 
                        htmlFor="image-upload" 
                        className={`cursor-pointer flex flex-col items-center ${
                          selectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-gray-600 font-medium">
                          {selectedImages.length >= 5 
                            ? 'Maximum 5 images reached' 
                            : 'Click to upload images or drag and drop'
                          }
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          PNG, JPG, JPEG up to 10MB each
                        </p>
                      </label>
                    </div>

                    {/* Image Preview Grid */}
                    {imagePreview.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {imagePreview.map((preview, index) => (
                          <div key={preview.id} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                              <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedImages.length > 0 && (
                      <p className="text-sm text-green-600 flex items-center">
                        <span className="mr-2">✅</span>
                        {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </div>

                {/* SAP AI Price Prediction */}
                <div className="rounded-xl p-6 border-2" style={{ backgroundColor: '#f0f9f0', borderColor: '#479626' }}>
                  <h3 className="text-lg font-bold mb-3 flex items-center font-mhlk" style={{ color: '#479626' }}>
                    <span className="mr-2">🤖</span>
                    SAP AI Price Prediction
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#479626' }}>
                    Get enterprise-grade pricing intelligence powered by SAP Business AI
                  </p>
                  
                  <button
                    type="button"
                    onClick={generateSAPPricePrediction}
                    disabled={isPredictingPrice || !resaleForm.productName || !resaleForm.category || !resaleForm.material || !resaleForm.weight || !resaleForm.color || !resaleForm.originalPrice || !selectedCategory}
                    className="text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 font-mhlk"
                    style={{ backgroundColor: '#479626' }}
                  >
                    {isPredictingPrice ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing with SAP AI...
                      </span>
                    ) : (
                      'Generate AI Price Prediction'
                    )}
                  </button>
                </div>

                {/* Price Prediction Results */}
                {showPricingInsights && pricePrediction && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 relative overflow-hidden">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                      <span className="mr-2">📊</span>
                      AI Pricing Intelligence
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 relative z-10">
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                        <p className="text-gray-500 text-sm font-medium mb-1">Recommended Base Price</p>
                        <p className="text-3xl font-bold text-green-600">
                          ₹{pricePrediction.base_price?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Optimal starting point
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                        <p className="text-gray-500 text-sm font-medium mb-1">Expected Ceiling Price</p>
                        <p className="text-3xl font-bold text-purple-600">
                          ₹{pricePrediction.ceiling_price?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Projected final value
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <button
                    type="submit"
                    disabled={!selectedCategory || !resaleForm.productName || !resaleForm.category || !resaleForm.originalPrice || selectedImages.length === 0}
                    className="text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg font-mhlk"
                    style={{ backgroundColor: '#479626' }}
                  >
                    Create Resale Listing
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>
                Why Choose Our Platform
              </h2>
              <p className="text-lg md:text-xl" style={{ color: '#479626' }}>
                Trusted marketplace for handcrafted treasures
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="text-center group">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#f0f9f0' }}>
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>AI-Powered Pricing</h3>
                <p className="text-gray-600">Enterprise-grade SAP AI analyzes market trends to suggest optimal pricing for your items.</p>
              </div>
              
              <div className="text-center group">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#f0f9f0' }}>
                  <span className="text-3xl">🏷️</span>
                </div>
                <h3 className="text-xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>Quality-Based Categories</h3>
                <p className="text-gray-600">Transparent condition assessment ensures fair pricing and buyer confidence.</p>
              </div>
              
              <div className="text-center group">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#f0f9f0' }}>
                  <span className="text-3xl">🌟</span>
                </div>
                <h3 className="text-xl font-bold mb-2 font-mhlk" style={{ color: '#479626' }}>Trusted Marketplace</h3>
                <p className="text-gray-600">Safe, secure platform connecting artisan product lovers with authenticated sellers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};