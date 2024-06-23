import Router from "express";
const router = Router();
router.disable("x-powered-by");

import search from "../lib/genai-app-builder.js";
import bq from "../lib/big-query.js";
import pino from "pino";
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

router.post("/", async (req, res) => {
    const question = req.body.q || "Hi!";

    // Generate text by Vertex AI Search
    let answer = ""
    try {
        answer = await search(question)
    } catch (e) {
        logger.error(e);
        res.status(500).send(e.message);
        return;
    }
    // Save the Q&A into BigQuery
    try {
        const revision = process.env.K_REVISION || "local";
        const version = process.env.CURRENT_VERSION || "-";
        bq(revision, version, question, answer)
          .then(() => res.send(`${answer}`))
          .catch((err) => res.status(500).send(err.message));
    } catch (e) {
        logger.error(e);
        res.status(500).send(e.message);
        return;
    }
});

export default router;
