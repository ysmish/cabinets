#!/usr/bin/env node
/**
 * generate-brief.mjs — text stages (hooks, brief, shot list) via the Gemini API.
 *
 * STATUS: skeleton. Implemented in Phase D.
 *
 * Free-tier eligible. This is the half of the Gemini integration that runs
 * without billing, so it should be the first thing wired up and the most
 * thoroughly tested.
 *
 * Usage:
 *   node scripts/generate-brief.mjs --stage hooks --campaign 001-example
 *   node scripts/generate-brief.mjs --stage brief --campaign 001-example
 *   node scripts/generate-brief.mjs --stage shots --campaign 001-example
 *
 * Implementation notes for Phase D:
 *  - POST https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent
 *  - Header: x-goog-api-key
 *  - Body:   { contents: [{ parts: [{ text }] }] }
 *  - Read candidates[0].content.parts[0].text SPECIFICALLY. Gemini 3.x returns a
 *    thoughtSignature alongside the text; a parser that assumes the part is a
 *    bare string will break.
 *  - Load the generator prompt from generators/<stage>-generator.md, substitute
 *    {campaign} and {product}, and prepend the company context files.
 *  - Write output to the path the generator specifies. Writing to the correct
 *    path is the most common agent failure — assert the file exists afterwards.
 */

console.error('Not implemented yet — Phase D. See the header for the plan.');
process.exit(1);
