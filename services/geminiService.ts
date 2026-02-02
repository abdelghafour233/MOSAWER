import { GoogleGenAI } from "@google/genai";

// Ensure API Key is available
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not defined in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

/**
 * Transforms an image based on a text prompt using Gemini.
 * Uses 'gemini-2.5-flash-image' for general editing tasks.
 */
export const transformImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  if (!apiKey) throw new Error("مفتاح API غير موجود");

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
            // Providing instruction in Arabic ensures better context understanding for Arabic prompts
            text: `قم بتعديل هذه الصورة بناءً على التعليمات التالية: ${prompt}`,
          },
        ],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error("لم يتم استلام أي محتوى من Gemini.");
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
             throw new Error(`أعاد النموذج نصاً بدلاً من صورة: ${textPart.text}`);
        }
        throw new Error("لم يعد النموذج صورة صالحة.");
    }

    return generatedImageUrl;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "فشل تحويل الصورة");
  }
};