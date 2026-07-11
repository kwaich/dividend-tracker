# Changelog

All notable changes to the dividend-tracker addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-07-11

### Added

- Withholding tax for suggested dividends. Enter a withholding rate (%) above
  the suggestions table to pre-fill each new row's tax as `amount × rate`; each
  row's tax stays individually editable. Saved dividends keep the gross amount
  and record the withholding in the activity's tax field, so the host credits
  the net cash. The last-used rate is remembered between sessions.

## [1.2.0] - 2026-07-08

### Fixed

- Saved dividends now flip to "existing" without reloading the page. In the
  Wealthfolio 3.6 iframe sandbox, query invalidations went to the host's query
  cache instead of the addon's own, so the table never refreshed after saving.
- Refresh and Retry now actually update the table: market dividends, asset
  profiles, and position activities ignored refetched data once initially
  loaded.
- "Refresh suggestions" refreshes all inputs (accounts, holdings, asset
  profiles, activities, and dividend data), so changes made in Wealthfolio
  itself are picked up too — and the refresh icon spins while data is being
  refetched.

### Added

- GitHub Actions CI: format check, type check, lint, build, and tests on every
  push and pull request.

### Changed

- Declared the `ui.onDisable` permission in the manifest.

## [1.1.2] - 2026-07-04

### Changed

- Updated for compatibility with Wealthfolio 3.6.0 and
  `@wealthfolio/addon-sdk` 3.6.0.
- Updated addon navigation to use the host-supported `receipt` icon token.
- Added the missing `query.invalidateQueries` permission declaration.

## [1.1.1] - 2026-06-09

### Changed

- Updated for compatibility with Wealthfolio 3.5.1. No changes to how the addon
  works.

## [1.1.0] - 2026-05-26

### Changed

- Require Wealthfolio and `@wealthfolio/addon-sdk` 3.5.0.
- Fetch dividends through the provider-neutral market data API with symbol,
  exchange, instrument type, and quote currency context.
- Update manifest permissions to declare `market-data.fetchDividends` and
  `assets.getProfile` separately.
- Fetch up to 5 years of dividend history using the Wealthfolio 3.5.0 default
  lookback.

## [1.0.0] - 2026-03-02

### Added

- Fetch up to 2 years of dividend history from Yahoo Finance (no API key required)
- Quantity timeline: reconstructs share count at each ex-date from BUY/SELL/SPLIT/TRANSFER
  activities, so only dividends you were eligible for are surfaced
- Duplicate detection with ±3 day window to handle ex-date vs. pay-date differences
- **Suggestions tab**: review missing dividends, edit amount or account inline, bulk-add
- **History tab**: browse existing DIVIDEND activities most-recent-first
- Unit tests for `quantity-timeline`, `is-duplicate`, `market-dividends`, `history-tab`,
  and `dividend-page`
