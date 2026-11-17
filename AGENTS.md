<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use `src/lib/journey.ts` as the single source for questionnaire IDs, profile rules, prices and validation; bilingual display copy stays separate from stable answer values.
- Mount JourneyProvider in the shared root to preserve answers across routes; read browser storage only after hydration.
- Keep registration submission behind `src/services/registrationService.ts` so a future validated remote implementation can replace the explicit local demonstration without changing the UI.
- Staff access lives in `src/lib/staff.ts` (admin via `user_roles`, assistants via `rifqa_assistants` permission flags); RLS and DB triggers enforce permissions, the UI only mirrors them.
- Assistant accounts are created/reset/deleted only through admin-checked server functions in `src/lib/team.functions.ts`; assistants sign in by username mapped to an internal e-mail domain.
- Staff statistics are derived from the trigger-written `rifqa_registration_activity` log, never from client-reported counts.
- Call Copilot guidance (personalities, red lines, objections, scripts, follow-up cadence, WhatsApp templates) lives in `src/lib/call-guide.ts`, sourced from the call-team guide; calls are stored in `rifqa_call_logs` and a DB trigger mirrors each one into the activity log for staff stats.
