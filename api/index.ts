import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";

// Important: Vercel needs its body parser disabled for multer to work
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// API Route for PDF Parsing
app.post("/api/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({ error: "Failed to parse PDF resume" });
  }
});

// Export the Express app for Vercel Serverless
export default app;
