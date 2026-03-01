# Changelog

All notable changes to the dividend-tracker addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-02

### Added
- Fetch up to 2 years of dividend history from Yahoo Finance (no API key required)
- Quantity timeline: reconstructs share count at each ex-date from BUY/SELL/SPLIT/TRANSFER
  activities, so only dividends you were eligible for are surfaced
- Duplicate detection with ±3 day window to handle ex-date vs. pay-date differences
- **Suggestions tab**: review missing dividends, edit amount or account inline, bulk-add
- **History tab**: browse existing DIVIDEND activities most-recent-first
- Unit tests for `quantity-timeline`, `is-duplicate`, `yahoo-dividends`, `history-tab`,
  and `dividend-page`
