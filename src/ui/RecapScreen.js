/**
 * Recap Screen Component - Updated with Hybrid Navigation
 */

import React, { useState, useEffect } from 'react'
import { Box, Text, Newline } from 'ink'
import { useInput } from 'ink'
import chalk from 'chalk'
import figlet from 'figlet'
import { format, parseISO } from 'date-fns'
import { saveRecapToFile, saveRecapAsJSON } from '../utils/saveRecap.js'

function createAsciiText(text, font = 'Standard') {
  try {
    return figlet.textSync(text, { font })
  } catch (error) {
    return text
  }
}

function createProgressBar(percentage, width = 30) {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
}

function ScreenIndicator({ current, total }) {
  return React.createElement(
    Box,
    { position: 'absolute', top: 0, right: 1 },
    React.createElement(Text, null, chalk.gray(`Screen ${current}/${total}`))
  )
}

function CountdownPrompt({ seconds }) {
  return React.createElement(
    Box,
    { position: 'absolute', bottom: 1, left: 0, right: 0, justifyContent: 'center' },
    React.createElement(
      Text,
      null,
      chalk.green(`Press Enter to continue or wait ${seconds}s... (${seconds})`)
    )
  )
}

function WelcomeScreen({ year, dots = '' }) {
  const title = createAsciiText('GITHUB RECAP', 'Big')
  const yearText = createAsciiText(year.toString(), 'Big')
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 1, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold(title)),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.magenta.bold(yearText)),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.yellow('Calculating your impact'), dots)
  )
}

function TotalCommitsScreen({ totalCommits, year }) {
  const commitNumber = createAsciiText(totalCommits.toString(), 'Big')
  let message = ''
  let emoji = ''
  if (totalCommits === 0) {
    message = 'Getting started! 🌱'
    emoji = '🌱'
  } else if (totalCommits <= 50) {
    message = 'Every commit counts! 🌱'
    emoji = '🌱'
  } else if (totalCommits <= 200) {
    message = 'Solid consistency! 💪'
    emoji = '💪'
  } else if (totalCommits <= 500) {
    message = 'Impressive dedication! 🔥'
    emoji = '🔥'
  } else {
    message = 'Absolute legend! 🏆'
    emoji = '🏆'
  }
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 2, total: 8 }),
    React.createElement(Text, null, chalk.green.bold(commitNumber)),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.white(`You made ${chalk.green.bold(totalCommits.toLocaleString())} commits in ${chalk.cyan.bold(year)}!`)),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.yellow.bold(message), ' ', emoji)
  )
}

function TopRepositoryScreen({ topRepo }) {
  if (!topRepo) return null
  const repoName = topRepo.repo.length > 30 ? topRepo.repo.substring(0, 27) + '...' : topRepo.repo
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 3, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold('Your top project was...')),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.magenta.bold(createAsciiText(repoName.split('/').pop(), 'Standard'))),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.blue(repoName)),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.white(`${chalk.green.bold(topRepo.count.toLocaleString())} commits (${chalk.yellow.bold(topRepo.percentage + '%')})`)),
    React.createElement(Newline),
    React.createElement(Text, null, createProgressBar(topRepo.percentage))
  )
}

function StreakScreen({ streak }) {
  if (!streak || streak.days === 0) return null
  const streakNumber = createAsciiText(streak.days.toString(), 'Big')
  const fireEmojis = '🔥'.repeat(Math.min(streak.days, 10))
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 4, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold('Your longest coding streak:')),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.red.bold(streakNumber), ' ', chalk.yellow('days')),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.white(`${format(parseISO(streak.startDate), 'MMM d')} - ${format(parseISO(streak.endDate), 'MMM d')}`)),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.yellow(fireEmojis))
  )
}

function MostActiveDayScreen({ activeDay }) {
  if (!activeDay) return null
  const dayName = createAsciiText(activeDay.dayName.toUpperCase(), 'Standard')
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 5, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold('Your most productive day was...')),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.magenta.bold(dayName)),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.white(format(parseISO(activeDay.date), 'MMMM d, yyyy'))),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.green.bold(activeDay.count), ' ', chalk.white('commits')),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.yellow('📅'))
  )
}

