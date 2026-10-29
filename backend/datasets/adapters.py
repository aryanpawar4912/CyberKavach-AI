import pandas as pd
import numpy as np

CICIDS_KEY_COLS = {'destination port', 'flow duration', 'total fwd packets', 'total backward packets', 'label'}
NSL_KDD_KEY_COLS = {'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes', 'class', 'label'}
UNSW_KEY_COLS = {'dur', 'proto', 'service', 'state', 'spkts', 'dpkts', 'attack_cat', 'label'}

def detect_schema(columns):
    lowered = {c.strip().lower() for c in columns}
    if len(lowered.intersection(CICIDS_KEY_COLS)) >= 3:
        return 'cicids2017'
    if len(lowered.intersection(NSL_KDD_KEY_COLS)) >= 3:
        return 'nsl_kdd'
    if len(lowered.intersection(UNSW_KEY_COLS)) >= 3:
        return 'unsw_nb15'
    return 'generic'

def find_label_column(df):
    candidates = ['label', 'class', 'attack_cat', 'target', 'category', 'status']
    for c in df.columns:
        if c.strip().lower() in candidates:
            return c
    return None

def preprocess_dataframe(df, max_rows=50000):
    """
    Safely preprocess network dataset:
    - Limit rows to prevent memory pressure
    - Strip column whitespace
    - Fill/drop infinities and NaNs
    - Separate features and target
    """
    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=42)

    df.columns = [c.strip() for c in df.columns]

    # Replace inf with nan and fill
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    label_col = find_label_column(df)
    labels = None
    if label_col:
        labels = df[label_col].astype(str).str.strip()
        features = df.drop(columns=[label_col])
    else:
        features = df

    numeric_cols = features.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [
        column for column in features.columns if column not in numeric_cols
    ]
    numeric_features = features[numeric_cols].fillna(0)
    if categorical_cols:
        categorical_features = pd.get_dummies(
            features[categorical_cols].fillna('__missing__').astype(str),
            prefix=categorical_cols,
            dtype=float,
        )
        features = pd.concat([numeric_features, categorical_features], axis=1)
    else:
        features = numeric_features

    return features, labels, label_col
