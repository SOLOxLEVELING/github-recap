/**
 * Cache Manager
 *
 * Provides smart caching for GitHub data to avoid unnecessary API calls.
 * Caches repository and commit data with expiration based on age.
 *
 * Cache storage:
 * - Location: .cache/ folder in project root
 * - Format: github-data-[username]-[year].json
 * - Structure: { repos, commits, fetchedAt, year, username }
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const CACHE_DIR = '.cache'

/**
 * Gets the cache key for a username and year.
 *
 * @param {string} username - GitHub username
 * @param {number} year - Year
 * @returns {string} Cache key
 */
export function getCacheKey(username, year) {
  return `github-data-${username}-${year}`
}

/**
 * Gets the full cache file path for a username and year.
 *
 * @param {string} username - GitHub username
 * @param {number} year - Year
 * @returns {string} Full path to cache file
 */
export function getCachePath(username, year) {
  const filename = `${getCacheKey(username, year)}.json`
  return path.join(process.cwd(), CACHE_DIR, filename)
}

/**
 * Checks if cache exists and is still valid.
 *
 * @param {string} username - GitHub username
 * @param {number} year - Year
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 * @returns {Promise<Object>} { valid: boolean, age: number, path: string }
 */
export async function isCacheValid(username, year, maxAgeHours = 24) {
  const cachePath = getCachePath(username, year)

  // Check if cache file exists
  if (!existsSync(cachePath)) {
    return {
      valid: false,
      age: null,
      path: cachePath,
    }
  }

  try {
    // Read cache file to check timestamp
    const cacheContent = await fs.readFile(cachePath, 'utf-8')
    const cacheData = JSON.parse(cacheContent)

    // Check if cache has required fields
    if (!cacheData.fetchedAt) {
      return {
        valid: false,
        age: null,
        path: cachePath,
      }
    }

    // Calculate age in hours
    const ageMs = Date.now() - cacheData.fetchedAt
    const ageHours = ageMs / (1000 * 60 * 60)

    // Check if cache is still valid
    const valid = ageHours < maxAgeHours

    return {
      valid,
      age: ageHours,
      path: cachePath,
    }
  } catch (error) {
    // Cache file corrupted or unreadable
    return {
      valid: false,
      age: null,
      path: cachePath,
    }
  }
}

/**
 * Saves data to cache.
 *
 * @param {string} username - GitHub username
 * @param {number} year - Year
 * @param {Object} data - Data to cache: { repos, commits }
 * @returns {Promise<string>} Path to cache file
 */
export async function saveToCache(username, year, data) {
  const cachePath = getCachePath(username, year)
  const cacheDir = path.dirname(cachePath)

  try {
    // Create .cache directory if it doesn't exist
    if (!existsSync(cacheDir)) {
      await fs.mkdir(cacheDir, { recursive: true })
    }

    // Prepare cache data with metadata
    const cacheData = {
      username,
      year,
      fetchedAt: Date.now(),
      repos: data.repos || [],
      commits: data.commits || [],
    }

    // Write cache file with pretty printing
    await fs.writeFile(
      cachePath,
      JSON.stringify(cacheData, null, 2),
      'utf-8'
    )

    return cachePath
  } catch (error) {
    // If we can't create cache directory, warn but don't fail
    console.warn(
      `⚠️  Warning: Could not save cache to ${cachePath}: ${error.message}`
    )
    throw error
  }
}

/**
 * Loads data from cache.
 *
 * @param {string} username - GitHub username
 * @param {number} year - Year
 * @returns {Promise<Object|null>} { repos, commits } or null if not found
 */
export async function loadFromCache(username, year) {
  const cachePath = getCachePath(username, year)

  // Check if cache file exists
  if (!existsSync(cachePath)) {
    return null
  }

  try {
    // Read and parse cache file
    const cacheContent = await fs.readFile(cachePath, 'utf-8')
    const cacheData = JSON.parse(cacheContent)

    // Return cached data
    return {
      repos: cacheData.repos || [],
      commits: cacheData.commits || [],
    }
  } catch (error) {
    // Cache file corrupted - delete it and return null
    try {
      await fs.unlink(cachePath)
    } catch (unlinkError) {
      // Ignore unlink errors
    }
    return null
  }
}

/**
 * Clears cache files.
 *
 * @param {string|null} username - Username to clear (null = all)
 * @param {number|null} year - Year to clear (null = all for username)
 * @returns {Promise<string[]>} List of deleted file paths
 */
export async function clearCache(username = null, year = null) {
  const cacheDir = path.join(process.cwd(), CACHE_DIR)
  const deletedFiles = []

  // If cache directory doesn't exist, nothing to clear
  if (!existsSync(cacheDir)) {
    return deletedFiles
  }

  try {
    if (username === null && year === null) {
      // Delete entire cache directory
      const files = await fs.readdir(cacheDir)
      for (const file of files) {
        const filePath = path.join(cacheDir, file)
        await fs.unlink(filePath)
        deletedFiles.push(filePath)
      }
      // Remove directory itself
      await fs.rmdir(cacheDir)
    } else if (year === null) {
      // Delete all caches for this username
      const files = await fs.readdir(cacheDir)
      const prefix = `github-data-${username}-`
      for (const file of files) {
        if (file.startsWith(prefix)) {
          const filePath = path.join(cacheDir, file)
          await fs.unlink(filePath)
          deletedFiles.push(filePath)
        }
      }
    } else {
      // Delete specific cache file
      const cachePath = getCachePath(username, year)
      if (existsSync(cachePath)) {
        await fs.unlink(cachePath)
        deletedFiles.push(cachePath)
      }
    }

    return deletedFiles
  } catch (error) {
    throw new Error(`Failed to clear cache: ${error.message}`)
  }
}

/**
 * Formats cache age for display.
 *
 * @param {number} ageHours - Age in hours
 * @returns {string} Formatted age string
 */
export function formatCacheAge(ageHours) {
  if (ageHours < 1) {
    const minutes = Math.round(ageHours * 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (ageHours < 24) {
    const hours = Math.round(ageHours)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.round(ageHours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}
