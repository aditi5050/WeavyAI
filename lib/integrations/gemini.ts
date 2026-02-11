import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. LLM calls will fail.");
}

const genAI = new GoogleGenerativeAI(apiKey || "mock_key");

export async function generateText(prompt: string, modelName: string = "gemini-pro") {
  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("[GEMINI_TEXT_ERROR]", error);
    throw error;
  }
}

export async function generateVision(prompt: string, imageUrl: string, modelName: string = "gemini-pro-vision") {
  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Fetch image and convert to proper format for Gemini
    // Note: Gemini API expects Part objects. 
    // For URL inputs, we might need to fetch the image buffer first.
    const imageResp = await fetch(imageUrl);
    const imageBuffer = await imageResp.arrayBuffer();
    const imageData = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString("base64"),
        mimeType: imageResp.headers.get("content-type") || "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("[GEMINI_VISION_ERROR]", error);
    throw error;
  }
}
