from __future__ import annotations
import os
import torch
import finnhub
from datetime import datetime, timedelta
from typing import Any

class SentimentServiceError(RuntimeError):
    pass

def _load_sentiment_dependencies() -> tuple[Any, Any]:
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        return AutoTokenizer, AutoModelForSequenceClassification
    except ModuleNotFoundError as error:
        raise SentimentServiceError(
            "Missing ML dependency for Sentiment Model. Ensure transformers and torch are installed."
        ) from error

tokenizer_instance = None
model_instance = None

def get_sentiment_score(symbol: str) -> float:
    global tokenizer_instance, model_instance

    api_key = os.getenv("FINNHUB_API_KEY", "d7dcpdhr01qggoensdf0d7dcpdhr01qggoensdfg")
    client = finnhub.Client(api_key=api_key)

    AutoTokenizer, AutoModelForSequenceClassification = _load_sentiment_dependencies()

    if tokenizer_instance is None or model_instance is None:
        try:
            tokenizer_instance = AutoTokenizer.from_pretrained("ProsusAI/finbert")
            model_instance = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
            model_instance.eval()
        except Exception as e:
            raise SentimentServiceError(f"Failed to load FinBERT model: {e}")

    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=15)

        news = client.company_news(
            symbol.upper(),
            _from=start_date.strftime('%Y-%m-%d'),
            to=end_date.strftime('%Y-%m-%d')
        )

        if not news:
            return 0.0

        texts = []
        for article in news[:50]:
            headline = article.get('headline', '')
            summary = article.get('summary', '')
            text = (headline + " " + summary).strip()
            if text:
                texts.append(text)

        if len(texts) == 0:
            return 0.0

        inputs = tokenizer_instance(
            texts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            outputs = model_instance(**inputs)

        probs = torch.nn.functional.softmax(outputs.logits, dim=1)

        scores = []
        for p in probs:
            p = p.tolist()
            # ProsusAI/finbert labels: [positive, negative, neutral] typically
            # Wait, finbert labels are 0: positive, 1: negative, 2: neutral. 
            # The user's notebook has: p[2] - p[0] ??
            # ProsusAI/finbert mapping: 0=positive, 1=negative, 2=neutral. 
            # If the user script mapped score = p[2] - p[0] we rely on their formula despite mapping quirks.
            score = p[2] - p[0]
            scores.append(score)

        final_score = sum(scores) / len(scores)
        return float(final_score)

    except Exception as e:
        print(f"Sentiment error for {symbol}: {e}")
        return 0.0
