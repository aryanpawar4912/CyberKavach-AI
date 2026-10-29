import os
import joblib
import pandas as pd
import numpy as np
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils.dateparse import parse_date
from .models import DetectionRecord
from .serializers import DetectionRecordSerializer
from datasets.models import Dataset
from datasets.adapters import preprocess_dataframe
from machine_learning.models import TrainedModel
from machine_learning.pipeline import train_threat_model
from alerts.models import SecurityAlert
from audit.models import AuditLog
from dashboard.services import BENIGN_LABELS, UNKNOWN_LABELS

class DetectionPredictView(APIView):
    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        model_name = request.data.get('model_name', 'random_forest')

        if not dataset_id:
            dataset = Dataset.objects.filter(
                status='ready', is_demo=False
            ).order_by('-uploaded_at').first()
            if not dataset:
                return Response({'error': 'No dataset available. Upload a dataset first.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if not str(dataset_id).isdigit():
                return Response(
                    {'error': 'dataset_id must be a positive integer.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                dataset = Dataset.objects.get(id=dataset_id, is_demo=False)
            except Dataset.DoesNotExist:
                return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)
            if dataset.status != 'ready':
                return Response(
                    {'error': 'Dataset processing has not completed successfully.'},
                    status=status.HTTP_409_CONFLICT,
                )

        # Look up or train model
        if model_name not in dict(TrainedModel.MODEL_CHOICES):
            return Response(
                {'error': 'Unsupported model_name.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        trained_model = TrainedModel.objects.exclude(
            dataset__is_demo=True
        ).filter(model_name=model_name, dataset=dataset).first()
        if not trained_model or not trained_model.artifact_path or not os.path.exists(trained_model.artifact_path):
            try:
                metrics = train_threat_model(dataset, model_name=model_name)
                trained_model, _ = TrainedModel.objects.update_or_create(
                    model_name=model_name,
                    dataset=dataset,
                    defaults=metrics
                )
            except ValueError as exc:
                return Response(
                    {'error': f'Cannot train on this dataset: {exc}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Load model bundle
        if not os.path.isfile(trained_model.artifact_path):
            return Response(
                {'error': 'The trained model artifact is unavailable.'},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            bundle = joblib.load(trained_model.artifact_path)
        except (OSError, ValueError, KeyError) as exc:
            return Response(
                {'error': f'Unable to load the trained model artifact: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        clf = bundle['model']
        scaler = bundle['scaler']
        expected_features = bundle['features']

        # Load sample for prediction (up to 200 rows)
        df_raw = pd.read_csv(dataset.file.path, nrows=200)
        X_infer, _, _ = preprocess_dataframe(df_raw, max_rows=200)

        # Reindex features to match trained scaler
        for col in expected_features:
            if col not in X_infer.columns:
                X_infer[col] = 0.0
        X_infer = X_infer[expected_features]

        X_infer_scaled = scaler.transform(X_infer)
        preds = clf.predict(X_infer_scaled)

        confs = None
        if hasattr(clf, 'predict_proba'):
            confs = [float(np.max(p)) for p in clf.predict_proba(X_infer_scaled)]

        records_to_create = []
        alerts_to_create = []
        source_column = next(
            (column for column in df_raw.columns
             if column.strip().casefold() in {'src ip', 'source ip', 'src_ip', 'source_ip'}),
            None,
        )
        destination_column = next(
            (column for column in df_raw.columns
             if column.strip().casefold() in {'dst ip', 'destination ip', 'dst_ip', 'destination_ip'}),
            None,
        )
        port_column = next(
            (column for column in df_raw.columns
             if column.strip().casefold() in {'destination port', 'dst port', 'destination_port', 'dst_port'}),
            None,
        )
        supported_classes = {
            str(label).strip().casefold()
            for label in trained_model.target_classes or []
        }

        for i, pred in enumerate(preds):
            pred_str = str(pred)
            normalized_prediction = pred_str.strip().casefold()
            conf = confs[i] if confs is not None else None
            row = df_raw.iloc[i]
            source_ip = str(row[source_column]).strip() if source_column and pd.notna(row[source_column]) else None
            destination_ip = str(row[destination_column]).strip() if destination_column and pd.notna(row[destination_column]) else None
            destination_port = None
            if port_column and pd.notna(row[port_column]):
                try:
                    destination_port = int(row[port_column])
                except (TypeError, ValueError, OverflowError):
                    destination_port = None
            feature_values = {
                str(key): value.item() if hasattr(value, 'item') else value
                for key, value in X_infer.iloc[i].items()
            }

            rec = DetectionRecord(
                dataset=dataset,
                trained_model=trained_model,
                model_name=trained_model.get_model_name_display(),
                prediction=pred_str,
                confidence=conf,
                source_ip=source_ip,
                destination_ip=destination_ip,
                destination_port=destination_port,
                features_json=feature_values,
            )
            records_to_create.append(rec)

        created_records = DetectionRecord.objects.bulk_create(records_to_create)

        for rec in created_records:
            normalized_prediction = rec.prediction.strip().casefold()
            if (
                normalized_prediction in supported_classes
                and normalized_prediction not in BENIGN_LABELS | UNKNOWN_LABELS
            ):
                severity = 'critical' if rec.confidence is not None and rec.confidence >= 0.85 else 'warning'
                alerts_to_create.append(SecurityAlert(
                    detection_record=rec,
                    severity=severity,
                    prediction=rec.prediction,
                    status='new',
                    source_ip=rec.source_ip
                ))

        if alerts_to_create:
            SecurityAlert.objects.bulk_create(alerts_to_create)

        # Audit log
        AuditLog.objects.create(
            actor=request.user.username if request.user.is_authenticated else 'system',
            action=f"Executed threat detection using {trained_model.get_model_name_display()}",
            object_id=f"Dataset-{dataset.id}",
            outcome='success'
        )

        return Response({
            'status': 'success',
            'dataset_id': dataset.id,
            'model_name': trained_model.get_model_name_display(),
            'total_analyzed': len(created_records),
            'benign_count': sum(
                record.prediction.strip().casefold() in BENIGN_LABELS
                for record in created_records
            ),
            'suspicious_count': len(alerts_to_create),
            'predictions': DetectionRecordSerializer(created_records[:50], many=True).data
        })

class DetectionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetectionRecord.objects.exclude(dataset__is_demo=True).order_by('-timestamp')
    serializer_class = DetectionRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        model_filter = self.request.query_params.get('model')
        if model_filter:
            qs = qs.filter(model_name__icontains=model_filter)
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            if not dataset_id.isdigit():
                raise ValidationError({'dataset_id': 'Must be a positive integer.'})
            qs = qs.filter(dataset_id=int(dataset_id))
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(prediction__iexact=category.strip())
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(prediction__icontains=search) | qs.filter(source_ip__icontains=search) | qs.filter(destination_ip__icontains=search)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        parsed_start = parse_date(start_date) if start_date else None
        parsed_end = parse_date(end_date) if end_date else None
        if (start_date and not parsed_start) or (end_date and not parsed_end):
            raise ValidationError({'date': 'Dates must use YYYY-MM-DD format.'})
        if parsed_start and parsed_end and parsed_start > parsed_end:
            raise ValidationError({'date': 'start_date must be on or before end_date.'})
        if parsed_start:
            qs = qs.filter(timestamp__date__gte=parsed_start)
        if parsed_end:
            qs = qs.filter(timestamp__date__lte=parsed_end)
        return qs


class DetectionDetailView(APIView):
    def get(self, request, pk):
        try:
            record = DetectionRecord.objects.exclude(
                dataset__is_demo=True
            ).select_related('dataset').get(pk=pk)
        except DetectionRecord.DoesNotExist:
            return Response({'error': 'Detection record not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DetectionRecordSerializer(record).data)
