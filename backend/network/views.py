from collections import Counter, defaultdict

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from alerts.models import SecurityAlert
from detection.models import DetectionRecord
from detection.serializers import DetectionRecordSerializer


class NetworkTopologyView(APIView):
    def get(self, request):
        records = DetectionRecord.objects.exclude(
            dataset__is_demo=True
        ).exclude(
            source_ip__isnull=True
        ).exclude(source_ip='').exclude(
            destination_ip__isnull=True
        ).exclude(destination_ip='')

        dataset_id = request.query_params.get('dataset_id')
        if dataset_id:
            if not dataset_id.isdigit():
                return Response(
                    {'error': 'dataset_id must be a positive integer.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            records = records.filter(dataset_id=int(dataset_id))

        search = request.query_params.get('search', '').strip()
        if search:
            records = records.filter(
                source_ip__icontains=search
            ) | records.filter(
                destination_ip__icontains=search
            )

        total = records.count()
        records = list(
            records.select_related('dataset')
            .prefetch_related('alerts')
            .order_by('-timestamp')[:5000]
        )
        hosts = defaultdict(lambda: {
            'records': 0, 'categories': Counter(), 'active_alerts': [],
        })
        flows = defaultdict(lambda: {'records': 0, 'categories': Counter()})

        for record in records:
            source = record.source_ip.strip()
            destination = record.destination_ip.strip()
            if not source or not destination:
                continue
            flow = flows[(source, destination)]
            flow['records'] += 1
            flow['categories'][record.prediction] += 1

            alerts = list(record.alerts.all())
            for host in (source, destination):
                hosts[host]['records'] += 1
                hosts[host]['categories'][record.prediction] += 1
                hosts[host]['active_alerts'].extend(
                    alert for alert in alerts
                    if alert.status in {'new', 'investigating'}
                )

        positions = {}
        columns = 4
        for index, address in enumerate(sorted(hosts)):
            positions[address] = {
                'x': (index % columns) * 210,
                'y': (index // columns) * 140,
            }

        nodes = []
        for address, details in hosts.items():
            active_alerts = details['active_alerts']
            has_critical = any(
                alert.severity in {'critical', 'high'} for alert in active_alerts
            )
            nodes.append({
                'id': f'host-{address}',
                'type': 'ckNode',
                'position': positions[address],
                'data': {
                    'label': address,
                    'type': 'host',
                    'status': 'critical' if has_critical else (
                        'warning' if active_alerts else 'unknown'
                    ),
                    'ip': address,
                    'records': details['records'],
                    'categories': dict(details['categories']),
                    'active_alerts': len(active_alerts),
                },
            })

        edges = []
        for index, ((source, destination), details) in enumerate(flows.items()):
            categories = dict(details['categories'])
            edges.append({
                'id': f'flow-{index}',
                'source': f'host-{source}',
                'target': f'host-{destination}',
                'label': f"{details['records']} records · {', '.join(categories)}",
                'data': {
                    'records': details['records'],
                    'categories': categories,
                },
            })

        return Response({
            'nodes': nodes,
            'edges': edges,
            'scope': {
                'dataset_id': dataset_id,
                'records_with_endpoints': total,
                'records_in_response': len(records),
                'truncated': total > len(records),
                'search': search,
            },
        })


class NodeDetailView(APIView):
    def get(self, request, node_id):
        records = DetectionRecord.objects.exclude(
            dataset__is_demo=True
        ).filter(
            source_ip=node_id
        ) | DetectionRecord.objects.exclude(
            dataset__is_demo=True
        ).filter(destination_ip=node_id)
        records = records.select_related('dataset').order_by('-timestamp')
        if not records.exists():
            return Response(
                {'error': 'No network entity found for this address.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'id': node_id,
            'label': node_id,
            'related_detections': DetectionRecordSerializer(
                records[:25], many=True
            ).data,
        })
