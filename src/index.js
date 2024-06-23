import express from "express";
const app = express();
app.disable("x-powered-by");

// For health checks
app.get("/health", (_, res) => {
  res.status(200).end();
});

// Access logs
import log from "./lib/logger.js";
app.use(log);

// JSON parser
app.use(express.json());

// Static files
import path from "path";
import { fileURLToPath } from "url";
app.use(express.static(path.dirname(fileURLToPath(import.meta.url)) + "/public"));

// API
import routeChat from "./routes/chat.js";
app.use("/api/v1/chat", routeChat);

// Server configurations
const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.info(`Server listening on ${port}`);
});
