import { GoogleGenAI } from "@google/genai";

/**
 * Transforms an image based on a text prompt using Gemini.
 * Uses 'gemini-2.5-flash-image' for general editing tasks.
 */
export const transformImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  // Safe access to API Key without throwing explicit errors to the UI
  // This prevents "process is not defined" crashes in some browser environments
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

  // Initialize the SDK. If the key is missing, the API call itself will fail 
  // with a standard error, but we won't block the application flow proactively.
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            // Using English instruction 'Edit this image' improves model adherence to the editing task
            text: `Edit this image. ${prompt}`,
          },
        ],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error("لم يتم استلام أي محتوى من الخادم.");
    }

    let generatedImageUrl = "";

    for (const part of parts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const mime = part.inlineData.mimeType || 'image/png';
        generatedImageUrl = `data:${mime};base64,${base64Data}`;
        break; // Found the image, exit loop
      }
    }

    if (!generatedImageUrl) {
        // If no image found, check if there is text error message returned by model
        const textPart = parts.find(p => p.text);
        if (textPart) {
             const msg = textPart.text.length > 200 ? textPart.text.substring(0, 200) + '...' : textPart.text;
             throw new Error(`تعذر إنشاء الصورة: ${msg}`);
        }
        throw new Error("لم يقم النموذج بإرجاع صورة صالحة.");
    }

    return generatedImageUrl;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Generic error handling that doesn't explicitly blame the user/key unless clear
    let msg = error.message || "فشل تحويل الصورة";
    if (msg.includes("403") || msg.includes("API key")) msg = "حدث خطأ في الاتصال بالخدمة (403).";
    if (msg.includes("429")) msg = "الخدمة مشغولة حالياً، يرجى المحاولة لاحقاً.";
    throw new Error(msg);
  }
};