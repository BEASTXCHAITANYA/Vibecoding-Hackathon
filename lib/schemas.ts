export const charterSchema = {
  type: "object",
  properties: {
    identity: { type: "string" },
    convictions: {
      type: "array",
      items: { type: "string" }
    },
    obsessions: {
      type: "array",
      items: { type: "string" }
    },
    allergies: {
      type: "array",
      items: { type: "string" }
    },
    voice: {
      type: "object",
      properties: {
        openingMove: { type: "string" },
        sentenceRhythm: { type: "string" },
        vocabulary: { type: "string" },
        closingMove: { type: "string" },
        forbidden: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["openingMove", "sentenceRhythm", "vocabulary", "closingMove", "forbidden"],
      additionalProperties: false
    }
  },
  required: ["identity", "convictions", "obsessions", "allergies", "voice"],
  additionalProperties: false
};

export const judgmentSchema = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          score: { type: "integer" },
          verdict: {
            type: "string",
            enum: ["publish", "reject"]
          },
          reason: { type: "string" }
        },
        required: ["url", "score", "verdict", "reason"],
        additionalProperties: false
      }
    },
    angle: {
      type: ["string", "null"]
    }
  },
  required: ["verdicts", "angle"],
  additionalProperties: false
};

export const postSchema = {
  type: "object",
  properties: {
    text: { type: "string" },
    rationale: { type: "string" }
  },
  required: ["text", "rationale"],
  additionalProperties: false
};
