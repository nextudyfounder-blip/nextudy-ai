# Minimalist chat workspace and realm quotes

## What will change
- Restyle the chat workspace with a soft near-black palette, muted borders, clean typography, 12–16px corners, and more breathing room while preserving the existing Mentor violet and Vanguard teal accents.
- Keep the conversation and composer centered at a 768px maximum width across desktop and mobile.
- Consolidate export, Blueprint, focus, model, and settings tools into a compact floating pill action bar so the canvas stays visually quiet.
- Replace the current generic empty-state motivation with a realm-specific historical quote, including author attribution.

## Quote engine
- Add exactly 50 Mentor quotes focused on knowledge, focus, and learning.
- Add exactly 50 different Vanguard quotes focused on execution, building, leadership, and strategy.
- Select a new quote after hydration to avoid mismatches, then rotate it whenever the user starts a new chat or switches realms.
- Keep each realm isolated so a Mentor quote never appears in Vanguard and vice versa.

## Quality checks
- Verify new-chat and realm-switch rotation in the live interface at desktop and compact widths.
- Confirm the floating action bar remains usable with and without messages, attachments, and Vanguard Blueprint access.
- Resolve the current app-wide error-screen typing issue, then confirm the latest preview build is healthy.

## Technical details
- Store quote data and random-selection helpers in a small client-safe module.
- Express the new surfaces, borders, text roles, and shadows through semantic tokens in the global design system rather than hardcoded colors in page markup.
- Preserve existing chat behavior, local draft recovery, realm-separated history, uploads, exports, and keyboard shortcuts.
