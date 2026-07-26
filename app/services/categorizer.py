"""
app/services/categorizer.py

Rule-based merchant -> category lookup. Deliberately dumb: a dict +
substring match, no NLP/ML. Covers every merchant in
synthetic_data.MERCHANTS exactly (no fallthrough to "Other" for
synthetic data), and still degrades gracefully to "Other" for any
merchant name a real CSV upload might contain that we don't recognize.

Called once per transaction at ingestion time (transactions.py), for
BOTH the CSV path and the synthetic-generator path — same as every
other piece of this pipeline, one processing path regardless of source.
"""

# Keys are lowercase substrings matched against the merchant name.
# Order doesn't matter for correctness (each of our 20 known merchants
# matches exactly one key), but keep it grouped by category for
# readability.
CATEGORY_RULES: dict[str, str] = {
    # Food & Dining
    "swiggy": "Food & Dining",
    "zomato": "Food & Dining",
    "starbucks": "Food & Dining",
    "chai point": "Food & Dining",
    "domino's": "Food & Dining",
    "dominos": "Food & Dining",  # apostrophe-stripped fallback for messy CSV input

    # Shopping
    "amazon": "Shopping",
    "flipkart": "Shopping",
    "myntra": "Shopping",
    "reliance digital": "Shopping",

    # Transport
    "uber": "Transport",
    "ola": "Transport",
    "irctc": "Transport",

    # Groceries
    "bigbasket": "Groceries",
    "dmart": "Groceries",
    "local grocery": "Groceries",

    # Subscriptions
    "netflix": "Subscriptions",
    "spotify": "Subscriptions",

    # Entertainment
    "pvr cinemas": "Entertainment",
    "bookmyshow": "Entertainment",

    # Health
    "apollo pharmacy": "Health",
}


def categorize(merchant: str) -> str:
    """
    Case-insensitive substring match against CATEGORY_RULES.
    Returns "Other" for anything unrecognized (real CSV uploads may
    contain merchants outside our synthetic pool).
    """
    m = merchant.lower()
    for key, category in CATEGORY_RULES.items():
        if key in m:
            return category
    return "Other"