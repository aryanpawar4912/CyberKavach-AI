"""Legacy entry point retained to avoid breaking existing setup scripts.

Operational datasets, detections, alerts, and model metrics must come from
uploaded files and successful application processing, not generated demo rows.
"""

if __name__ == '__main__':
    print(
        'No sample data is generated. Create an account with `manage.py '
        'createsuperuser`, then upload and process a real dataset in the app.'
    )
