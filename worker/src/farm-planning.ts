import {
  allowedPlanActions,
  planningEvidence,
  validatePlan,
  type PlanningRequest,
  type NextStepPlan,
} from "../../shared/farm-planning";
import type {
  FieldBaseline,
  FieldOutlook,
} from "../../shared/farm-intelligence";
import type { Env } from "./index";
import { ApiError } from "./errors";

export async function generateFieldPlan(
  env: Env,
  input: PlanningRequest,
  outlook: FieldOutlook,
  baseline?: FieldBaseline,
): Promise<NextStepPlan> {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)
    throw new ApiError(503, "Field planning is not configured.");
  if (outlook.fieldState === "conflicting_cycles")
    throw new ApiError(
      409,
      "Resolve conflicting crop records before planning.",
    );
  const actions = allowedPlanActions(outlook, input.cropProtection);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `Prioritize low-risk next steps for a farmer using only the supplied numeric and categorical evidence. Return JSON {"priorities": [action codes], "cropCodes": [crop codes]}. Choose 1-4 distinct priorities ONLY from ${JSON.stringify(actions)}. Choose crops ONLY from supplied cropOptions; use [] if none. Prioritize drainage if heavy rain is forecast, water checks before water-dependent crops, and local calendar confirmation if no crop options. The seven-day history is NOT the weather since harvest. Historic calendars are screening evidence, not current agronomist approval. Missing soil remains missing: never prescribe inputs or infer soil nutrients. No invented facts, explanation text, product names, doses, measurements, profit or yield. Do not treat a crop-protection yes/no as proof of residues or field safety. Crop options needing water checks remain conditional. The application displays localized reviewed action descriptions. Response locale: ${input.locale}.`,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify(
                    planningEvidence(outlook, baseline, input.cropProtection),
                  ),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      },
    );
  } catch {
    throw new ApiError(502, "Field planning is temporarily unavailable.");
  }
  if (!response.ok)
    throw new ApiError(502, "Field planning is temporarily unavailable.");
  try {
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("") ?? "";
    return {
      ...validatePlan(JSON.parse(text), outlook, input.cropProtection),
      createdAt: Date.now(),
      model: env.GEMINI_MODEL,
      locale: input.locale,
    };
  } catch {
    throw new ApiError(
      502,
      "Field planning returned unsupported or incomplete choices. Please retry.",
    );
  }
}
