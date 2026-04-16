# Indigo + Cyan Dark Theme Redesign

**Date:** 2026-04-16
**Scope:** Theme colors, card styling, navigation polish — no layout or feature changes.

## Palette

| Token          | Old          | New          | Note                        |
|----------------|-------------|-------------|------------------------------|
| background     | `#09090B`   | `#0A0A0F`   | Deeper blue-black            |
| surface        | `#18181B`   | `#12121A`   | Blue-violet tint             |
| border         | `#27272A`   | `#1E1E2E`   | Cool-toned                   |
| muted          | `#3F3F46`   | `#2A2A3A`   | Cool-toned                   |
| textPrimary    | `#F4F4F5`   | `#E0E0F0`   | Slightly cool white          |
| textMuted      | `#A1A1AA`   | `#71717A`   | Zinc-500                     |
| primary        | `#3B82F6`   | `#6366F1`   | Blue → Indigo                |
| primaryLight   | `#60A5FA`   | `#818CF8`   | Indigo-400                   |
| success        | `#34D399`   | `#34D399`   | Unchanged                    |
| error          | `#F87171`   | `#F87171`   | Unchanged                    |
| warning        | `#FBBF24`   | `#FBBF24`   | Unchanged                    |
| compare        | `#C084FC`   | `#A78BFA`   | Violet-400                   |
| **NEW** accent | —           | `#22D3EE`   | Cyan for metrics/accuracy    |

## Card & Surface Style

- Solid opaque fills, no blur or gradients.
- 8px border-radius on cards/containers.
- 1px solid `border` color.
- Step badges: solid indigo (`#6366F1`) fill, 4px radius (square-ish), white text.

## Navigation Rail (wide layout)

- Background: `surface` (`#12121A`), elevated from page.
- Active tab: 3px left indigo indicator bar + pill with `rgba(indigo, 0.12)` bg.
- Active icon/label: `#818CF8`.
- Inactive icon/label: `#52525B`.

## Status Bar

- Background: `surface` (`#12121A`), elevated.
- Engine dots: 5px circles with subtle `box-shadow` glow matching their color.
- Cyan (`#22D3EE`) for online, red (`#F87171`) for offline.

## Buttons

- Primary (ElevatedButton): `#6366F1` bg, white text, 8px radius.
- Outlined: `#1E1E2E` border, `#E0E0F0` text.
- SegmentedButton selected: `#1A1A3A` bg (dark indigo tint), `#818CF8` text.
- SegmentedButton unselected: `surface` bg, `textMuted` text.

## Badges & Chips

- Eval type badges: 15% opacity bg of their respective color.
- Accuracy badges: cyan-tinted (`#22D3EE`).
- Model chips: indigo-tinted for single, violet-tinted for compare, cyan-tinted for custom.

## Files to Change

1. `core/theme/app_theme.dart` — all color constants + ThemeData
2. `shared/widgets/section_card.dart` — step badge
3. `shared/widgets/status_bar.dart` — elevated surface
4. `shared/widgets/engine_dot.dart` — glow styling
5. `shared/widgets/app_shell.dart` — rail indicator
6. `features/results/widgets/result_card.dart` — badge/chip colors
7. `features/results/results_screen.dart` — chart accent
8. `features/eval/widgets/provider_selector.dart` — segmented colors
9. `features/eval/widgets/eval_mode_selector.dart` — segmented colors
10. `features/eval/widgets/custom_result_stream_view.dart` — status colors
11. `features/results/result_detail_screen.dart` — badge/status colors
