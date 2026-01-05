# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-05

### Added
- Initial release of GitHub Recap CLI tool
- **Interactive setup flow** for first-time users
  - Beautiful welcome screen with step-by-step instructions
  - Automatic token validation and configuration
  - Saves token to `~/.github-recap` in home directory
- Comprehensive GitHub commit statistics for any year
- **Parallel fetching** with configurable batch size (default: 5 repos)
  - 4-5x performance improvement (8-10s vs 30-38s)
- **Smart caching system** with 24-hour expiration (configurable)
  - Subsequent runs complete in <1 second
- **Beautiful animated terminal UI** using Ink (React for CLI)
- **Statistics tracking**:
  - Total commits and repository count
  - Longest coding streak with date ranges
  - Most active day and month
  - Commit patterns by day of week
  - Top repositories by commit count
  - Commit message word frequency analysis
  - Average message length and patterns
- **Flexible filtering options**:
  - Filter by year (`--year`)
  - Single repository analysis (`--repo`)
  - Public-only repositories (`--public-only`)
  - Exclude specific repositories (`--exclude`)
- **Cache management**:
  - Skip cache (`--no-cache`, `--refresh`)
  - Clear cache (`--clear-cache`)
  - Configure cache expiration (`--cache-max-age`)
- **Performance tuning**:
  - Configurable batch size (`--batch-size`)
  - Skip animations (`--no-animation`)
- **Export functionality**:
  - Save to text file
  - Save to JSON format
- **Error handling**:
  - Graceful degradation on repo failures
  - Helpful error messages
  - Rate limit safety

### Technical Details
- Built with Node.js and ES6 modules
- Uses Octokit for GitHub API integration
- Ink for terminal UI rendering
- Commander for CLI argument parsing
- Prompts for interactive user input
- Smart batched parallel processing for optimal performance
- Multi-location token loading (environment, home directory, .env)

[1.0.0]: https://github.com/SOLOxLEVELING/github-recap/releases/tag/v1.0.0
