
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available from environment variables
if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a message from a topic using a streaming response.
 * @param topic The topic to generate a message about.
 * @param onChunk Callback function to handle each incoming chunk of text.
 */
export async function generateMessageStream(
  topic: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const response = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: `Directly fulfill this request for a WhatsApp message: "${topic}". The output should be only the generated content, ready to be pasted and sent.`,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error generating message:", error);
    throw new Error("Failed to generate message. Please check your API key and network connection.");
  }
}

/**
 * Transcribes an audio blob into text.
 * @param audioBase64 The base64 encoded audio data.
 * @param mimeType The MIME type of the audio data.
 * @returns The transcribed text.
 */
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: audioBase64,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: "Transcribe the following audio and provide only the transcribed text:",
                    },
                ],
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio. Please check your API key and network connection.");
    }
}
