#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT || 8787);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const AUTH_BEARER_TOKEN = process.env.AUTH_BEARER_TOKEN || '';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 25000);
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8_000_000);
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH || 3000);
const DEFAULT_ROAST_COUNT = Number(process.env.DEFAULT_ROAST_COUNT || 3);
const MAX_ROAST_COUNT = Number(process.env.MAX_ROAST_COUNT || 5);

if (!GEMINI_API_KEY) {
  console.error('Missing required env var: GEMINI_API_KEY');
  process.exit(1);
}

const AUDIENCES = new Set([
  'Bestie',
  'Sibling',
  'Ex',
  'Coworker',
  'Self',
  'Stranger',
]);

const rateWindowMs = 60_000;
const rateMap = new Map();

function nowIso() {
  return new Date().toISOString();
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  });
  res.end(body);
}

function badRequest(res, message, requestId) {
  sendJson(res, 400, { error: message, requestId });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function rateLimitPassed(ip) {
  const current = Date.now();
  const row = rateMap.get(ip);

  if (!row || current - row.windowStart > rateWindowMs) {
    rateMap.set(ip, { windowStart: current, count: 1 });
    return true;
  }

  if (row.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  row.count += 1;
  return true;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(new Error('Payload too large'));
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function clampRoastCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_ROAST_COUNT;
  return Math.min(MAX_ROAST_COUNT, Math.max(1, Math.round(value)));
}

function buildStyleTone(burnLevel, audience) {
  if (burnLevel <= 20) return `gentle and playful, kind to ${audience}`;
  if (burnLevel <= 40) return `light and witty, friendly to ${audience}`;
  if (burnLevel <= 60) return `balanced and punchy, still playful for ${audience}`;
  if (burnLevel <= 80) return `spicy and sharp but non-abusive for ${audience}`;
  return `very spicy and bold, but still non-hateful and non-threatening toward ${audience}`;
}

function buildPrompt(input) {
  const burnLevel = Math.round(input.burnLevel);
  const tone = buildStyleTone(burnLevel, input.audience);
  const roastCount = clampRoastCount(input.count);

  const rules = [
    `You are writing ${roastCount} different roasts.`,
    'Each roast must be under 70 words.',
    'Make it funny and creative, not repetitive.',
    'Do not include hate speech, slurs, threats, or sexual content.',
    'Do not target protected characteristics.',
    'If user input is too sensitive, return a playful toned-down roast.',
    `Return ONLY valid minified JSON with this exact shape: {"roasts":["..."]}.`,
    `The "roasts" array must contain exactly ${roastCount} strings.`,
  ].join('\n');

  let subjectBlock = '';
  if (input.inputType === 'text') {
    subjectBlock = `Target text:\n${input.text}`;
  } else if (input.imageBase64 && input.imageMimeType) {
    subjectBlock = `Target image is attached inline.`;
  } else if (input.imageUrl) {
    subjectBlock = `Target image URL:\n${input.imageUrl}`;
  } else {
    subjectBlock = 'No target content provided.';
  }

  return [
    rules,
    '',
    `Audience: ${input.audience}`,
    `Burn level (0-100): ${burnLevel}`,
    `Tone: ${tone}`,
    '',
    subjectBlock,
  ].join('\n');
}

function buildTopUpPrompt(input, existingRoasts, missingCount) {
  const burnLevel = Math.round(input.burnLevel);
  const tone = buildStyleTone(burnLevel, input.audience);
  const existing = existingRoasts.map((value, index) => `${index + 1}. ${value}`).join('\n');

  return [
    `You are writing ${missingCount} additional roasts.`,
    'Each roast must be under 70 words.',
    'Do not repeat or closely paraphrase existing roasts.',
    'Do not include hate speech, slurs, threats, or sexual content.',
    'Do not target protected characteristics.',
    `Return ONLY valid minified JSON with this exact shape: {"roasts":["..."]}.`,
    `The "roasts" array must contain exactly ${missingCount} strings.`,
    '',
    `Audience: ${input.audience}`,
    `Burn level (0-100): ${burnLevel}`,
    `Tone: ${tone}`,
    '',
    'Already generated roasts:',
    existing || '(none)',
    '',
    input.inputType === 'text'
      ? `Target text:\n${input.text}`
      : input.imageBase64 && input.imageMimeType
      ? 'Target image is attached inline.'
      : input.imageUrl
      ? `Target image URL:\n${input.imageUrl}`
      : 'No target content provided.',
  ].join('\n');
}

function extractTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function cleanRoast(text) {
  return text.replace(/^```[\s\S]*?\n|```$/g, '').trim();
}

function compactWhitespace(value) {
  return value.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function parseRoastsFromJson(text) {
  const tryParse = (candidate) => {
    if (!candidate) return [];
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string');
      }
      if (Array.isArray(parsed?.roasts)) {
        return parsed.roasts.filter((item) => typeof item === 'string');
      }
    } catch {
      return [];
    }
    return [];
  };

  const direct = tryParse(text);
  if (direct.length > 0) return direct;

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return tryParse(text.slice(start, end + 1));
  }

  return [];
}

