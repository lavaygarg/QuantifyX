from __future__ import annotations
import os
import requests

class SentimentServiceError(RuntimeError):
    pass

def get_sentiment_score(symbol: str) -> float:
    colab_url = os.getenv("COLAB_SENTIMENT_URL")

    if not colab_url:
        raise SentimentServiceError("COLAB_SENTIMENT_URL environment variable not set")

    try:
        response = requests.get(
            f"{colab_url}/sentiment/{symbol.upper()}",
            timeout=30
        )
        response.raise_for_status()
        return float(response.json().get("sentiment_score", 0.0))

    except requests.exceptions.Timeout:
        raise SentimentServiceError("Colab sentiment API timed out")
    except requests.exceptions.ConnectionError:
        raise SentimentServiceError("Cannot connect to Colab — is the notebook running?")
    except Exception as e:
        print(f"Sentiment error for {symbol}: {e}")
        return 0.0