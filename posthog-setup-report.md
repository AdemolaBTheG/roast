# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your Roast app. Your project already had a solid foundation with `posthog-react-native` v4.17.2 installed and `PostHogProvider` configured in the root layout. We enhanced this by adding environment variable configuration, improving event coverage with 6 new supplemental events, and creating a comprehensive analytics dashboard.

## Summary of Changes

### Environment Variables
- Added `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` to `.env`
- These can be referenced in your code using `process.env.EXPO_PUBLIC_POSTHOG_API_KEY`

### Files Modified
- `app/(settings)/index.tsx` - Added `settings_history_cleared` event
- `app/(add)/index.tsx` - Added `add_input_type_changed` and `add_image_selected` events
- `app/(item)/[id]/index.tsx` - Added `roast_text_shared` and `roast_text_copied` events
- `components/nutrients-carousel/onboarding/quiz-screen.tsx` - Added `onboarding_quiz_answer_selected` event

### Linting Fixes
- Fixed React Hook dependency warning in `handleShareTextPress` callback

## Events Catalog

| Event Name | Description | File(s) |
|------------|-------------|---------|
| `screen_viewed` | Tracks when a user views a screen | `app/(home)/index.tsx`, `app/(add)/index.tsx`, `app/(settings)/index.tsx`, `app/(onboarding)/index.tsx`, `app/(item)/[id]/index.tsx` |
| `home_roast_opened` | Tracks when a user opens a roast from home | `app/(home)/index.tsx` |
| `onboarding_quiz_started` | Tracks when quiz starts from carousel | `app/(onboarding)/index.tsx` |
| `onboarding_quiz_answer_selected` | Tracks each quiz answer selection (NEW) | `components/nutrients-carousel/onboarding/quiz-screen.tsx` |
| `onboarding_quiz_completed` | Tracks quiz completion | `components/nutrients-carousel/onboarding/quiz-screen.tsx` |
| `onboarding_notifications_configured` | Tracks notification permission response | `app/(onboarding)/notifications.tsx` |
| `onboarding_store_review_requested` | Tracks store review request | `app/(onboarding)/rating.tsx` |
| `roast_generation_started` | Tracks when generation begins | `app/(add)/index.tsx` |
| `roast_generation_succeeded` | Tracks successful generation | `app/(add)/index.tsx` |
| `roast_generation_failed` | Tracks generation failures | `app/(add)/index.tsx` |
| `roast_generation_blocked` | Tracks blocks due to no credits | `app/(add)/index.tsx` |
| `add_input_type_changed` | Tracks text/image toggle (NEW) | `app/(add)/index.tsx` |
| `add_image_selected` | Tracks image selection source (NEW) | `app/(add)/index.tsx` |
| `paywall_viewed` | Tracks paywall impressions | `app/(paywalls)/index.tsx` |
| `paywall_dismissed` | Tracks paywall dismissals | `app/(paywalls)/index.tsx` |
| `paywall_purchase_completed` | Tracks successful purchases | `app/(paywalls)/index.tsx` |
| `paywall_restore_completed` | Tracks purchase restorations | `app/(paywalls)/index.tsx` |
| `roast_favorite_toggled` | Tracks favorite/unfavorite actions | `app/(item)/[id]/index.tsx` |
| `roast_deleted` | Tracks roast deletions | `app/(item)/[id]/index.tsx` |
| `roast_shared_image` | Tracks image sharing | `app/(item)/[id]/index.tsx` |
| `roast_text_shared` | Tracks text sharing (NEW) | `app/(item)/[id]/index.tsx` |
| `roast_text_copied` | Tracks text copying (NEW) | `app/(item)/[id]/index.tsx` |
| `settings_language_changed` | Tracks language changes | `app/(settings)/index.tsx` |
| `settings_history_cleared` | Tracks history clearing (NEW) | `app/(settings)/index.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://eu.posthog.com/project/52829/dashboard/524816) - Your main analytics dashboard

### Insights
- [Daily Activity Overview](https://eu.posthog.com/project/52829/insights/3K9GbMCz) - Daily trends of screen views and roast generations
- [Onboarding to First Roast Funnel](https://eu.posthog.com/project/52829/insights/tCMpiIgp) - Conversion funnel from onboarding to first roast
- [Paywall Conversion Funnel](https://eu.posthog.com/project/52829/insights/oIsXzuzs) - Track paywall view to purchase conversion
- [User Engagement (Sharing & Favorites)](https://eu.posthog.com/project/52829/insights/SmFdMnLL) - Monitor user engagement with roasts
- [Failures & Friction Points](https://eu.posthog.com/project/52829/insights/MHGtOwOE) - Track generation failures and credit blocks

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
