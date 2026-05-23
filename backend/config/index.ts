import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY,
  appUrl: process.env.APP_URL || "http://localhost:3000",
};

export function verifyConfig() {
  if (!config.geminiApiKey) {
    console.warn(
      "WARNING: GEMINI_API_KEY environment variable is not set. Adviso AI will run in simulation mode for strategic reports."
    );
  }
}
