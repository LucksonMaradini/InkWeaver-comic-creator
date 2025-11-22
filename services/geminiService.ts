import { GoogleGenAI, Type, Modality, Schema } from "@google/genai";
import { ComicPanel, AspectRatio } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Text Assistants ---

export const generateStoryIdea = async (): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Write a short, engaging concept for a 4-panel comic strip. It should be one paragraph, visually interesting, and creative. Do not include 'Here is a story' or preamble.",
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating idea:", error);
    return "A robot finds a flower in a wasteland and decides to protect it.";
  }
};

export const improveStoryScript = async (currentStory: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite the following story to be more suitable for a comic strip. Make the visual descriptions vivid, the action clear, and the pacing tight. Keep it under 150 words.\n\nCurrent Story: "${currentStory}"`,
    });
    return response.text || currentStory;
  } catch (error) {
    console.error("Error improving story:", error);
    return currentStory;
  }
};

export const reviewStoryPlan = async (currentStory: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this story for a comic strip. Give 3 short bullet points on: 1. Visual Potential, 2. Pacing, 3. A suggestion for improvement. Be concise.\n\nStory: "${currentStory}"`,
    });
    return response.text || "Could not review story.";
  } catch (error) {
    console.error("Error reviewing story:", error);
    return "Failed to generate review.";
  }
};

// --- Script Generation ---

export const generateComicScript = async (
  story: string,
  panelCount: number,
  styleDescription: string
): Promise<string[]> => {
  const ai = getClient();
  
  const prompt = `
    You are an expert comic book writer.
    Break down the following short story into exactly ${panelCount} distinct panels.
    The visual style is: ${styleDescription}.
    
    Story: "${story}"
    
    Return ONLY a JSON array of strings, where each string is a detailed visual description for an image generator (Imagen).
    Do not include character names if they aren't visually described in the prompt (e.g., use "a young boy with red hair" instead of "Timmy").
    Focus on visual details, lighting, and composition suitable for the requested style.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.STRING
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    const jsonText = response.text || "[]";
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Error generating script:", error);
    // Fallback if JSON parsing fails or AI refuses
    return Array(panelCount).fill(`A scene from the story: ${story.substring(0, 20)}...`);
  }
};

export const generateContinuationScript = async (
  fullHistory: string,
  panelCount: number,
  styleDescription: string
): Promise<string[]> => {
  const ai = getClient();
  
  const prompt = `
    You are an expert comic book writer.
    
    CONTEXT (Previous Story):
    "${fullHistory}"
    
    TASK:
    Write the script for the NEXT ${panelCount} panels to continue this story.
    The visual style is: ${styleDescription}.
    
    CRITICAL INSTRUCTION:
    Maintain strict visual consistency. If a character was described previously (e.g., "girl with green hair"), you MUST repeat those visual traits in these new prompts.
    
    Return ONLY a JSON array of strings, where each string is a detailed visual description for an image generator.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.STRING
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    const jsonText = response.text || "[]";
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Error generating continuation script:", error);
    return Array(panelCount).fill(`A continuation scene...`);
  }
};

// --- Image Generation (Imagen) ---

export const generatePanelImage = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getClient();
  
  try {
    // Imagen 4.0 for high quality generation
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg',
      },
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Image) throw new Error("No image generated");
    
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

// --- Image Editing (Gemini 2.5 Flash Image) ---

export const editPanelImage = async (
  originalImageBase64: string,
  editPrompt: string
): Promise<string> => {
  const ai = getClient();
  
  // Strip prefix if present for API usage
  const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts[0]?.inlineData) {
        const newBase64 = parts[0].inlineData.data;
        return `data:image/png;base64,${newBase64}`;
    }
    throw new Error("No edited image returned");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

// --- Image Analysis (Gemini 3 Pro) ---

export const analyzeUploadedImage = async (
  imageBase64: string,
  prompt: string = "Describe this image in detail, focusing on artistic style and composition."
): Promise<string> => {
  const ai = getClient();
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg', // Assuming jpeg/png, API is usually flexible
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Failed to analyze image.";
  }
};