function normalizeRoasts(rawText, requestedCount) {
  const count = clampRoastCount(requestedCount);
  const cleaned = cleanRoast(rawText);
  const fromJson = parseRoastsFromJson(cleaned);

  let roasts = fromJson.map(compactWhitespace).filter(Boolean);
  if (roasts.length === 0 && cleaned) {
    if (count === 1) {
      roasts = [compactWhitespace(cleaned)];
    } else {
      const lineItems = cleaned
        .split('\n')
        .map((line) => line.trim())
        .map((line) => line.match(/^\s*(?:[-*\u2022]|\d+[.)])\s+(.+)$/)?.[1] || '')
        .map(compactWhitespace)
        .filter(Boolean);

      if (lineItems.length >= 2) {
        roasts = lineItems;
      } else {
        const paragraphItems = cleaned
          .split(/\n{2,}/)
          .map(compactWhitespace)
          .filter(Boolean);

        roasts = paragraphItems.length >= 2 ? paragraphItems : [compactWhitespace(cleaned)];
      }
    }
  }

  const unique = [];
  for (const roast of roasts) {
    const trimmed = compactWhitespace(roast);
    if (!trimmed) continue;
    if (!unique.includes(trimmed)) unique.push(trimmed);
  }

  return unique.slice(0, count);
}

function shouldRetryWithoutStructuredOutput(error) {
  if (!error || error.status !== 400) return false;
  const message = String(error.message || '');
  return /(responseMimeType|responseSchema|Unknown name|Invalid JSON payload|Cannot find field)/i.test(
    message
  );
}

async function generateRoastsFromGemini(validInput, requestId) {
  const requestWithSchema = buildGeminiRequest(validInput);
  let data;

  try {
    data = await callGemini(requestWithSchema, requestId);
  } catch (error) {
    if (!shouldRetryWithoutStructuredOutput(error)) {
      throw error;
    }
    data = await callGemini(
      buildGeminiRequest(validInput, { disableStructuredOutput: true }),
      requestId
    );
  }

  const requestedCount = clampRoastCount(validInput.count);
  let roasts = normalizeRoasts(extractTextFromGemini(data), requestedCount);

  if (roasts.length >= requestedCount) {
    return roasts.slice(0, requestedCount);
  }

  const missingCount = requestedCount - roasts.length;
  const topUpPrompt = buildTopUpPrompt(validInput, roasts, missingCount);
  const topUpData = await callGemini(
    buildGeminiRequest(validInput, {
      countOverride: missingCount,
      promptOverride: topUpPrompt,
      disableStructuredOutput: true,
    }),
    requestId
  );

  const topUpRoasts = normalizeRoasts(extractTextFromGemini(topUpData), missingCount);
  for (const value of topUpRoasts) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!roasts.includes(trimmed)) {
      roasts.push(trimmed);
    }
    if (roasts.length >= requestedCount) {
      break;
    }
  }

  return roasts.slice(0, requestedCount);
}

async function callGemini(generateRequest, requestId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent`;

  const retries = 2;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(generateRequest),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const retriable = response.status === 429 || response.status >= 500;
        if (retriable && attempt < retries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }

        const errorMessage =
          data?.error?.message || `Gemini request failed with status ${response.status}`;
        const err = new Error(errorMessage);
        err.status = response.status;
        throw err;
      }

      return data;
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      if ((aborted || !error?.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Unexpected Gemini failure [${requestId}]`);
}

