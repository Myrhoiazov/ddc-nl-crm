import { Request, Response } from 'express';
import { z } from 'zod';
import { runEmailAssistantSimulation } from './simulation.service';

export const simulationRequestSchema = z.object({
    from: z.string().trim().max(320).optional(),
    subject: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(20_000),
    topK: z.coerce.number().int().min(1).max(20).optional(),
    noKnowledge: z.boolean().optional().default(false),
    forceDraft: z.boolean().optional().default(false),
    classificationPromptId: z.coerce.number().int().positive().optional(),
    draftBodyPromptId: z.coerce.number().int().positive().optional(),
    noQueryExpansion: z.boolean().optional().default(false),
    noRerank: z.boolean().optional().default(false),
});

export const simulateEmailAssistant = async (req: Request, res: Response) => {
    const parsed = simulationRequestSchema.safeParse(req.body);
    // Checked as `=== true` (not `!parsed.success`) — this tsconfig has no strictNullChecks, under
    // which TS does not narrow a `{success:true,data}|{success:false,error}` union on negation.
    // Destructured rather than passing `parsed.data` wholesale: once this file also imports
    // simulation.service's much larger type graph (draft/classification schemas etc.), TS widens
    // `parsed.data`'s inferred shape to all-optional at the call site — a per-field destructure
    // sidesteps whatever inference budget/depth issue causes that.
    if (parsed.success === true) {
        const { from, subject, body, topK, noKnowledge, forceDraft, classificationPromptId, draftBodyPromptId, noQueryExpansion, noRerank } = parsed.data;
        const result = await runEmailAssistantSimulation({
            from, subject, body, topK, noKnowledge, forceDraft, classificationPromptId, draftBodyPromptId, noQueryExpansion, noRerank,
        });
        return res.json(result);
    }
    return res.status(400).json({ message: 'Проверьте тему/текст письма', details: parsed.error.flatten() });
};
