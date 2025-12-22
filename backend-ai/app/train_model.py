"""
Train a lightweight ML model for influencer–campaign match prediction.

This script:
1. Generates synthetic influencer–campaign training data
2. Builds a Scikit-learn pipeline (scaler + logistic regression)
3. Evaluates model performance
4. Saves model.pkl into app/models for runtime use

Run:
    python app/train_model.py
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ---------------------------------------
# 1. Generate synthetic training dataset
# ---------------------------------------

N = 200  # number of synthetic samples

def random_eng():
    return np.round(np.random.uniform(0.02, 0.12), 3)

def random_followers():
    return np.random.randint(5000, 300000)

def random_binary():
    return np.random.choice([0, 1])

rows = []
for _ in range(N):
    followers = random_followers()
    eng = random_eng()

    # Category/region/age matches (0 = no, 1 = yes)
    cat = random_binary()
    region = random_binary()
    age = random_binary()

    # Label logic (synthetic)
    # Higher probability of success when:
    #   - engagement is high
    #   - followers moderate-high
    #   - category/region/age match is strong
    prob = (
        0.25 * (followers / 300000) +
        0.45 * eng +
        0.10 * cat +
        0.10 * region +
        0.10 * age
    )

    label = 1 if prob > 0.18 else 0  # threshold

    rows.append({
        "followers": followers,
        "eng": eng,
        "cat": cat,
        "region": region,
        "age": age,
        "label": label
    })

df = pd.DataFrame(rows)

# ---------------------------------------
# 2. Prepare features and target
# ---------------------------------------

X = df[["followers", "eng", "cat", "region", "age"]]
y = df["label"]

# ---------------------------------------
# 3. Split the dataset
# ---------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)

# ---------------------------------------
# 4. Build ML Pipeline
# ---------------------------------------

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(max_iter=500))
])

pipeline.fit(X_train, y_train)

# ---------------------------------------
# 5. Evaluate performance
# ---------------------------------------

y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print("\n=== Model Training Complete ===")
print(f"Accuracy: {acc:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ---------------------------------------
# 6. Save model
# ---------------------------------------

MODEL_DIR = os.path.join("app", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
joblib.dump(pipeline, MODEL_PATH)

print(f"\nSaved ML model to: {MODEL_PATH}")
