import express from "express";

import parseOpenAPI from "../parser/openapiParser.js";
import normalize from "../normalizer/normalizer.js";
import tagEndpoints from "../tagger/tagger.js";
import enrichMetadata from "../utils/metadata.js";
import generateTemplates from "../generator/templateGenerator.js";

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const openapi = req.body;

    const parsed = parseOpenAPI(openapi);
    const normalized = normalize(parsed);
    const tagged = tagEndpoints(normalized);
    const enriched = enrichMetadata(tagged, openapi);
    const templates = generateTemplates(enriched);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;