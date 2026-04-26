import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import pdfParse from "pdf-parse";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for PDF Parsing
  app.post("/api/parse-resume", upload.single("resume"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Using pdf-parse v1.1.1 API
      const result = await pdfParse(req.file.buffer);
      res.json({ text: result.text });
      
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      res.status(500).json({ error: "Failed to parse PDF resume" });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
