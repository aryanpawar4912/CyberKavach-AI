import math
import os
import uuid
import joblib
import numpy as np
import pandas as pd
from django.conf import settings
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from django.utils import timezone
from datasets.adapters import preprocess_dataframe

def build_model_instance(model_name):
    if model_name == 'decision_tree':
        return DecisionTreeClassifier(max_depth=12, random_state=42)
    elif model_name == 'svm':
        return LinearSVC(max_iter=2000, random_state=42, dual='auto')
    else:
        return RandomForestClassifier(n_estimators=50, max_depth=12, random_state=42, n_jobs=-1)

def train_threat_model(dataset, model_name='random_forest'):
    """
    Modular Scikit-Learn training pipeline for CyberKavach AI.
    - Fits scaler strictly on train set (prevents leakage)
    - Computes real metrics on held-out test split
    - Persists trusted application model artifact
    """
    df = pd.read_csv(dataset.file.path, nrows=25000)
    X, y, label_col = preprocess_dataframe(df)

    if y is None:
        raise ValueError('This dataset has no supported ground-truth label column.')

    valid_rows = y.notna() & y.astype(str).str.strip().ne('')
    X = X.loc[valid_rows].reset_index(drop=True)
    y = y.loc[valid_rows].reset_index(drop=True)
    class_counts = y.value_counts()
    if len(class_counts) < 2:
        raise ValueError('At least two labelled classes are required for supervised training.')
    if class_counts.min() < 2:
        raise ValueError('Each labelled class must contain at least two rows for a held-out evaluation.')
    test_rows = math.ceil(len(X) * 0.20)
    if test_rows < len(class_counts) or len(X) - test_rows < len(class_counts):
        raise ValueError('The labeled dataset is too small to hold out examples for every class.')

    target_classes = sorted([str(c) for c in np.unique(y)])
    features_list = X.columns.tolist()

    # 80/20 split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
    )

    # Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train model
    clf = build_model_instance(model_name)
    clf.fit(X_train_scaled, y_train)

    # Predictions on held-out test set
    y_pred = clf.predict(X_test_scaled)

    # Metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    rec = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    cm_array = confusion_matrix(y_test, y_pred, labels=sorted(np.unique(y)))
    cm = cm_array.tolist()

    # Macro one-vs-rest false-positive rate on the held-out labeled split.
    false_positive_rates = []
    for index in range(len(cm_array)):
        false_positives = cm_array[:, index].sum() - cm_array[index, index]
        true_negatives = cm_array.sum() - (
            cm_array[index, :].sum()
            + cm_array[:, index].sum()
            - cm_array[index, index]
        )
        denominator = false_positives + true_negatives
        if denominator:
            false_positive_rates.append(false_positives / denominator)
    fpr = float(np.mean(false_positive_rates)) if false_positive_rates else 0.0
    per_class_metrics = classification_report(
        y_test,
        y_pred,
        labels=sorted(np.unique(y)),
        output_dict=True,
        zero_division=0,
    )

    # Feature importances
    feature_importances = []
    if hasattr(clf, 'feature_importances_'):
        indices = np.argsort(clf.feature_importances_)[::-1][:15]
        for idx in indices:
            feature_importances.append({
                'feature': features_list[idx],
                'importance': float(clf.feature_importances_[idx])
            })
    elif hasattr(clf, 'coef_'):
        # For linear models
        coef_mean = np.mean(np.abs(clf.coef_), axis=0)
        indices = np.argsort(coef_mean)[::-1][:15]
        for idx in indices:
            feature_importances.append({
                'feature': features_list[idx],
                'importance': float(coef_mean[idx])
            })

    # Save artifact
    os.makedirs(settings.MODELS_DIR, exist_ok=True)
    model_version = f'{model_name}-{uuid.uuid4().hex[:12]}'
    artifact_filename = f'{model_version}_{dataset.id}.joblib'
    artifact_path = os.path.join(settings.MODELS_DIR, artifact_filename)

    model_bundle = {
        'model': clf,
        'scaler': scaler,
        'features': features_list,
        'classes': target_classes,
        'model_name': model_name
    }
    joblib.dump(model_bundle, artifact_path)

    return {
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1_score': f1,
        'false_positive_rate': fpr,
        'confusion_matrix': cm,
        'per_class_metrics': per_class_metrics,
        'feature_importance': feature_importances,
        'features_used': features_list[:30],
        'target_classes': target_classes,
        'artifact_path': artifact_path,
        'model_version': model_version,
        'evaluation_type': 'held_out_test',
        'evaluation_timestamp': timezone.now(),
    }