function TopWordsScreen({ topWords }) {
  if (!topWords || topWords.length === 0) return null
  const colors = [chalk.cyan, chalk.magenta, chalk.green, chalk.yellow, chalk.blue]
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 6, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold('You said these words most:')),
    React.createElement(Newline),
    React.createElement(Newline),
    ...topWords.slice(0, 5).map((item, index) => {
      const color = colors[index % colors.length]
      const wordText = item.count > 10 ? createAsciiText(item.word, 'Standard') : item.word.toUpperCase()
      return React.createElement(
        React.Fragment,
        { key: index },
        React.createElement(Text, null, color.bold(wordText)),
        React.createElement(Text, null, chalk.gray(` (${item.count} times)`)),
        React.createElement(Newline)
      )
    })
  )
}

function WeekHeatmapScreen({ commitsByDay }) {
  if (!commitsByDay || commitsByDay.length === 0) return null
  const maxCount = Math.max(...commitsByDay.map((d) => d.count), 1)
  const mostActive = commitsByDay.reduce((max, day) => day.count > max.count ? day : max, commitsByDay[0])
  const patternMessage = mostActive.count > 0 ? `${mostActive.day.substring(0, 3)} warrior! 💪` : ''
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 7, total: 8 }),
    React.createElement(Text, null, chalk.cyan.bold('Your weekly rhythm:')),
    React.createElement(Newline),
    React.createElement(Newline),
    ...commitsByDay.map(({ day, count }, index) => {
      const barLength = Math.round((count / maxCount) * 20)
      const bar = '█'.repeat(barLength)
      const color = count === maxCount ? chalk.green : chalk.cyan
      return React.createElement(
        React.Fragment,
        { key: index },
        React.createElement(Text, null, chalk.white(day.substring(0, 3).padEnd(4)), color(bar.padEnd(20)), chalk.green.bold(` ${count}`)),
        React.createElement(Newline)
      )
    }),
    React.createElement(Newline),
    patternMessage && React.createElement(Text, null, chalk.yellow.bold(patternMessage))
  )
}

function FinalSummaryScreen({ stats, year }) {
  let message = ''
  if (stats.totalCommits === 0) {
    message = 'Every commit is a step forward! Keep building! 🌱'
  } else if (stats.totalCommits <= 50) {
    message = 'Every commit is a step forward! Keep building! 🌱'
  } else if (stats.totalCommits <= 150) {
    message = 'Solid consistency! You\'re building momentum! 💪'
  } else if (stats.totalCommits <= 300) {
    message = 'Impressive dedication! You shipped real work! 🔥'
  } else if (stats.totalCommits <= 500) {
    message = 'Outstanding productivity! You\'re a shipping machine! 🚀'
  } else {
    message = 'Absolutely legendary! Your commit graph is on fire! 🏆'
  }
  const lines = []
  lines.push('╔═══════════════════════════════════════════════════════════╗')
  lines.push(`║              🎉 YOUR ${year} GITHUB YEAR IN REVIEW 🎉        ║`)
  lines.push('╠═══════════════════════════════════════════════════════════╣')
  lines.push('║                                                           ║')
  lines.push('║  📊 THE NUMBERS                                           ║')
  lines.push(`║     • ${stats.totalCommits.toLocaleString()} commits across ${stats.totalRepos} repositories                 ║`)
  if (stats.longestStreak) {
    const startDate = format(parseISO(stats.longestStreak.startDate), 'MMM d')
    const endDate = format(parseISO(stats.longestStreak.endDate), 'MMM d')
    lines.push(`║     • ${stats.longestStreak.days}-day longest streak (${startDate} - ${endDate})            ║`)
  }
  if (stats.mostActiveDay) {
    lines.push(`║     • Most active: ${stats.mostActiveDay.dayName} with ${stats.mostActiveDay.count} commits             ║`)
  }
  lines.push('║                                                           ║')
  if (stats.topRepos && stats.topRepos.length > 0) {
    const topRepo = stats.topRepos[0]
    lines.push('║  🏆 TOP REPOSITORY                                        ║')
    const repoName = topRepo.repo.length > 40 ? topRepo.repo.substring(0, 37) + '...' : topRepo.repo
    lines.push(`║     ${repoName.padEnd(55)} ║`)
    lines.push(`║     ${topRepo.count.toLocaleString()} commits (${topRepo.percentage}%)${' '.repeat(40)} ║`)
    lines.push('║                                                           ║')
  }
  lines.push('║  💬 YOUR CODING STYLE                                     ║')
  if (stats.topWords && stats.topWords.length > 0) {
    const topWord = stats.topWords[0]
    lines.push(`║     • "${topWord.word}" appeared ${topWord.count} times in commits      ║`)
  }
  if (stats.messageStats) {
    lines.push(`║     • Average ${stats.messageStats.avgLength} words per commit message            ║`)
  }
  if (stats.mostActiveDay) {
    const date = format(parseISO(stats.mostActiveDay.date), 'MMM d, yyyy')
    lines.push(`║     • Most productive day: ${date} (${stats.mostActiveDay.count} commits)  ║`)
  }
  lines.push('║                                                           ║')
  if (stats.topRepos && stats.topRepos.length > 0) {
    lines.push('║  🎯 TOP 5 REPOSITORIES                                    ║')
    stats.topRepos.slice(0, 5).forEach((repo, index) => {
      const name = repo.repo.length > 30 ? repo.repo.substring(0, 27) + '...' : repo.repo
      lines.push(`║     ${index + 1}. ${name.padEnd(30)} ${repo.count.toLocaleString().padStart(6)} commits (${repo.percentage}%) ║`)
    })
    lines.push('║                                                           ║')
  }
  lines.push(`║  ⭐ ${message.padEnd(55)} ║`)
  lines.push('║                                                           ║')
  lines.push('╚═══════════════════════════════════════════════════════════╝')
  return React.createElement(
    Box,
    { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 2, position: 'relative' },
    React.createElement(ScreenIndicator, { current: 8, total: 8 }),
    React.createElement(Text, null, chalk.cyan(lines.join('\n'))),
    React.createElement(Newline),
    React.createElement(Newline),
    React.createElement(Text, null, chalk.green('Press S to save recap | Press Q to quit'))
  )
}

