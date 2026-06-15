"use server"

interface Quote {
  text: string
  author: string
}

interface ZenQuoteResponse {
  q: string
  a: string
}

const FALLBACK_QUOTES: Quote[] = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "Success is not the key to happiness. Happiness is the key to success.",
    author: "Albert Schweitzer",
  },
  {
    text: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  {
    text: "Knowledge is power, but enthusiasm pulls the switch.",
    author: "Benjamin Disraeli",
  },
  {
    text: "Every day is a new opportunity to change your life.",
    author: "Anonymous",
  },
  {
    text: "Don't count the days. Make the days count.",
    author: "Muhammad Ali",
  },
]

function getRandomFallbackQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length)
  return FALLBACK_QUOTES[randomIndex]!
}

export async function generateMotivationalQuote(): Promise<Quote> {
  try {
    const response = await fetch("https://zenquotes.io/api/today", {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch quote from ZenQuotes API")
    }

    const data: ZenQuoteResponse[] = await response.json()

    if (!data || data.length === 0) {
      throw new Error("No quote returned from ZenQuotes API")
    }

    const zenQuote = data[0]!

    return {
      text: zenQuote.q.trim(),
      author: zenQuote.a.trim(),
    }
  } catch {
    return getRandomFallbackQuote()
  }
}
