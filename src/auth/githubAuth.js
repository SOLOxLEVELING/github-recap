/**
 * GitHub Authentication Module
 *
 * Handles authentication with GitHub's API using personal access tokens.
 * Validates token presence and format, sets up Octokit client with proper
 * authentication headers, and provides error handling for authentication failures.
 */

import dotenv from 'dotenv'
import { Octokit } from 'octokit'

// Load environment variables from .env file
// Why environment variables?
// - Security: Keeps sensitive tokens out of source code
// - Flexibility: Different tokens for different environments (dev, prod)
// - Best practice: Never commit secrets to version control
// - Easy configuration: Users can set up their token without modifying code
dotenv.config()

/**
 * Creates and returns an authenticated Octokit client instance.
 *
 * What is Octokit?
 * - Octokit is the official GitHub API client library for JavaScript/Node.js
 * - It provides a clean, type-safe interface to interact with GitHub's REST and GraphQL APIs
 * - Handles authentication, rate limiting, pagination, and error handling automatically
 * - Supports both REST API v3 and GraphQL API v4
 *
 * How authentication works:
 * - GitHub uses Personal Access Tokens (PATs) for API authentication
 * - The token is passed in the Authorization header as: "token YOUR_TOKEN"
 * - Octokit automatically handles this when you pass the token to the constructor
 * - The token must have appropriate scopes (permissions) to access the data you need
 *
 * @returns {Octokit} An authenticated Octokit instance ready to make API calls
 * @throws {Error} If GITHUB_TOKEN is not set in environment variables
 */
export function getAuthenticatedClient() {
  // Load the GitHub token from environment variables
  const token = process.env.GITHUB_TOKEN

  // Validate that the token exists
  if (!token) {
    throw new Error(
      '❌ GITHUB_TOKEN is not set!\n\n' +
        'Please create a .env file in the project root with:\n' +
        'GITHUB_TOKEN=your_github_personal_access_token_here\n\n' +
        'To create a token:\n' +
        '1. Go to https://github.com/settings/tokens\n' +
        '2. Click "Generate new token (classic)"\n' +
        '3. Select scopes: repo, read:user\n' +
        '4. Copy the token and add it to your .env file'
    )
  }

  // Validate token format (GitHub tokens are typically 40+ characters)
  if (token.length < 20) {
    throw new Error(
      '❌ Invalid GITHUB_TOKEN format!\n\n' +
        'GitHub tokens are typically 40+ characters long.\n' +
        'Please check your .env file and ensure the token is correct.'
    )
  }

  try {
    // Create and return an authenticated Octokit instance
    // The auth option automatically adds the token to all API requests
    const octokit = new Octokit({
      auth: token,
    })

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
          'Please generate a new token at https://github.com/settings/tokens\n' +
          'and update your .env file.'
      )
    } else if (error.status === 403) {
      throw new Error(
        '❌ Access forbidden!\n\n' +
          'Your GITHUB_TOKEN does not have the required permissions.\n' +
          'Please ensure your token has the following scopes:\n' +
          '- repo (for accessing repository data)\n' +
          '- read:user (for reading user information)'
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
