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
        chalk.white(`   Logged in as: ${chalk.bold.cyan(username)}\n`) +
        chalk.gray('   Ready to fetch your GitHub data...\n')
    )
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
