from fastapi import FastAPI
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import finnhub
import os
from datetime import datetime, timedelta

app = FastAPI()

# Finnhub API key from Render ENV
client = finnhub.Client(api_key=os.getenv("FINNHUB_API_KEY"))

# VADER analyzer
analyzer = SentimentIntensityAnalyzer()


def get_sentiment_score(symbol):
    try:
        # 🔥 Use last 2 days (best for Finnhub)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=2)

        news = client.company_news(
            symbol,
            _from=start_date.strftime('%Y-%m-%d'),
            to=end_date.strftime('%Y-%m-%d')
        )

        if not news:
            return 0.0, "neutral", 0.0

        scores = []

        for article in news[:30]:
            text = (article.get("headline", "") + " " + article.get("summary", "")).strip()

            if text:
                sentiment = analyzer.polarity_scores(text)
                scores.append(sentiment["compound"])

        if len(scores) == 0:
            return 0.0, "neutral", 0.0

        avg_score = sum(scores) / len(scores)

        # 🔥 Improved labeling
        if avg_score > 0.05:
            label = "positive"
        elif avg_score < -0.05:
            label = "negative"
        else:
            label = "neutral"

        return float(avg_score), label, abs(avg_score)

    except Exception as e:
        print("Error:", e)
        return 0.0, "neutral", 0.0


# ✅ Single stock endpoint
@app.get("/sentiment/{symbol}")
def sentiment(symbol: str):
    score, label, confidence = get_sentiment_score(symbol)

    return {
        "stock": symbol.upper(),
        "sentiment_score": score,
        "sentiment_label": label,
        "confidence": confidence
    }


# ✅ Multiple stocks endpoint (FOR YOUR TEAM 🔥)
@app.get("/sentiment-multiple")
def sentiment_multiple():
    symbols = ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"]

    result = {}

    for symbol in symbols:
        score, label, confidence = get_sentiment_score(symbol)
        result[symbol] = {
            "sentiment_score": score,
            "sentiment_label": label,
            "confidence": confidence
        }

    return result


# Optional health check
@app.get("/")
def home():
    return {"message": "Sentiment API is running 🚀"}