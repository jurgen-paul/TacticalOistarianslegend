import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in the Secrets panel in AI Studio.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function getStrategicAdvice(playstyle: string) {
  try {
    const agent = getGenAI();
    const prompt = `You are NEXUS ONE, a futuristic strategic advisor. 
    A legend is asking for weapon calibration advice for a "${playstyle}" playstyle.
    Suggest a combination of Scope, Grip, and Barrel from these options:
    Scopes: Iron Sights, Holo Sight, 2x Combat Optic
    Grips: No Grip, Vertical Grip, Angled Grip
    Barrels: Standard Barrel, Extended Barrel, Rapid Fire Barrel
    
    Provide a concise, futuristic recommendation (max 2 sentences).`;
    
    const response = await agent.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text ?? "NEXUS ONE: Calibration advice unavailable. Proceed with default settings.";
  } catch (error) {
    console.error("Strategic Advisor Error:", error);
    return `NEXUS ONE: Strategic link unstable. ${error instanceof Error ? error.message : "Calibrate manually."}`;
  }
}
