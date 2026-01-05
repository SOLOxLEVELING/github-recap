/**
 * Interactive Setup Module
 *
 * Guides users through GitHub token configuration on first run.
 */

import prompts from 'prompts'
import fs from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import os from 'os'
import chalk from 'chalk'
import boxen from 'boxen'
import { Octokit } from 'octokit'

const CONFIG_FILE = path.join(os.homedir(), '.github-recap')

/**
 * Checks if a valid GitHub token exists
 *
 * @returns {boolean} True if token exists in any location
 */
export function hasValidToken() {
  // Check environment variable
  if (process.env.GITHUB_TOKEN) {
    return true
  }

  // Check home directory config
  if (existsSync(CONFIG_FILE)) {
    return true
  }

  // Check current directory .env
  if (existsSync('.env')) {
    return true
  }

  return false
}

/**
 * Validates GitHub token format
 *
 * @param {string} token - Token to validate
 * @returns {boolean} True if token format is valid
 */
function isValidTokenFormat(token) {
  // GitHub tokens start with ghp_, gho_, ghu_, ghs_, or ghr_
  return /^gh[pousr]_[A-Za-z0-9_]{36,}$/.test(token)
}

/**
 * Tests if token works with GitHub API
 *
 * @param {string} token - Token to test
 * @returns {Promise<{valid: boolean, username?: string, error?: string}>}
 */
async function testToken(token) {
  try {
    const octokit = new Octokit({ auth: token })
    const { data: user } = await octokit.rest.users.getAuthenticated()
    return { valid: true, username: user.login }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

/**
 * Saves token to config file
 *
 * @param {string} token - GitHub token to save
 * @returns {Promise<void>}
 */
async function saveToken(token) {
  await fs.writeFile(CONFIG_FILE, `GITHUB_TOKEN=${token}\n`, 'utf-8')
  // Set file permissions to user-only (600)
  await fs.chmod(CONFIG_FILE, 0o600)
}

/**
 * Runs interactive setup flow
 *
 * @returns {Promise<boolean>} True if setup completed successfully
 */
export async function runInteractiveSetup() {
  console.clear()

  // Welcome message
  const welcomeMessage = chalk.cyan.bold('🎉 Welcome to GitHub Recap!')
  const subtitle = chalk.white(
    'Like Spotify Wrapped, but for your GitHub activity!'
  )

  console.log(
    boxen(`${welcomeMessage}\n\n${subtitle}`, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  )

  console.log(
    chalk.white(
      'To get started, you need a GitHub Personal Access Token.\n'
    )
  )

  // Instructions
  console.log(chalk.yellow.bold('📋 Quick Setup Steps:\n'))
  console.log(chalk.white('1. Visit: ') + chalk.blue.underline('https://github.com/settings/tokens/new'))
  console.log(chalk.white('2. Click ') + chalk.green('"Generate new token (classic)"'))
  console.log(chalk.white('3. Give it a name (e.g., ') + chalk.cyan('"GitHub Recap"') + chalk.white(')'))
  console.log(chalk.white('4. Select scopes:'))
  console.log(chalk.white('   ✓ ') + chalk.green('repo') + chalk.gray(' (Full control of private repositories)'))
  console.log(chalk.white('   ✓ ') + chalk.green('read:user') + chalk.gray(' (Read user profile data)'))
  console.log(chalk.white('5. Click ') + chalk.green('"Generate token"'))
  console.log(chalk.white('6. Copy the token (starts with ') + chalk.cyan('ghp_') + chalk.white(')'))
  console.log()

  // Prompt for token
  const response = await prompts({
    type: 'password',
    name: 'token',
    message: 'Paste your GitHub token here:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Token cannot be empty'
      }
      if (!isValidTokenFormat(value.trim())) {
        return 'Invalid token format. GitHub tokens start with ghp_, gho_, ghu_, ghs_, or ghr_'
      }
      return true
    },
  })

  // User cancelled
  if (!response.token) {
    console.log(chalk.yellow('\n⚠️  Setup cancelled.\n'))
    console.log(chalk.gray('You can run ') + chalk.cyan('github-recap setup') + chalk.gray(' anytime to configure your token.\n'))
    return false
  }

  const token = response.token.trim()

  // Validate token with GitHub API
  console.log(chalk.yellow('\n🔍 Validating token...\n'))

  const { valid, username, error } = await testToken(token)

  if (!valid) {
    console.log(chalk.red('❌ Token validation failed!\n'))
    console.log(chalk.gray(`Error: ${error}\n`))
    console.log(chalk.yellow('Please check your token and try again.\n'))
    console.log(chalk.gray('Run ') + chalk.cyan('github-recap setup') + chalk.gray(' to try again.\n'))
    return false
  }

  // Save token
  await saveToken(token)

  // Success message
  console.log(chalk.green('✅ Token validated successfully!\n'))
  console.log(chalk.white(`   Authenticated as: ${chalk.cyan.bold(username)}\n`))
  console.log(chalk.white(`   Token saved to: ${chalk.gray(CONFIG_FILE)}\n`))

  console.log(
    boxen(
      chalk.green.bold('🎉 You\'re all set!') +
        '\n\n' +
        chalk.white('GitHub Recap is now configured and ready to use.'),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  )

  return true
}

/**
 * Loads GitHub token from config file
 *
 * @returns {string|null} Token if found, null otherwise
 */
export function loadToken() {
  // 1. Check environment variable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN
  }

  // 2. Check home directory config
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, 'utf-8')
      const match = content.match(/GITHUB_TOKEN=(.+)/)
      if (match) {
        return match[1].trim()
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  // 3. Check current directory .env (for backward compatibility)
  if (existsSync('.env')) {
    try {
      const content = readFileSync('.env', 'utf-8')
      const match = content.match(/GITHUB_TOKEN=(.+)/)
      if (match) {
        return match[1].trim()
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  return null
}