function validatePayload(body) {
  const inputType = body?.inputType;
  const audience = body?.audience;
  const burnLevel = Number(body?.burnLevel);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const imageBase64 =
    typeof body?.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  const imageMimeType =
    typeof body?.imageMimeType === 'string' ? body.imageMimeType.trim() : '';
  const count = clampRoastCount(Number(body?.count ?? DEFAULT_ROAST_COUNT));

  if (inputType !== 'text' && inputType !== 'image') {
    return { ok: false, error: 'inputType must be "text" or "image"' };
  }

  if (!AUDIENCES.has(audience)) {
    return {
      ok: false,
      error:
        'audience must be one of: Bestie, Sibling, Ex, Coworker, Self, Stranger',
    };
  }

  if (!Number.isFinite(burnLevel) || burnLevel < 0 || burnLevel > 100) {
    return { ok: false, error: 'burnLevel must be a number between 0 and 100' };
  }

  if (inputType === 'text') {
    if (!text) return { ok: false, error: 'text is required when inputType=text' };
    if (text.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `text is too long (max ${MAX_TEXT_LENGTH} chars)` };
    }
  }

  if (inputType === 'image') {
    const hasInlineImage = Boolean(imageBase64 && imageMimeType);
    const hasImageUrl = Boolean(imageUrl);
    if (!hasInlineImage && !hasImageUrl) {
      return {
        ok: false,
        error:
          'for inputType=image provide either imageBase64+imageMimeType, or imageUrl',
      };
    }
  }

  return {
    ok: true,
    value: {
      inputType,
      audience,
      burnLevel,
      count,
      text,
      imageUrl,
      imageBase64,
      imageMimeType,
    },
  };
}

function buildGeminiRequest(validInput, options = {}) {
  const prompt =
    typeof options.promptOverride === 'string' && options.promptOverride.trim().length > 0
      ? options.promptOverride
      : buildPrompt(validInput);
  const roastCount = clampRoastCount(
    Number(options.countOverride ?? validInput.count ?? DEFAULT_ROAST_COUNT)
  );
  const parts = [{ text: prompt }];

  if (
    validInput.inputType === 'image' &&
    validInput.imageBase64 &&
    validInput.imageMimeType
  ) {
    parts.push({
      inlineData: {
        mimeType: validInput.imageMimeType,
        data: validInput.imageBase64,
      },
    });
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      ...(options.disableStructuredOutput
        ? {}
        : {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              required: ['roasts'],
              properties: {
                roasts: {
                  type: 'ARRAY',
                  minItems: roastCount,
                  maxItems: roastCount,
                  items: { type: 'STRING' },
                },
              },
            },
          }),
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
}

async function handleGenerate(req, res, requestId) {
  const ip = getClientIp(req);

  if (!rateLimitPassed(ip)) {
    sendJson(res, 429, {
      error: 'Rate limit exceeded, try again in a minute.',
      requestId,
    });
    return;
  }

  const authHeader = req.headers.authorization || '';
  if (AUTH_BEARER_TOKEN) {
    const expected = `Bearer ${AUTH_BEARER_TOKEN}`;
    if (authHeader !== expected) {
      sendJson(res, 401, { error: 'Unauthorized', requestId });
      return;
    }
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch (error) {
    if (error?.message === 'Payload too large') {
      sendJson(res, 413, {
        error: `Payload too large (max ${MAX_BODY_BYTES} bytes)`,
        requestId,
      });
      return;
    }

    badRequest(res, error.message || 'Invalid request body', requestId);
    return;
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    badRequest(res, validated.error, requestId);
    return;
  }

  try {
    const roasts = await generateRoastsFromGemini(validated.value, requestId);

    if (roasts.length === 0) {
      sendJson(res, 502, {
        error: 'Model returned an empty response',
        requestId,
      });
      return;
    }

    sendJson(res, 200, {
      requestId,
      roast: roasts[0], // backward compatibility
      roasts,
      requestedCount: validated.value.count,
      roastCount: roasts.length,
      model: GEMINI_MODEL,
      audience: validated.value.audience,
      burnLevel: Math.round(validated.value.burnLevel),
      createdAt: nowIso(),
    });
  } catch (error) {
    console.error(
      `[${nowIso()}] [${requestId}] Gemini error:`,
      error?.message || error
    );
    sendJson(res, 502, {
      error: 'Failed to generate roast',
      detail: error?.message || 'Unknown Gemini error',
      requestId,
    });
  }
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  const method = req.method || 'GET';
  const path = req.url ? req.url.split('?')[0] : '/';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    });
    res.end();
    return;
  }

  if (method === 'GET' && path === '/healthz') {
    sendJson(res, 200, {
      ok: true,
      service: 'roast-api',
      model: GEMINI_MODEL,
      now: nowIso(),
      requestId,
    });
    return;
  }

  if (method === 'POST' && path === '/v1/roasts/generate') {
    await handleGenerate(req, res, requestId);
    return;
  }

  sendJson(res, 404, { error: 'Not found', requestId });
});

server.listen(PORT, () => {
  console.log(`[${nowIso()}] roast-api listening on :${PORT}`);
  console.log(`[${nowIso()}] using Gemini model: ${GEMINI_MODEL}`);
});

process.on('uncaughtException', (error) => {
  console.error(`[${nowIso()}] uncaughtException`, error);
});

process.on('unhandledRejection', (error) => {
  console.error(`[${nowIso()}] unhandledRejection`, error);
});