export function RecapScreen({ stats, year, noAnimation = false, onSave, onQuit }) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [dots, setDots] = useState('')
  const [countdown, setCountdown] = useState(5)
  const [saving, setSaving] = useState(false)
  const totalScreens = 8
  const isFinalScreen = currentScreen === totalScreens - 1

  useEffect(() => {
    if (currentScreen === 0 && !noAnimation) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [currentScreen, noAnimation])

  useEffect(() => {
    if (noAnimation || isFinalScreen) return
    setCountdown(5)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (currentScreen < totalScreens - 1) {
            setCurrentScreen((prevScreen) => prevScreen + 1)
          }
          return 5
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [currentScreen, noAnimation, isFinalScreen])

  useInput((input, key) => {
    if (key.return || input === ' ') {
      if (!isFinalScreen && currentScreen < totalScreens - 1) {
        setCurrentScreen((prev) => prev + 1)
        setCountdown(5)
      }
    } else if (input.toLowerCase() === 'q') {
      if (onQuit) onQuit()
    } else if (input.toLowerCase() === 's' && isFinalScreen) {
      if (onSave && !saving) {
        setSaving(true)
        onSave(stats, year).finally(() => setSaving(false))
      }
    }
  })

  useEffect(() => {
    if (noAnimation) setCurrentScreen(totalScreens - 1)
  }, [noAnimation])

  const screenProps = {
    year,
    totalCommits: stats.totalCommits,
    topRepo: stats.topRepos && stats.topRepos.length > 0 ? stats.topRepos[0] : null,
    streak: stats.longestStreak,
    activeDay: stats.mostActiveDay,
    topWords: stats.topWords,
    commitsByDay: stats.commitsByDay,
    stats: {
      totalRepos: stats.totalRepos,
      totalCommits: stats.totalCommits,
      longestStreak: stats.longestStreak,
      mostActiveDay: stats.mostActiveDay,
      topRepos: stats.topRepos,
      topWords: stats.topWords,
      messageStats: stats.messageStats,
    },
  }

  const screens = [
    React.createElement(WelcomeScreen, { key: 0, year, dots }),
    React.createElement(TotalCommitsScreen, { key: 1, ...screenProps }),
    React.createElement(TopRepositoryScreen, { key: 2, ...screenProps }),
    React.createElement(StreakScreen, { key: 3, ...screenProps }),
    React.createElement(MostActiveDayScreen, { key: 4, ...screenProps }),
    React.createElement(TopWordsScreen, { key: 5, ...screenProps }),
    React.createElement(WeekHeatmapScreen, { key: 6, ...screenProps }),
    React.createElement(FinalSummaryScreen, { key: 7, ...screenProps }),
  ]

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%', position: 'relative' },
    screens[currentScreen],
    !isFinalScreen && !noAnimation && React.createElement(CountdownPrompt, { seconds: countdown }),
    saving && React.createElement(
      Box,
      { position: 'absolute', bottom: 3, left: 0, right: 0, justifyContent: 'center' },
      React.createElement(Text, null, chalk.yellow('Saving recap...'))
    )
  )
}
