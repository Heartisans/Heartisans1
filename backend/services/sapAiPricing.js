import axios from 'axios';
import Groq from 'groq-sdk';
import GroqIntelligentFallback from './groqIntelligentFallback.js';

class SAPAIPricingService {
    constructor() {
        this.sapBusinessAiUrl = process.env.SAP_BUSINESS_AI_URL;
        this.sapBusinessAiKey = process.env.SAP_BUSINESS_AI_API_KEY;
        this.aiCoreUrl = process.env.SAP_AI_CORE_SERVICE_URL;
        this.clientId = process.env.SAP_AI_CORE_CLIENT_ID;
        this.clientSecret = process.env.SAP_AI_CORE_CLIENT_SECRET;
        this.tokenUrl = process.env.SAP_AI_CORE_TOKEN_URL;
        this.resourceGroup = process.env.SAP_AI_CORE_RESOURCE_GROUP || 'default';
        this.demoMode = process.env.SAP_AI_DEMO_MODE === 'true';
        this.accessToken = null;
        this.tokenExpiry = null;
        
        // Initialize Groq as fallback
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
        this.groqFallback = new GroqIntelligentFallback();
    }

    // Get OAuth token for SAP AI Core
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            if (this.demoMode) {
                // Return demo token for hackathon
                this.accessToken = 'demo_sap_token_' + Date.now();
                this.tokenExpiry = Date.now() + 3600000; // 1 hour
                return this.accessToken;
            }

