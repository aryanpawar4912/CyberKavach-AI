import json
import uuid

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import default_storage
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from alerts.models import SecurityAlert
from audit.models import AuditLog
from datasets.models import Dataset
from datasets.adapters import preprocess_dataframe
from detection.models import DetectionRecord
from incidents.models import Incident
from machine_learning.models import TrainedModel
from machine_learning.pipeline import train_threat_model


class CyberKavachAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testanalyst', password='password123')
        self.client.force_login(self.user)
        self.uploaded_files = []

    def tearDown(self):
        for filename in self.uploaded_files:
            default_storage.delete(filename)

    def create_dataset(self):
        return Dataset.objects.create(
            name='flows.csv',
            file='datasets/flows.csv',
            rows=4,
            columns=3,
            status='ready',
        )

    def test_preprocessing_keeps_categorical_features_with_numeric_features(self):
        import pandas as pd

        frame = pd.DataFrame({
            'duration': [1.0, 2.0, 3.0],
            'protocol_type': ['tcp', 'udp', None],
            'class': ['normal', 'attack', 'normal'],
        })

        features, labels, label_column = preprocess_dataframe(frame)

        self.assertEqual(label_column, 'class')
        self.assertEqual(labels.tolist(), ['normal', 'attack', 'normal'])
        self.assertIn('duration', features.columns)
        self.assertIn('protocol_type_tcp', features.columns)
        self.assertIn('protocol_type_udp', features.columns)
        self.assertIn('protocol_type___missing__', features.columns)
        self.assertNotIn('class', features.columns)

    def test_health_check_reports_database_and_artifact_availability(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertTrue(data['database_connected'])
        self.assertIn('available_model_artifacts', data)
        self.assertNotIn('models_loaded', data)

    def test_data_apis_require_authentication(self):
        anonymous_client = Client()
        response = anonymous_client.get('/api/v1/dashboard/summary/')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(anonymous_client.get('/api/v1/health/').status_code, 200)

    def test_registration_and_validation(self):
        payload = {
            'username': 'cyber_hunter',
            'email': 'hunter@cyberkavach.ai',
            'password': 'SecurePassword123',
            'password_confirm': 'SecurePassword123',
            'role': 'Threat Hunter',
        }
        response = self.client.post(
            '/api/v1/auth/register/',
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.json())
        self.assertEqual(response.json()['user']['username'], 'cyber_hunter')

        duplicate = self.client.post(
            '/api/v1/auth/register/',
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 400)

        invalid = {**payload, 'username': 'another_user', 'password_confirm': 'bad'}
        mismatch = self.client.post(
            '/api/v1/auth/register/',
            data=json.dumps(invalid),
            content_type='application/json',
        )
        self.assertEqual(mismatch.status_code, 400)

    @override_settings(ALLOW_PUBLIC_REGISTRATION=False)
    def test_public_registration_can_be_disabled(self):
        response = Client().post(
            '/api/v1/auth/register/',
            data=json.dumps({
                'username': 'blocked_signup',
                'password': 'SecurePassword123',
                'password_confirm': 'SecurePassword123',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username='blocked_signup').exists())

    def test_dashboard_analytics_are_calculated_from_saved_records(self):
        dataset = self.create_dataset()
        trained_model = TrainedModel.objects.create(
            model_name='random_forest',
            dataset=dataset,
            target_classes=['BENIGN', 'DDoS', 'PortScan'],
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            prediction='BENIGN',
            model_name='Random Forest',
            source_ip='192.0.2.10',
            destination_ip='192.0.2.20',
        )
        suspicious = DetectionRecord.objects.create(
            dataset=dataset,
            trained_model=trained_model,
            prediction='DDoS',
            model_name='Random Forest',
            source_ip='192.0.2.10',
            destination_ip='192.0.2.20',
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            prediction='unexpected-label',
            model_name='Random Forest',
        )
        SecurityAlert.objects.create(
            detection_record=suspicious,
            severity='high',
            prediction='DDoS',
            status='investigating',
        )

        summary = self.client.get('/api/v1/dashboard/summary/').json()
        self.assertEqual(summary['total_records'], 3)
        self.assertEqual(summary['benign'], 1)
        self.assertEqual(summary['suspicious'], 1)
        self.assertEqual(summary['unclassified'], 1)
        self.assertEqual(summary['active_alerts'], 1)
        self.assertEqual(summary['datasets_processed'], 1)

        distribution = self.client.get(
            '/api/v1/dashboard/prediction-distribution/'
        ).json()
        self.assertEqual(
            {item['name']: item['value'] for item in distribution},
            {'Benign': 1, 'Suspicious': 1, 'Unclassified': 1},
        )
        categories = self.client.get('/api/v1/dashboard/threat-categories/').json()
        self.assertEqual(categories, [{'name': 'DDoS', 'value': 1}])
        alerts = self.client.get('/api/v1/dashboard/alert-statistics/').json()
        self.assertEqual(alerts['active'], 1)
        self.assertEqual(alerts['by_severity'], [{'severity': 'high', 'count': 1}])
        self.assertEqual(alerts['by_status'], [{'status': 'investigating', 'count': 1}])

        recent = self.client.get('/api/v1/dashboard/recent-detections/?limit=2').json()
        self.assertEqual(recent['count'], 3)
        self.assertEqual(len(recent['results']), 2)

        other_dataset = self.create_dataset()
        other_model = TrainedModel.objects.create(
            model_name='decision_tree',
            dataset=other_dataset,
            target_classes=['BENIGN', 'PortScan'],
        )
        other_detection = DetectionRecord.objects.create(
            dataset=other_dataset,
            trained_model=other_model,
            prediction='PortScan',
            model_name='Decision Tree',
        )
        SecurityAlert.objects.create(
            detection_record=other_detection,
            severity='critical',
            prediction='PortScan',
            status='new',
        )

        dataset_summary = self.client.get(
            f'/api/v1/dashboard/summary/?dataset_id={dataset.id}'
        ).json()
        self.assertEqual(dataset_summary['total_records'], 3)
        self.assertEqual(dataset_summary['datasets_processed'], 1)
        self.assertEqual(dataset_summary['active_alerts'], 1)
        dataset_distribution = self.client.get(
            f'/api/v1/dashboard/prediction-distribution/?dataset_id={dataset.id}'
        ).json()
        self.assertEqual(
            {item['name']: item['value'] for item in dataset_distribution},
            {'Benign': 1, 'Suspicious': 1, 'Unclassified': 1},
        )
        dataset_activity = self.client.get(
            f'/api/v1/dashboard/activity/?days=14&dataset_id={dataset.id}'
        ).json()
        self.assertEqual(
            sum(row['benign'] + row['suspicious'] + row['unclassified'] for row in dataset_activity),
            3,
        )
        filtered_alerts = self.client.get(
            f'/api/v1/dashboard/alert-statistics/?dataset_id={dataset.id}'
        ).json()
        self.assertEqual(filtered_alerts['total'], 1)
        self.assertEqual(
            self.client.get('/api/v1/dashboard/summary/?dataset_id=invalid').status_code,
            400,
        )

    def test_prediction_classification_uses_the_model_recorded_on_each_detection(self):
        dataset = self.create_dataset()
        random_forest = TrainedModel.objects.create(
            model_name='random_forest',
            dataset=dataset,
            target_classes=['BENIGN', 'DDoS'],
        )
        decision_tree = TrainedModel.objects.create(
            model_name='decision_tree',
            dataset=dataset,
            target_classes=['normal', 'PortScan'],
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            trained_model=random_forest,
            model_name='Random Forest',
            prediction='DDoS',
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            trained_model=decision_tree,
            model_name='Decision Tree',
            prediction='PortScan',
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            trained_model=decision_tree,
            model_name='Decision Tree',
            prediction='DDoS',
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            trained_model=random_forest,
            model_name='Random Forest',
            prediction='PortScan',
        )
        DetectionRecord.objects.create(
            dataset=dataset,
            model_name='Random Forest',
            prediction='DDoS',
        )

        summary = self.client.get('/api/v1/dashboard/summary/').json()
        self.assertEqual(summary['total_records'], 5)
        self.assertEqual(summary['suspicious'], 2)
        self.assertEqual(summary['unclassified'], 3)
        self.assertEqual(
            self.client.get('/api/v1/dashboard/threat-categories/').json(),
            [{'name': 'DDoS', 'value': 1}, {'name': 'PortScan', 'value': 1}],
        )

    def test_known_demo_records_are_preserved_but_excluded_from_live_apis(self):
        dataset = Dataset.objects.create(
            name='Generated sample',
            file='datasets/generated.csv',
            status='ready',
            is_demo=True,
        )
        TrainedModel.objects.create(
            model_name='random_forest',
            dataset=dataset,
            artifact_path='missing-demo-model.joblib',
            target_classes=['BENIGN', 'DDoS'],
        )
        detection = DetectionRecord.objects.create(
            dataset=dataset,
            prediction='DDoS',
            model_name='Random Forest',
            source_ip='192.0.2.10',
            destination_ip='192.0.2.20',
        )
        SecurityAlert.objects.create(
            detection_record=detection,
            severity='high',
            prediction='DDoS',
        )
        Incident.objects.create(title='Generated incident', is_demo=True)
        AuditLog.objects.create(action='Generated seed event', is_demo=True)

        self.assertEqual(self.client.get('/api/v1/dashboard/summary/').json()['total_records'], 0)
        self.assertEqual(self.client.get('/api/v1/dashboard/recent-detections/').json()['count'], 0)
        self.assertEqual(self.client.get('/api/v1/network/topology/').json()['nodes'], [])
        self.assertEqual(self.client.get('/api/v1/alerts/').json()['count'], 0)
        self.assertEqual(self.client.get('/api/v1/incidents/').json()['count'], 0)
        self.assertEqual(self.client.get('/api/v1/audit/logs/').json()['count'], 0)
        self.assertTrue(Dataset.objects.filter(pk=dataset.pk).exists())
        self.assertTrue(DetectionRecord.objects.filter(pk=detection.pk).exists())

    def test_audit_search_matches_actor_and_action(self):
        AuditLog.objects.create(actor='analyst_one', action='Reviewed flow')

        actor_result = self.client.get('/api/v1/audit/logs/?search=analyst_one').json()
        action_result = self.client.get('/api/v1/audit/logs/?search=Reviewed').json()

        self.assertEqual(actor_result['count'], 1)
        self.assertEqual(action_result['count'], 1)

    def test_activity_uses_saved_timestamps_and_validates_range(self):
        DetectionRecord.objects.create(prediction='BENIGN', model_name='test')
        response = self.client.get('/api/v1/dashboard/activity/?days=14')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(sum(row['benign'] for row in response.json()), 1)
        invalid = self.client.get('/api/v1/dashboard/activity/?days=900')
        self.assertEqual(invalid.status_code, 400)

    def test_api_pagination_honors_bounded_page_size(self):
        for index in range(3):
            DetectionRecord.objects.create(
                prediction=f'category-{index}',
                model_name='test',
            )

        response = self.client.get('/api/v1/detection/history/?page_size=2')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 3)
        self.assertEqual(len(response.json()['results']), 2)
        self.assertIsNotNone(response.json()['next'])

    def test_network_topology_uses_only_saved_flow_endpoints(self):
        dataset = self.create_dataset()
        DetectionRecord.objects.create(
            dataset=dataset,
            prediction='BENIGN',
            model_name='test',
            source_ip='192.0.2.10',
            destination_ip='192.0.2.20',
        )
        response = self.client.get('/api/v1/network/topology/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['nodes']), 2)
        self.assertEqual(len(data['edges']), 1)
        self.assertEqual(data['scope']['records_with_endpoints'], 1)
        self.assertFalse(any('10.0.' in node['data']['ip'] for node in data['nodes']))

    def test_dataset_upload_persists_actual_statistics(self):
        filename = f'test_flows_{uuid.uuid4().hex}.csv'
        upload = SimpleUploadedFile(
            filename,
            b'Label,Bytes,Port\nBENIGN,12,443\nDDoS,,80\n,7,53\n',
            content_type='text/csv',
        )
        response = self.client.post('/api/v1/datasets/upload/', {'file': upload})
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.uploaded_files.append(Dataset.objects.get(pk=data['id']).file.name)
        self.assertEqual(data['rows'], 3)
        self.assertEqual(data['columns'], 3)
        self.assertEqual(data['missing_values'], {'Label': 1, 'Bytes': 1})
        self.assertEqual(data['label_distribution'], {'BENIGN': 1, 'DDoS': 1})
        self.assertEqual(data['feature_summary']['Bytes']['mean'], 9.5)

        statistics = self.client.get(
            f"/api/v1/datasets/{data['id']}/statistics/"
        )
        self.assertEqual(statistics.status_code, 200)
        self.assertEqual(statistics.json()['rows'], 3)

    def test_invalid_csv_upload_is_reported_and_saved_as_error(self):
        filename = f'invalid_flows_{uuid.uuid4().hex}.csv'
        upload = SimpleUploadedFile(
            filename,
            b'Label,Feature\n"unterminated,1\n',
            content_type='text/csv',
        )
        response = self.client.post('/api/v1/datasets/upload/', {'file': upload})
        self.assertEqual(response.status_code, 400)
        self.assertIn('Failed to parse CSV', response.json()['error'])
        dataset = Dataset.objects.get(name=filename)
        self.uploaded_files.append(dataset.file.name)
        self.assertEqual(dataset.status, 'error')
        self.assertTrue(dataset.error_message)

    def test_training_rejects_unlabelled_data_instead_of_fabricating_targets(self):
        filename = f'test_unlabelled_{uuid.uuid4().hex}.csv'
        dataset = Dataset.objects.create(
            name=filename,
            file=SimpleUploadedFile(
                filename,
                b'feature_a,feature_b\n1,2\n3,4\n',
            ),
            status='ready',
        )
        self.uploaded_files.append(dataset.file.name)
        with self.assertRaisesMessage(ValueError, 'no supported ground-truth label'):
            train_threat_model(dataset)

    def test_prediction_rejects_a_dataset_that_is_not_fully_processed(self):
        dataset = Dataset.objects.create(
            name='pending.csv',
            file='datasets/pending.csv',
            status='processing',
        )
        response = self.client.post(
            '/api/v1/detection/predict/',
            data=json.dumps({
                'dataset_id': dataset.id,
                'model_name': 'random_forest',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn('processing', response.json()['error'])

    def test_model_endpoints_and_evaluation_provenance(self):
        dataset = self.create_dataset()
        model = TrainedModel.objects.create(
            model_name='random_forest',
            dataset=dataset,
            evaluation_type='held_out_test',
            evaluation_timestamp=timezone.now(),
            model_version='random_forest-test-version',
            target_classes=['BENIGN', 'DDoS'],
            per_class_metrics={'DDoS': {'precision': 1.0}},
        )
        self.assertEqual(self.client.get('/api/v1/models/metrics/').status_code, 200)
        detail = self.client.get(f'/api/v1/models/{model.id}/metrics/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()['evaluation_type'], 'held_out_test')
        self.assertTrue(detail.json()['evaluation_available'])
        self.assertNotIn('artifact_path', detail.json())
        comparison = self.client.get('/api/v1/models/comparison/?dataset_id=1')
        self.assertEqual(comparison.status_code, 200)

    def test_report_contains_no_generated_rows_when_database_is_empty(self):
        summary = self.client.get('/api/v1/reports/summary/').json()
        self.assertEqual(summary['total_records'], 0)
        self.assertEqual(summary['categories'], [])
        self.assertEqual(summary['activity'], [])
        export = self.client.get('/api/v1/reports/export/')
        self.assertEqual(export.status_code, 200)
        self.assertEqual(len(export.content.decode().strip().splitlines()), 1)

    def test_alert_list_statistics_and_report_export(self):
        alert = SecurityAlert.objects.create(
            severity='critical',
            prediction='DDoS',
            status='new',
            source_ip='192.0.2.1',
        )
        response = self.client.get('/api/v1/alerts/statistics/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['total'], 1)
        self.assertEqual(self.client.get('/api/v1/alerts/').status_code, 200)
        self.assertEqual(alert.id, SecurityAlert.objects.first().id)

    def test_incident_lifecycle(self):
        incident = Incident.objects.create(title='Test Port Scan', severity='medium')
        response = self.client.patch(
            f'/api/v1/incidents/{incident.id}/',
            data=json.dumps({
                'status': 'investigating',
                'note': 'Investigating abnormal connection.',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        incident.refresh_from_db()
        self.assertEqual(incident.status, 'investigating')
        self.assertEqual(len(incident.notes), 1)
