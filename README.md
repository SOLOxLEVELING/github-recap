# GitHub Recap 🎉

> Beautiful terminal-based GitHub year in review - like Spotify Wrapped for your code!

![GitHub Recap](https://img.shields.io/badge/GitHub-Recap-blue?style=for-the-badge&logo=github)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

## ✨ Features

- 📊 **Comprehensive Statistics** - Total commits, top repositories, and activity patterns
- 🔥 **Streak Tracking** - Longest coding streak with date ranges
- 📅 **Activity Analysis** - Most active day, month, and day-of-week breakdown
- 💬 **Commit Message Insights** - Word frequency analysis and message patterns
- 🎨 **Beautiful Terminal UI** - Animated screens with Ink (React for CLI)
- ⚡ **Smart Caching** - Instant subsequent runs (< 1 second)
- 🚀 **Parallel Fetching** - 5x faster with batched parallel processing
- 💾 **Export Options** - Save to text or JSON format
- 🎯 **Flexible Filtering** - Filter by repo, year, public/private status

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/SOLOxLEVELING/github-recap.git
cd github-recap
npm install
```

### Setup GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:user` (Read user profile data)
4. Generate token and copy it
5. Create `.env` file in project root:

```bash
cp .env.example .env
```

6. Edit `.env` and add your token:

```env
GITHUB_TOKEN=ghp_your_token_here
```

### Basic Usage

```bash
# View your 2025 recap
node src/index.js

# Specific year
node src/index.js --year 2024

# Single repository
node src/index.js --repo my-project

# Force refresh cache
node src/index.js --refresh

# Clear cache
node src/index.js --clear-cache
```

## 📊 What You'll See

GitHub Recap displays comprehensive statistics about your coding activity:

### Overview
- **Total Commits** - Your productivity at a glance
- **Total Repositories** - How many projects you contributed to
- **Date Range** - First and last commit dates

### Activity Patterns
- **Most Active Day** - Your peak productivity day
- **Most Active Month** - Your most productive month
- **Longest Streak** - Consecutive days of commits
- **Day of Week Breakdown** - Visual bar chart of commits by day

### Commit Insights
- **Top Words** - Most frequently used words in commit messages
- **Average Message Length** - How verbose your commits are
- **Common First Words** - Your commit message patterns
- **Top Repositories** - Your most active projects

### Animated Screens
The tool displays beautiful animated screens showing:
1. 🎉 Welcome screen with total commits
2. 🏆 Top repositories
3. 🔥 Longest streak
4. 📅 Activity patterns
5. 💬 Commit message insights

## ⚡ Performance

| Run Type | Time | Cache Status |
|----------|------|--------------|
| **First run** | 8-10s | Creates cache |
| **Subsequent runs** | <1s | Uses cache |
| **With --refresh** | 8-10s | Updates cache |

**Before optimization:** ~30-38 seconds (sequential fetching)  
**After optimization:** ~8-10 seconds (parallel batching)  
**Speedup:** ~4-5x faster! 🚀

Cache expires after 24 hours by default (configurable with `--cache-max-age`).

## 🎨 CLI Options

### Basic Options

```bash
-y, --year <year>              Specify year (default: current year)
-r, --repo <name>              Analyze single repository
--public-only                  Only include public repositories
-e, --exclude <repos>          Exclude repos (comma-separated)
```

### Cache Options

```bash
--no-cache                     Skip cache entirely (fetch fresh)
--refresh                      Force refresh (fetch fresh, update cache)
--clear-cache                  Clear all cached data and exit
--cache-max-age <hours>        Cache expiration in hours (default: 24)
```

### Performance Options

```bash
--batch-size <n>               Parallel fetch size (default: 5)
--no-animation                 Skip animated screens
```

### Examples

```bash
# View 2024 recap
node src/index.js --year 2024

# Analyze specific repository
node src/index.js --repo SOLOxLEVELING/github-recap

# Only public repos for 2023
node src/index.js --year 2023 --public-only

# Exclude test repos
node src/index.js --exclude "test-repo,demo-repo"

# Force fresh data
node src/index.js --refresh

# Use cache if less than 12 hours old
node src/index.js --cache-max-age 12

# Fetch 10 repos in parallel (faster but more API calls)
node src/index.js --batch-size 10

# Smaller batch size for rate limit safety
node src/index.js --batch-size 3 --refresh

# Skip animations for quick summary
node src/index.js --no-animation
```

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime (ES6 modules)
- **Octokit** - Official GitHub REST API client
- **Ink** - React renderer for CLI applications
- **Commander** - Command-line argument parsing
- **Chalk** - Terminal string styling
- **Boxen** - Beautiful terminal boxes
- **date-fns** - Modern date utility library
- **dotenv** - Environment variable management

## 📁 Project Structure

```
github-recap/
├── src/
│   ├── index.js              # Entry point & main orchestration
│   ├── auth/
│   │   └── githubAuth.js     # GitHub authentication
│   ├── data/
│   │   ├── fetchRepos.js     # Repository fetching
│   │   ├── fetchCommits.js   # Commit fetching
│   │   └── dataCollector.js  # Parallel data collection
│   ├── stats/
│   │   ├── statsCalculator.js # Statistics calculation
│   │   └── messageAnalyzer.js # Commit message analysis
│   ├── ui/
│   │   ├── LoadingScreen.js  # Loading spinner
│   │   └── RecapScreen.js    # Animated recap display
│   ├── cache/
│   │   └── cacheManager.js   # Smart caching system
│   └── utils/
│       ├── cli.js            # CLI argument parsing
│       └── saveRecap.js      # Export to file
├── .cache/                    # Cached data (gitignored)
├── .env                       # GitHub token (gitignored)
├── .env.example               # Environment template
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🔧 How It Works

### 1. Authentication
- Loads GitHub token from `.env`
- Authenticates with GitHub API using Octokit
- Verifies access and retrieves username

### 2. Data Collection
- **Parallel Fetching**: Repos are split into batches (default: 5)
- **Batch Processing**: Each batch fetches in parallel using `Promise.all()`
- **Smart Caching**: Results cached for 24 hours (configurable)
- **Error Handling**: Failed repos don't stop the entire process

### 3. Statistics Calculation
- Total commits and repository count
- Streak calculation (consecutive days)
- Activity patterns (day, month, day-of-week)
- Commit message word frequency
- Top repositories by commit count

### 4. Display
- Animated terminal UI using Ink (React for CLI)
- Beautiful boxed sections with Chalk styling
- Progress indicators during data fetching
- Export options for saving results

## 🚀 Performance Optimization

### Parallel Fetching

The tool uses **batched parallel fetching** to dramatically improve performance:

- **Sequential (old)**: Fetch repos one at a time → ~30-38 seconds
- **Parallel (new)**: Fetch 5 repos simultaneously → ~8-10 seconds

**How it works:**
1. Split repos into batches of 5 (configurable)
2. Process each batch in parallel using `Promise.all()`
3. Process batches sequentially to respect rate limits
4. Continue on individual repo failures

**Rate Limit Safety:**
- GitHub API: 5000 requests/hour for authenticated users
- Default batch size: 5 (safe for most users)
- Configurable via `--batch-size` flag
- Smaller batches = slower but safer for rate limits

### Smart Caching

- **First run**: Fetches from GitHub, saves to `.cache/`
- **Subsequent runs**: Loads from cache (< 1 second)
- **Cache expiration**: 24 hours (configurable)
- **Cache invalidation**: Use `--refresh` to force update

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Use ES6 modules (`import`/`export`)
- Follow existing code style
- Add JSDoc comments for functions
- Test with different scenarios (public/private repos, various years)
- Update README if adding new features

## 📝 Troubleshooting

### "Authentication failed"
- Verify your `.env` file exists and contains valid token
- Check token has `repo` and `read:user` scopes
- Ensure token hasn't expired

### "Rate limit exceeded"
- Reduce batch size: `--batch-size 3`
- Wait for rate limit to reset (check: https://api.github.com/rate_limit)
- Use cache: remove `--refresh` flag

### "No commits found"
- Verify you have commits in the specified year
- Check repository access (private repos need `repo` scope)
- Try with `--public-only` to test

### Cache issues
- Clear cache: `node src/index.js --clear-cache`
- Force refresh: `node src/index.js --refresh`
- Check `.cache/` directory permissions

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🌟 Acknowledgments

- Inspired by Spotify Wrapped
- Built with love for the GitHub community
- Thanks to all open-source contributors

---

**Made with ❤️ by [SOLOxLEVELING](https://github.com/SOLOxLEVELING)**

*Star ⭐ this repo if you found it helpful!*