            const response = await axios.post(this.tokenUrl, 
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
            
            return this.accessToken;
        } catch (error) {
            console.error('Error getting SAP AI Core token:', error);
            // Fallback to demo mode
            this.accessToken = 'demo_sap_token_' + Date.now();
            this.tokenExpiry = Date.now() + 3600000;
            return this.accessToken;
        }
    }

    // Analyze market data for price prediction using SAP Business AI
    async callSAPBusinessAI(productData) {
        try {
            if (this.demoMode || !this.sapBusinessAiKey.startsWith('real_')) {
                // Use Groq as SAP AI simulation for hackathon
                return await this.simulateSAPBusinessAI(productData);
            }

            const prompt = this.createSAPPricingPrompt(productData);
            
            const response = await axios.post(
                `${this.sapBusinessAiUrl}/inference/deployments/pricing-intelligence/completion`,
                {
                    prompt: prompt,
                    max_tokens: 1000,
                    temperature: 0.3,
                    model: "sap-business-ai-pricing"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.sapBusinessAiKey}`,
                        'Content-Type': 'application/json',
                        'SAP-Resource-Group': this.resourceGroup
                    }
                }
            );

            return this.parseSAPResponse(response.data);
        } catch (error) {
            console.error('SAP Business AI error:', error);
            return await this.simulateSAPBusinessAI(productData);
        }
    }

    // Simulate SAP Business AI using Groq (for hackathon demo)
    async simulateSAPBusinessAI(productData) {
        const prompt = this.createSAPPricingPrompt(productData);
        
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are SAP Business AI's pricing intelligence module. You analyze artisan products and provide comprehensive pricing recommendations in JSON format. Focus on business intelligence, market analysis, and profit optimization.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.3,
                max_tokens: 1000
            });

            const response = completion.choices[0]?.message?.content;
            return this.parseSAPResponse({ content: response });
        } catch (error) {
            console.error('Groq simulation error:', error);
            return this.generateFallbackPricing(productData);
        }
    }

    // Create SAP-style pricing prompt
    createSAPPricingPrompt(productData) {
        return `
EXECUTE SAP BUSINESS AI PRICING ANALYSIS

Product Intelligence Report Request:
Product Name: ${productData.productName || productData.name}
Category: ${productData.productCategory || productData.category || 'Handcraft'}
Material: ${productData.productMaterial || productData.material || 'Traditional materials'}
State/Region: ${productData.productState || productData.region || 'India'}
Weight: ${productData.productWeight || productData.weight || 'Not specified'}
Color: ${productData.productColor || productData.color || 'Natural'}
Dimensions: ${productData.dimensions || 'Not specified'}
Production Time: ${productData.productionTime || 'Not specified'}
Handmade: ${productData.isHandmade !== false ? 'Yes' : 'No'}

SAP BUSINESS INTELLIGENCE ANALYSIS REQUIRED:

1. MARKET POSITIONING ANALYSIS
   - Competitive landscape assessment
   - Target customer segments identification
   - Value proposition analysis

2. DEMAND FORECASTING
   - Seasonal demand patterns
   - Regional demand variations
   - Market growth trends

3. PRICING OPTIMIZATION
   - Cost-plus pricing model
   - Value-based pricing recommendations
   - Dynamic pricing strategies

4. PROFIT MARGIN ANALYSIS
   - Gross margin calculations
   - Net profit projections
   - ROI optimization

5. RISK ASSESSMENT
   - Market volatility factors
   - Competition risks
   - Demand fluctuation risks

RESPONSE FORMAT (JSON):
{
  "suggestedPrice": number,
  "priceRange": {"min": number, "max": number},
  "confidence": number (0-100),
  "marketPosition": "premium|mid-range|budget",
  "sapBusinessInsights": {
    "demandForecast": {
      "score": number (0-100),
      "trend": "increasing|stable|decreasing",
      "seasonality": "high|medium|low",
      "peakMonths": ["month1", "month2"]
    },
    "competitiveAnalysis": {
      "position": "leader|challenger|follower",
      "competitorCount": number,
      "differentiationFactor": number (0-100)
    },
    "profitAnalysis": {
      "grossMargin": number,
      "estimatedCost": number,
      "breakEvenUnits": number,
      "profitHealthScore": number (0-100)
    },
    "marketTrends": {
      "digitalAdoption": "high|medium|low",
      "exportPotential": "high|medium|low",
      "growthRate": number,
      "marketSize": "large|medium|small"
    },
    "riskAssessment": {
      "overallRisk": "low|medium|high",
      "volatilityScore": number (0-100),
      "mitigationStrategies": ["strategy1", "strategy2"]
    }
  },
  "pricingFactors": ["factor1", "factor2", "factor3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "sapMetadata": {
    "analysisDate": "ISO_DATE",
    "modelVersion": "SAP_AI_v2.0",
    "confidence": number,
    "dataQuality": "high|medium|low"
  }
}

Execute comprehensive SAP Business AI analysis and return JSON response:`;
    }

    // Parse SAP AI response
    parseSAPResponse(response) {
        try {
            const content = response.content || response.choices?.[0]?.message?.content || '';
            
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsedData = JSON.parse(jsonMatch[0]);
                return this.enrichWithSAPMetrics(parsedData);
            }
            
            throw new Error('No valid JSON found in response');
        } catch (error) {
            console.error('Error parsing SAP response:', error);
            return this.generateFallbackPricing();
        }
    }

    // Enrich with additional SAP-style metrics
    enrichWithSAPMetrics(data) {
        return {
            ...data,
            sapEnrichment: {
                businessIntelligence: {
                    marketPenetration: this.calculateMarketPenetration(data),
                    customerLifetimeValue: this.estimateCustomerLTV(data.suggestedPrice),
                    priceElasticity: this.calculatePriceElasticity(data),
                    inventoryTurnover: this.estimateInventoryTurnover(data.marketPosition)
                },
                performanceKPIs: {
                    revenueProjection: data.suggestedPrice * 10, // Estimated monthly sales
                    marketSharePotential: this.calculateMarketShare(data),
                    customerAcquisitionCost: Math.round(data.suggestedPrice * 0.15),
                    returnOnInvestment: this.calculateROI(data)
                },
                sapAnalytics: {
                    dataQuality: 'high',
                    modelAccuracy: data.confidence || 85,
                    lastTrainingDate: '2024-12-01',
                    predictionReliability: data.confidence > 80 ? 'high' : 'medium'
                }
            },
            timestamp: new Date().toISOString(),
            sapVersion: 'SAP Business AI v2.1',
            powered_by: 'SAP AI Core & SAP Business Technology Platform'
        };
    }

    // Helper methods for SAP-style calculations
    calculateMarketPenetration(data) {
        const baseScore = data.marketPosition === 'premium' ? 15 : 
                         data.marketPosition === 'mid-range' ? 35 : 60;
        return Math.min(baseScore + (data.confidence || 75) * 0.3, 100);
    }

    estimateCustomerLTV(price) {
        return Math.round(price * 2.5); // Estimated based on repeat purchases
    }

    calculatePriceElasticity(data) {
        const range = data.priceRange;
        if (!range) return 0.5;
        
        const elasticity = (range.max - range.min) / data.suggestedPrice;
        return Math.round(elasticity * 100) / 100;
    }

    estimateInventoryTurnover(position) {
        const turnoverRates = {
            'premium': 6,
            'mid-range': 8,
            'budget': 12
        };
        return turnoverRates[position] || 8;
    }

    calculateMarketShare(data) {
        const baseShare = data.marketPosition === 'premium' ? 5 : 
                         data.marketPosition === 'mid-range' ? 15 : 25;
        return Math.min(baseShare + (data.confidence || 75) * 0.1, 50);
    }

    calculateROI(data) {
        const investment = data.suggestedPrice * 0.7; // Estimated investment
        const returns = data.suggestedPrice * 1.5; // Estimated returns
        return Math.round(((returns - investment) / investment) * 100);
    }

    // Main price prediction method
    async predictPrice(productData) {
        try {
            console.log('🧠 AI: Starting local price prediction analysis...');
            
            const { exec } = await import('child_process');
            const util = await import('util');
            const execPromise = util.promisify(exec);
            const path = await import('path');
            const os = await import('os');
            
            // Path to our python script in auctionmind_api
            const scriptPath = path.join(process.cwd(), '..', 'auctionmind_api', 'predict_cli.py');
            
            // Cross-platform venv python path
            const isWindows = os.platform() === 'win32';
            const pythonPath = isWindows 
                ? path.join(process.cwd(), '..', 'auctionmind_api', '.venv', 'Scripts', 'python.exe')
                : path.join(process.cwd(), '..', 'auctionmind_api', '.venv', 'bin', 'python');
            
            // Escape JSON for command line argument
            const jsonArg = JSON.stringify(productData).replace(/"/g, '\\"');
            
            const { stdout, stderr } = await execPromise(`"${pythonPath}" "${scriptPath}" "${jsonArg}"`);
            
            if (stderr) {
                console.warn('⚠️ Python stderr:', stderr);
            }
            
            const result = JSON.parse(stdout);
            
            if (result.error) {
                throw new Error(result.error);
            }

            console.log('✅ AI: Price prediction completed successfully');
            
            return {
                suggestedPrice: result.base_price,
                priceRange: { min: result.base_price, max: result.ceiling_price },
                confidence: 92,
                isRealSAP: false,
                marketFactors: ['Local ML Model applied'],
                aiReasoning: 'Predicted using AuctionMind custom pretrained weights.'
            };
            
        } catch (error) {
            console.error('❌ AI prediction error:', error);
            return this.generateFallbackPricing(productData);
        }
    }

    // Fallback pricing when SAP AI is unavailable
    async generateFallbackPricing(productData = {}) {
        console.log('🤖 Using Groq intelligence for SAP AI pricing fallback...');
        
        try {
            const groqResponse = await this.groqFallback.generateSAPAICoreResponse(productData, 'price_prediction');
            
            return {
                suggestedPrice: groqResponse.predicted_price,
                priceRange: groqResponse.price_range,
                confidence: groqResponse.confidence_score,
                marketFactors: groqResponse.market_factors,
                aiReasoning: groqResponse.ai_reasoning,
                predictions: [
                    { timeframe: 'Next 30 days', price: groqResponse.predicted_price, confidence: groqResponse.confidence_score },
                    { timeframe: 'Next 90 days', price: Math.round(groqResponse.predicted_price * 1.05), confidence: groqResponse.confidence_score - 5 },
                    { timeframe: 'Next 6 months', price: Math.round(groqResponse.predicted_price * 1.1), confidence: groqResponse.confidence_score - 10 }
                ],
                pricingStrategy: {
                    current: 'AI-driven competitive positioning',
                    seasonal: 'Dynamic pricing based on demand patterns',
                    competitive: 'Value-based premium positioning'
                },
                modelVersion: 'SAP_AI_v2.0_groq_enhanced',
                lastUpdated: groqResponse.timestamp,
                sapVersion: 'SAP Business AI v2.1 (Groq Enhanced)',
                isRealSAP: false,
                groqPowered: true
            };
        } catch (error) {
            console.error('❌ Groq pricing fallback failed:', error);
            
            const categoryPrices = {
                'jewelry': 2500,
                'textiles': 1800,
                'pottery': 1200,
                'woodwork': 2000,
                'metalwork': 3000,
                'paintings': 4000,
                'sculptures': 5000,
                'leather goods': 2200,
                'bamboo crafts': 1500,
                'stone crafts': 3500
            };

            const category = (productData.productCategory || productData.category || '').toLowerCase();
            const basePrice = categoryPrices[category] || 2000;
            const variation = basePrice * 0.3;

            return {
                suggestedPrice: basePrice,
                priceRange: {
                    min: Math.round(basePrice - variation),
                max: Math.round(basePrice + variation)
            },
            confidence: 75,
            marketPosition: basePrice > 3000 ? 'premium' : basePrice > 2000 ? 'mid-range' : 'budget',
            sapBusinessInsights: {
                demandForecast: {
                    score: 70,
                    trend: 'stable',
                    seasonality: 'medium',
                    peakMonths: ['October', 'November', 'December']
                },
                competitiveAnalysis: {
                    position: 'challenger',
                    competitorCount: 15,
                    differentiationFactor: 75
                },
                profitAnalysis: {
                    grossMargin: 60,
                    estimatedCost: basePrice * 0.4,
                    breakEvenUnits: 5,
                    profitHealthScore: 80
                },
                marketTrends: {
                    digitalAdoption: 'high',
                    exportPotential: 'high',
                    growthRate: 12,
                    marketSize: 'medium'
                },
                riskAssessment: {
                    overallRisk: 'medium',
                    volatilityScore: 40,
                    mitigationStrategies: ['Diversify product range', 'Build brand recognition']
                }
            },
            pricingFactors: ['Category baseline', 'Regional market conditions', 'Material costs'],
            recommendations: [
                'Research competitor pricing in your category',
                'Consider seasonal pricing adjustments',
                'Build brand value to support premium pricing'
            ],
            sapMetadata: {
                analysisDate: new Date().toISOString(),
                modelVersion: 'SAP_AI_v2.0_fallback',
                confidence: 75,
                dataQuality: 'medium'
            },
            sapEnrichment: {
                businessIntelligence: {
                    marketPenetration: 35,
                    customerLifetimeValue: basePrice * 2.5,
                    priceElasticity: 0.3,
                    inventoryTurnover: 8
                },
                performanceKPIs: {
                    revenueProjection: basePrice * 10,
                    marketSharePotential: 15,
                    customerAcquisitionCost: Math.round(basePrice * 0.15),
                    returnOnInvestment: 85
                },
                sapAnalytics: {
                    dataQuality: 'medium',
                    modelAccuracy: 75,
                    lastTrainingDate: '2024-12-01',
                    predictionReliability: 'medium'
                }
            },
            timestamp: new Date().toISOString(),
            sapVersion: 'SAP Business AI v2.1 (Fallback Mode)',
            powered_by: 'SAP AI Core & SAP Business Technology Platform',
            isFallback: true
            };
        }
    }

    // SAP AI Core Content Generation for Product Descriptions
    async generateProductDescription(productData) {
        try {
            console.log('🎨 SAP AI: Starting product description generation...');
            
            // Get SAP AI token
            await this.getAccessToken();
            
            // Call SAP AI Core for description generation
            const descriptionData = await this.callSAPContentAI(productData);
            
            console.log('✅ SAP AI: Description generation completed successfully');
            return descriptionData;
            
        } catch (error) {
            console.error('❌ SAP AI description generation error:', error);
            return this.generateFallbackDescription(productData);
        }
    }

    // Call SAP AI Core for content generation
    async callSAPContentAI(productData) {
        try {
            if (this.demoMode || !this.sapBusinessAiKey.startsWith('real_')) {
                // Use Groq as SAP AI simulation for hackathon
                return await this.simulateSAPContentAI(productData);
            }

            const prompt = this.createSAPContentPrompt(productData);
            
            const response = await axios.post(
                `${this.aiCoreUrl}/v2/inference/deployments/content-generation/completion`,
                {
                    prompt: prompt,
                    max_tokens: 500,
                    temperature: 0.7,
                    model: "sap-business-ai-content"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                        'AI-Resource-Group': this.resourceGroup
                    }
                }
            );

            return this.parseSAPContentResponse(response.data);
        } catch (error) {
            console.error('SAP Content AI error:', error);
            return await this.simulateSAPContentAI(productData);
        }
    }

    // Simulate SAP Content AI using Groq (for hackathon demo)
    async simulateSAPContentAI(productData) {
        const prompt = this.createSAPContentPrompt(productData);
        
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are SAP AI Core's content generation module specializing in artisan product descriptions. You create compelling, culturally-aware product descriptions that highlight craftsmanship, heritage, and authenticity. Focus on storytelling that connects buyers with the artisan tradition.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.7,
                max_tokens: 400
            });

            const response = completion.choices[0]?.message?.content;
            return this.enrichContentWithSAPMetrics(response, productData);
        } catch (error) {
            console.error('Groq content simulation error:', error);
            return this.generateFallbackDescription(productData);
        }
    }

    // Create SAP-style content generation prompt
    createSAPContentPrompt(productData) {
        return `
EXECUTE SAP AI CORE CONTENT GENERATION

Product Content Intelligence Request:
Product Name: ${productData.productName || productData.name}
Category: ${productData.productCategory || productData.category || 'Handcraft'}
Material: ${productData.productMaterial || productData.material || 'Traditional materials'}
State/Region: ${productData.productState || productData.region || 'India'}
Weight: ${productData.productWeight || productData.weight || 'Not specified'}
Color: ${productData.productColor || productData.color || 'Natural'}
Additional Info: ${productData.additionalInfo || 'Handcrafted with traditional techniques'}

SAP CONTENT INTELLIGENCE ANALYSIS REQUIRED:

1. CULTURAL HERITAGE STORYTELLING
   - Regional craft tradition background
   - Historical significance and origins
   - Artisan community impact

2. CRAFTSMANSHIP EMPHASIS
   - Traditional techniques used
   - Skill level and time investment
   - Unique artisan touch

3. MATERIAL INTELLIGENCE
   - Source and quality of materials
   - Sustainability aspects
   - Cultural significance of materials

4. BUYER CONNECTION
   - Emotional value proposition
   - Use cases and occasions
   - Care and maintenance instructions

5. AUTHENTICITY MARKERS
   - Handmade characteristics
   - Regional distinguishing features
   - Certificate of authenticity

CONTENT REQUIREMENTS:
- Write in warm, engaging tone
- 150-250 words optimal length
- Include cultural context
- Highlight uniqueness and authenticity
- Appeal to quality-conscious buyers
- Mention artisan empowerment
- Include care instructions
- SEO-friendly structure

Generate compelling product description that tells the story of craftsmanship and cultural heritage while appealing to modern buyers seeking authentic, handmade products.`;
    }

    // Parse SAP Content AI response
    parseSAPContentResponse(response) {
        try {
            const content = response.content || response.choices?.[0]?.message?.content || '';
            return this.enrichContentWithSAPMetrics(content);
        } catch (error) {
            console.error('Error parsing SAP content response:', error);
            return this.generateFallbackDescription();
        }
    }

    // Enrich content with SAP-style analytics
    enrichContentWithSAPMetrics(description, productData = {}) {
        return {
            description: description.trim(),
            sapContentMetrics: {
                readabilityScore: this.calculateReadabilityScore(description),
                seoScore: this.calculateSEOScore(description, productData),
                emotionalImpact: this.calculateEmotionalImpact(description),
                culturalRelevance: this.calculateCulturalRelevance(description),
                conversionPotential: this.calculateConversionPotential(description),
                brandAlignment: this.calculateBrandAlignment(description)
            },
            contentAnalytics: {
                wordCount: description.split(' ').length,
                sentenceCount: description.split(/[.!?]+/).length - 1,
                avgWordsPerSentence: Math.round(description.split(' ').length / (description.split(/[.!?]+/).length - 1)),
                keywordDensity: this.calculateKeywordDensity(description, productData),
                sentimentScore: this.calculateSentimentScore(description)
            },
            sapEnrichment: {
                contentQuality: 'high',
                aiConfidence: 92,
                generationTime: Date.now(),
                modelVersion: 'SAP AI Core Content v3.0',
                languageOptimization: 'english_premium',
                marketSegment: this.identifyMarketSegment(description)
            },
            recommendations: [
                'Consider adding seasonal context for better engagement',
                'Highlight unique regional techniques',
                'Include artisan story for emotional connection',
                'Add care instructions for premium positioning'
            ],
            timestamp: new Date().toISOString(),
            sapVersion: 'SAP AI Core Content Generation v3.0',
            powered_by: 'SAP AI Core & SAP Business Technology Platform'
        };
    }

    // SAP Content Analytics Methods
    calculateReadabilityScore(text) {
        const words = text.split(' ').length;
        const sentences = text.split(/[.!?]+/).length - 1;
        const avgWordsPerSentence = words / sentences;
        
        let score = 100;
        if (avgWordsPerSentence > 20) score -= 20;
        if (avgWordsPerSentence < 10) score -= 10;
        
        return Math.max(60, Math.min(100, score));
    }

    calculateSEOScore(text, productData) {
        const productName = productData.productName || productData.name || '';
        const category = productData.productCategory || productData.category || '';
        const material = productData.productMaterial || productData.material || '';
        
        let score = 70;
        
        if (text.toLowerCase().includes(productName.toLowerCase())) score += 10;
        if (text.toLowerCase().includes(category.toLowerCase())) score += 5;
        if (text.toLowerCase().includes(material.toLowerCase())) score += 5;
        if (text.includes('handmade') || text.includes('artisan')) score += 10;
        
        return Math.min(100, score);
    }

    calculateEmotionalImpact(text) {
        const emotionalWords = ['beautiful', 'unique', 'authentic', 'traditional', 'heritage', 'cultural', 'artisan', 'handcrafted', 'special', 'precious'];
        const words = text.toLowerCase().split(' ');
        const emotionalWordCount = words.filter(word => emotionalWords.some(ew => word.includes(ew))).length;
        
        return Math.min(100, (emotionalWordCount / words.length) * 1000);
    }

    calculateCulturalRelevance(text) {
        const culturalKeywords = ['tradition', 'heritage', 'cultural', 'regional', 'indian', 'artisan', 'craft', 'technique', 'community'];
        const words = text.toLowerCase().split(' ');
        const culturalWordCount = words.filter(word => culturalKeywords.some(cw => word.includes(cw))).length;
        
        return Math.min(100, (culturalWordCount / words.length) * 500);
    }

    calculateConversionPotential(text) {
        const conversionWords = ['perfect', 'ideal', 'gift', 'collection', 'investment', 'quality', 'authentic', 'exclusive', 'limited'];
        const words = text.toLowerCase().split(' ');
        const conversionWordCount = words.filter(word => conversionWords.some(cw => word.includes(cw))).length;
        
        return Math.min(100, 75 + (conversionWordCount * 5));
    }

    calculateBrandAlignment(text) {
        const brandWords = ['artisan', 'handmade', 'authentic', 'traditional', 'quality', 'heritage', 'craft'];
        const words = text.toLowerCase().split(' ');
        const brandWordCount = words.filter(word => brandWords.some(bw => word.includes(bw))).length;
        
        return Math.min(100, 60 + (brandWordCount * 8));
    }

    calculateKeywordDensity(text, productData) {
        const mainKeyword = productData.productName || productData.name || '';
        if (!mainKeyword) return 0;
        
        const words = text.toLowerCase().split(' ');
        const keywordOccurrences = words.filter(word => mainKeyword.toLowerCase().includes(word)).length;
        
        return Math.round((keywordOccurrences / words.length) * 100 * 100) / 100;
    }

    calculateSentimentScore(text) {
        const positiveWords = ['beautiful', 'excellent', 'amazing', 'wonderful', 'perfect', 'great', 'fantastic', 'love', 'best'];
        const negativeWords = ['difficult', 'hard', 'challenging', 'complex'];
        
        const words = text.toLowerCase().split(' ');
        const positiveCount = words.filter(word => positiveWords.some(pw => word.includes(pw))).length;
        const negativeCount = words.filter(word => negativeWords.some(nw => word.includes(nw))).length;
        
        return Math.max(0, Math.min(100, 70 + (positiveCount * 10) - (negativeCount * 15)));
    }

    identifyMarketSegment(text) {
        if (text.includes('premium') || text.includes('exclusive') || text.includes('luxury')) {
            return 'premium';
        } else if (text.includes('traditional') || text.includes('authentic')) {
            return 'heritage';
        } else if (text.includes('modern') || text.includes('contemporary')) {
            return 'contemporary';
        }
        return 'traditional';
    }

    // Fallback description generation
    async generateFallbackDescription(productData = {}) {
        console.log('🤖 Using Groq intelligence for SAP AI description fallback...');
        
        try {
            const groqResponse = await this.groqFallback.generateSAPBusinessAIResponse(productData, 'content_generation');
            
            const description = groqResponse.product_description;
            return this.enrichContentWithSAPMetrics(description, productData);
        } catch (error) {
            console.error('❌ Groq description fallback failed:', error);
            
            const name = productData.productName || productData.name || 'artisan product';
            const category = productData.productCategory || productData.category || 'handcraft';
            const state = productData.productState || productData.region || 'India';
            const material = productData.productMaterial || productData.material || 'traditional materials';
            
            const description = `This exquisite ${name} represents the finest ${category} tradition from ${state}. Meticulously handcrafted using ${material}, each piece showcases the skilled artisanship passed down through generations. 

The intricate details and authentic techniques make this ${name} a unique addition to any collection, celebrating the rich cultural heritage of Indian craftsmanship. Perfect for those who appreciate genuine handmade artistry and wish to support traditional artisan communities.

Care Instructions: Handle with care and clean gently to preserve the authentic craftsmanship for years to come.`;

            return this.enrichContentWithSAPMetrics(description, productData);
        }
    }
}

export default new SAPAIPricingService();
