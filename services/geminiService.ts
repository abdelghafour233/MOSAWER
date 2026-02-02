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
  // Access API Key from environment variables safely
  // Note: For Vercel/Production, this variable must be set in the project settings
  const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

  // Initialize the SDK. 
  // We initialize it here to ensure we always try to use the latest env var state.
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
            text: `Edit this image. ${prompt}`,
          },
        ],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error("No content received from model.");
    }

    let generatedImageUrl = "";

    for (const part of parts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const mime = part.inlineData.mimeType || 'image/png';
        generatedImageUrl = `data:${mime};base64,${base64Data}`;
        break; // Found the image
      }
    }

    if (!generatedImageUrl) {
        // Check for text refusal/error from model
        const textPart = parts.find(p => p.text);
        if (textPart) {
             const msg = textPart.text.length > 200 ? textPart.text.substring(0, 200) + '...' : textPart.text;
             // Return model feedback as a polite error
             throw new Error(`تعذر تنفيذ الطلب: ${msg}`);
        }
        throw new Error("لم يتم إنشاء الصورة بنجاح.");
    }

    return generatedImageUrl;

  } catch (error: any) {
    console.error("Gemini Processing Error:", error);
    
    // Mask API Key errors to avoid confusing the user
    let msg = error.message || "حدث خطأ غير متوقع.";
    
    if (msg.includes("403") || msg.includes("API key") || msg.includes("key")) {
        msg = "الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.";
    } else if (msg.includes("429")) {
        msg = "الخادم مشغول جداً، يرجى الانتظار قليلاً والماولة مجدداً.";
    }

    throw new Error(msg);
  }
};