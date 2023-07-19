import json
import csv
import boto3
import os

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table_name = os.getenv('TABLE_NAME')
bucket_name = os.getenv('BUCKET_NAME')
object_key = os.getenv('OBJECT_KEY')

def lambda_handler(event, context):
    request_type = event['RequestType']
    table = dynamodb.Table(table_name)
    if request_type == 'Create':
        return on_create(event, table)

def on_create(event, table):
    try:
        with open("QABot/scripts/sa_mapping.csv", "r") as f:
            s3.upload_fileobj(f, bucket_name, object_key)

        # Read the CSV file from S3
        csv_file = s3.get_object(Bucket=bucket_name, Key=object_key)
        csv_rows = csv_file['Body'].read().decode('utf-8').splitlines()
        csv_reader = csv.DictReader(csv_rows)

        for row in csv_reader:
            item = {
                "db_login": row['bd_login'],
                "sa_login": row['sa_login'],
            }

            # Save the item to DynamoDB
            table.put_item(Item=item)

    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
