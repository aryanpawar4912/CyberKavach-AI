from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import TrainedModel
from .serializers import TrainedModelSerializer
from .pipeline import train_threat_model
from datasets.models import Dataset
from audit.models import AuditLog
from rest_framework.exceptions import ValidationError


def models_for_request(request):
    models = TrainedModel.objects.exclude(
        dataset__is_demo=True
    ).select_related('dataset').order_by('-trained_at')
    dataset_id = request.query_params.get('dataset_id')
    if dataset_id:
        if not dataset_id.isdigit():
            raise ValidationError({'dataset_id': 'Must be a positive integer.'})
        models = models.filter(dataset_id=int(dataset_id))
    return models


class ModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TrainedModel.objects.all().order_by('-trained_at')
    serializer_class = TrainedModelSerializer

    def get_queryset(self):
        return models_for_request(self.request)


class ModelMetricsView(APIView):
    def get(self, request):
        models = models_for_request(request)
        serializer = TrainedModelSerializer(models, many=True)
        return Response(serializer.data)


class ModelComparisonView(APIView):
    def get(self, request):
        models = models_for_request(request)
        return Response(TrainedModelSerializer(models, many=True).data)


class ModelEvaluationMetricsView(APIView):
    def get(self, request, pk):
        try:
            model = TrainedModel.objects.exclude(
                dataset__is_demo=True
            ).select_related('dataset').get(pk=pk)
        except TrainedModel.DoesNotExist:
            return Response({'error': 'Model not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TrainedModelSerializer(model).data)


class ModelTrainView(APIView):
    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        model_name = request.data.get('model_name', 'random_forest')

        if model_name not in dict(TrainedModel.MODEL_CHOICES):
            return Response({'error': 'Unsupported model_name.'}, status=status.HTTP_400_BAD_REQUEST)

        if not dataset_id:
            # Pick latest available dataset if not specified
            dataset = Dataset.objects.filter(status='ready', is_demo=False).first()
            if not dataset:
                return Response({'error': 'No dataset available. Please upload a dataset first.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if not str(dataset_id).isdigit():
                return Response({'error': 'dataset_id must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                dataset = Dataset.objects.get(id=dataset_id, status='ready', is_demo=False)
            except Dataset.DoesNotExist:
                return Response({'error': 'Specified dataset does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            metrics = train_threat_model(dataset, model_name=model_name)
        except ValueError as exc:
            return Response(
                {'error': f'Model training cannot proceed: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        trained_model, _ = TrainedModel.objects.update_or_create(
            model_name=model_name,
            dataset=dataset,
            defaults=metrics
        )

        AuditLog.objects.create(
            actor=request.user.username if request.user.is_authenticated else 'system',
            action=f"Trained {model_name} model",
            object_id=f"Model-{trained_model.id}",
            outcome='success'
        )

        return Response(TrainedModelSerializer(trained_model).data, status=status.HTTP_201_CREATED)
