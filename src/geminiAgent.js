import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Gemini Agent for Product Analysis and Text Generation
 */
export class GeminiAgent {
    constructor(modelName = "gemini-2.0-flash") {
        this.model = genAI.getGenerativeModel({ model: modelName });
    }

    async analyzeImage(imagePath, prompt) {
        try {
            const imageData = await fs.readFile(imagePath);
            const imagePart = {
                inlineData: {
                    data: imageData.toString("base64"),
                    mimeType: "image/jpeg",
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Image Analysis Error:", error);
            return null;
        }
    }

    async generateText(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Text Generation Error:", error);
            return null;
        }
    }
}
