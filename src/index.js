#!/usr/bin/env node

/**
 * Main entry point for the GitHub Recap CLI tool.
 *
 * This file initializes the CLI application, sets up command-line argument parsing,
 * loads environment variables, and orchestrates the flow of data collection,
 * statistics calculation, and UI rendering to display the user's GitHub year in review.
 */

import chalk from 'chalk'
import { testAuthentication } from './auth/githubAuth.js'
import { fetchAllRepos } from './data/fetchRepos.js'

/**
 * Main function that runs the GitHub Recap application.
 * Tests authentication and displays success/error messages.
 */
async function main() {
  try {
    // Display welcome message
    console.log(chalk.cyan.bold('\n🎉 GitHub Recap - Year in Review\n'))

    // Test authentication with GitHub API
    console.log(chalk.yellow('🔐 Testing authentication...\n'))

    const username = await testAuthentication()

    // Display success message with username
    console.log(
      chalk.green('✅ Authentication successful!\n') +
        chalk.white(`   Logged in as: ${chalk.bold.cyan(username)}\n`)
    )

    // Fetch all repositories
    console.log(chalk.yellow('📦 Fetching repositories...\n'))

    const repos = await fetchAllRepos({
      publicOnly: false,
      excludeRepos: [],
    })

    // Display repository count and sample
    console.log(
      chalk.green(`✅ Found ${chalk.bold(repos.length)} repositories!\n`)
    )

    // Show first 5 repositories as a test
    if (repos.length > 0) {
      console.log(chalk.white('📋 Sample repositories:\n'))
      repos.slice(0, 5).forEach((repo, index) => {
        const language = repo.language ? chalk.gray(` (${repo.language})`) : ''
        const visibility = repo.private
          ? chalk.red(' [private]')
          : chalk.green(' [public]')
        console.log(
          `   ${index + 1}. ${chalk.blue.bold(
            repo.full_name
          )}${language}${visibility}`
        )
      })
      if (repos.length > 5) {
        console.log(
          chalk.gray(`\n   ... and ${repos.length - 5} more repositories\n`)
        )
      } else {
        console.log() // Add spacing
      }
    } else {
      console.log(chalk.yellow('   No repositories found.\n'))
    }
  } catch (error) {
    // Handle errors gracefully with red color for visibility
    console.error(chalk.red.bold('\n❌ Error:\n'))
    console.error(chalk.red(error.message))
    console.error(
      chalk.gray('\nFor help, check the README or GitHub issues.\n')
    )

    // Exit with error code
    process.exit(1)
  }
}

// Run the main function
main()
