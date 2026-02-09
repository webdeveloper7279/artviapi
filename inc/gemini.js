import fetch from 'node-fetch'; // MUHIM (Node <18 uchun)
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class Gemini {
  static async think(chatHistory, systemInstruction) {
    if (!GEMINI_API_KEY) {
      return { error: true, message: 'GEMINI_API_KEY is not configured' };
    }

    const data = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: chatHistory
    };

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          error: true,
          message: result?.error?.message || 'Unknown API error'
        };
      }

      const text =
        result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return { error: true, message: 'No valid text response' };
      }

      return { error: false, reply: text };

    } catch (err) {
      return { error: true, message: err.message };
    }
  }

  static makeMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
  }
}

export default Gemini;
