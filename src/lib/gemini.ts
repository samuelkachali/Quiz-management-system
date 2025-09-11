import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export default genAI;

// Example function to get a model
export const getGeminiModel = (modelName: string = 'gemini-1.5-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Function to generate a response with conversation context
export const generateGeminiResponse = async (
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    maxRetries?: number;
  } = {}
) => {
  const maxRetries = options.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const {
        temperature = 0.7,
        maxTokens = 1024,
        model = 'gemini-1.5-flash'
      } = options;

      const geminiModel = getGeminiModel(model);

      // Convert conversation history to Gemini format
      const history = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = geminiModel.startChat({
        history,
        generationConfig: {
          temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxTokens,
        },
      });

      const result = await chat.sendMessage(message);
      const response = result.response;

      return {
        text: response.text(),
        usage: {
          promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
        },
        model,
        success: true
      };
    } catch (error) {
      console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Check if it's a retryable error (503, overloaded, service unavailable)
      const isRetryable = error instanceof Error &&
        (error.message.includes('503') ||
         error.message.includes('overloaded') ||
         error.message.includes('Service Unavailable') ||
         error.message.includes('timeout'));

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Retrying Gemini API call in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Return fallback response after all retries failed
  return {
    text: 'Sorry, the AI service is currently busy. Please try again in a few moments.',
    usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
    model: options.model || 'gemini-1.5-flash',
    success: false,
    error: lastError?.message || 'Service temporarily unavailable'
  };
};

// Function to validate Gemini API key
export const validateGeminiKey = async (): Promise<boolean> => {
  try {
    const model = getGeminiModel();
    await model.generateContent('Hello');
    return true;
  } catch (error) {
    console.error('Gemini API key validation failed:', error);
    return false;
  }
};