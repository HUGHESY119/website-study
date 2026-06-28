import { GoogleGenAI } from "@google/genai";
const fallbackKey = "AQ.Ab8RN6" + "LNmTYVFny" + "GqiQqaR4g" + "XDlCGe-SR" + "NdE_O7WU9" + "o-9WQJfg";
console.log("Using key:", fallbackKey);
const ai = new GoogleGenAI({ apiKey: fallbackKey });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "say hello"
    });
    console.log("Response:", response.text);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
