import { GoogleGenAI } from "@google/genai";

const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";

// Initialize using the modern object-based parameter
export const genAI = new GoogleGenAI({ apiKey });

export async function getStrategicAdvice(playstyle: string) {
  try {
    const model = (genAI as any).getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are NEXUS ONE, a futuristic strategic advisor. 
    A legend is asking for weapon calibration advice for a "${playstyle}" playstyle.
    Suggest a combination of Scope, Grip, and Barrel from these options:
    Scopes: Iron Sights, Holo Sight, 2x Combat Optic
    Grips: No Grip, Vertical Grip, Angled Grip
    Barrels: Standard Barrel, Extended Barrel, Rapid Fire Barrel
    
    Provide a concise, futuristic recommendation (max 2 sentences).`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Strategic Advisor Error:", error);
    return "NEXUS ONE: Strategic link unstable. Calibrate manually.";
  }
}
