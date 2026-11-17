## Description

<!-- Briefly describe your changes and link to any related issues. -->

Related issue:

## Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🌐 New site adapter
- [ ] 📝 Documentation
- [ ] ♻️ Refactor
- [ ] 🔧 CI / build / tooling

## Checklist

- [ ] I ran the checks relevant to this PR
- [ ] I updated tests or docs if needed
- [ ] I included output or screenshots when useful

### Fork governance (omnisurge)

- [ ] Change class recorded (C0 / C1 / C2 / C3)
- [ ] C2/C3: ADR added or updated and indexed under `docs/adr/`
- [ ] C1/C2/C3: evidence file added under `docs/evidence/` and indexed; C0: `ci:fork:docs` result recorded in this PR
- [ ] Ran `npm run ci:fork` for code changes, `ci:fork:docs` for C0 docs, or `ci:fork:full` before release
- [ ] Docs sidebar/index updated and `npm run check:docs` passed (if docs changed)
- [ ] No secrets or real data; fork identity (`name`, `private`) unchanged

### Documentation (if adding/modifying an adapter)

- [ ] Added doc page under `docs/adapters/` (if new adapter)
- [ ] Updated `docs/adapters/index.md` table (if new adapter)
- [ ] Updated sidebar in `docs/.vitepress/config.mts` (if new adapter)
- [ ] Updated `README.md` / `README.zh-CN.md` when command discoverability changed
- [ ] Used positional args for the command's primary subject unless a named flag is clearly better
- [ ] Normalized expected adapter failures to `CliError` subclasses instead of raw `Error`

## Screenshots / Output

<!-- If applicable, paste CLI output or screenshots here. -->
