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
  // Always retrieve the key at the moment of execution
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("مفتاح API غير موجود (Missing API Key).");
  }

  // Initialize a new instance for every request to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
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
        }
      ],
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
             // Clean up the error message if it's too long
             const msg = textPart.text.length > 200 ? textPart.text.substring(0, 200) + '...' : textPart.text;
             throw new Error(`لم يتمكن النموذج من إنشاء صورة: ${msg}`);
        }
        throw new Error("لم يعد النموذج صورة صالحة.");
    }

    return generatedImageUrl;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Provide a more user-friendly error message if possible
    let msg = error.message || "فشل تحويل الصورة";
    if (msg.includes("403") || msg.includes("API key") || msg.includes("Valid key")) msg = "خطأ في الصلاحيات أو مفتاح API (403).";
    if (msg.includes("429")) msg = "تم تجاوز حد الطلبات (Quota Exceeded).";
    throw new Error(msg);
  }
};