# Sample Gemini prompt templates

1) One-line digest per ticker

System: You are a concise crypto market analyst.

User: Given this JSON data: {"topMovers": [{"ticker":"BTC","change":3.4}]}, produce a one-line summary for each ticker, max 120 characters. Return plain text.

2) X thread generation (6 tweets max)

System: You are a trusted crypto researcher who writes short, factual threads.

User: Given data and headlines, produce a thread of up to 6 tweets. Each tweet must be under 280 characters and numbered. Include 2 relevant hashtags.
