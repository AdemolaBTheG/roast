# AI Roast App - Project Context

## Summary

AI Roast App is a mobile app that generates funny, witty, playful roasts from user-provided inputs. Inputs include photos, screenshots, selfies, text messages, and social media captions. The app is for humor and entertainment, not harassment.

## Positioning

"Instant funny comebacks & playful roasts for anything you see."

## Target Audience

- Gen Z and young millennials
- Meme culture users
- People active in group chats
- Social media heavy users
- Dating app users
- Friends roasting each other for fun

## Main Use Cases

- Paste a funny or cringe post and get a roast
- Take or upload a selfie and get a playful roast
- Send a friend's pic and get a roast
- Get a witty comeback for a chat
- Share roast results as screenshots

## App Structure

Tab 1 - Roast:
- Core screen for input and generation
- Input types: photo capture, image upload, text input
- Roast level options: Playful, Savage, Unhinged
- Primary action: "Roast It"
- Flow: input -> AI call -> roast text result -> share or copy

Tab 2 - History:
- List of previous roasts
- Each item shows image thumbnail or text snippet
- Each item shows generated roast
- Tap opens full roast

Tab 3 - Settings:
- Default roast intensity
- Toggle safe mode
- Clear history
- Pro upgrade placeholder

## AI Behavior

The AI must:
- Be funny, witty, meme-style
- Use exaggeration
- Stay playful
- Avoid harassment, slurs, hate, threats
- Avoid protected characteristics
- Roast appearance in a cartoonish or jokey way, not cruel realism
- Feel like a clever friend, not a bully

Tone examples:
- "You look like your playlist apologizes after every song."
- "This outfit said 'main character' but the budget said 'side quest'."

Disallowed:
- Racism, sexism, body shaming, violent insults

## Image Roasting Rules

Allowed joke targets:
- Outfit
- Vibe
- Pose
- Expression
- Energy

Not allowed:
- Guessing race, health, or disability
- Sexual comments
- Degrading body remarks

## Technical Flow

- User selects image or enters text
- App compresses image
- App sends request to backend
- Backend calls AI model
- AI returns roast text
- App displays result
- User can share or copy

## Core Features

- Image upload
- Text input
- Roast intensity selector
- Share output
- Copy to clipboard
- History storage

## Monetization (Later)

Free:
- Limited roasts per day

Pro:
- Unlimited roasts
- Savage mode
- No watermark
- Premium tones

## Brand Personality

- Funny
- Internet-native
- Slightly chaotic
- Meme culture
- Not corporate
- "Your funniest friend lives in your phone."

## Not The Goal

- Not a bullying tool
- Not for hate
- Not for serious criticism
- Not a beauty rating app
- Pure entertainment
