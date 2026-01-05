/**
 * GitHub Authentication Module
 *
 * Handles authentication with GitHub's API using personal access tokens.
 */

import dotenv from 'dotenv'
import { Octokit } from 'octokit'
import { loadToken } from '../setup/interactiveSetup.js'

dotenv.config()

/**
 * Creates and returns an authenticated Octokit client instance.
 *
 * @returns {Octokit} An authenticated Octokit instance ready to make API calls
 * @throws {Error} If GITHUB_TOKEN is not set
 */
export function getAuthenticatedClient() {
  const token = loadToken()

  if (!token) {
    throw new Error(
      '❌ GITHUB_TOKEN is not set!\n\n' +
        'Run: github-recap setup\n' +
        'Or manually create ~/.github-recap with:\n' +
        'GITHUB_TOKEN=your_token_here'
    )
  }

  if (token.length < 20) {
    throw new Error(
      '❌ Invalid GITHUB_TOKEN format!\n\n' +
        'GitHub tokens are typically 40+ characters long.\n' +
        'Please check your token and try again.'
    )
  }

  try {
    const octokit = new Octokit({ auth: token })
    return octokit
  } catch (error) {
    throw new Error(
      `❌ Failed to create Octokit client: ${error.message}\n\n` +
        'Please check your GITHUB_TOKEN and try again.'
    )
  }
}

/**
 * Tests the authentication by fetching the current authenticated user's information.
 *
 * This function verifies that:
 * - The token is valid and not expired
 * - The token has the necessary permissions
 * - The connection to GitHub API is working
 *
 * @returns {Promise<string>} The username of the authenticated user
 * @throws {Error} If authentication fails or API request fails
 */
export async function testAuthentication() {
  try {
    // Get the authenticated client
    const octokit = getAuthenticatedClient()

    // Make a test API call to get the current user's information
    // This endpoint requires authentication and returns the user associated with the token
    const { data: user } = await octokit.rest.users.getAuthenticated()

    // Return the username for display
    return user.login
  } catch (error) {
    // Handle different types of errors with helpful messages
    if (error.status === 401) {
      throw new Error(
        '❌ Authentication failed!\n\n' +
          'Your GITHUB_TOKEN is invalid or expired.\n' +
          'Run: github-recap setup\n' +
          'Or visit: https://github.com/settings/tokens'
      )
    } else if (error.status === 403) {
      throw new Error(
        '❌ Access forbidden!\n\n' +
          'Your GITHUB_TOKEN does not have the required permissions.\n' +
          'Required scopes: repo, read:user\n' +
          'Run: github-recap setup'
      )
    } else if (error.message.includes('GITHUB_TOKEN')) {
      // Re-throw our custom token errors
      throw error
    } else {
      throw new Error(
        `❌ Failed to authenticate with GitHub: ${error.message}\n\n` +
          'Please check your internet connection and try again.'
      )
    }
  }
}
