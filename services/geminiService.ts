import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Clean base64 string (remove data URL prefix)
const cleanBase64 = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

// Feature: Magic Caption (Analyze images)
// Uses gemini-3-pro-preview as requested for image analysis
export const generateMagicCaptions = async (imageBase64: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(imageBase64),
            },
          },
          {
            text: "Analyze this image and list 5 funny, creative, and relevant meme captions for it. Keep them punchy and short.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          }
        }
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return [];
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

// Feature: Nano banana powered app (Edit images)
// Uses gemini-2.5-flash-image as requested for editing
export const editImageWithAI = async (imageBase64: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(imageBase64),
            },
          },
          {
            text: `Edit the image: ${prompt}. Maintain the original aspect ratio and main subject composition if possible, unless the prompt asks to change it.`,
          },
        ],
      },
      // Note: responseMimeType is NOT supported for nano banana (gemini-2.5-flash-image)
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};
