import json
import csv
import boto3
import os
import logging
import datetime
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table_name = os.getenv('TABLE_NAME')
# table_name='sa_mapping'


def lambda_handler(event, context):
    table = dynamodb.Table(table_name)
    bucket = event['Records'][0]['s3']['bucket']['name']
    object_key = event['Records'][0]['s3']['object']['key']
    # logger.info(f"object_key: {object_key}" )
    try:
        response = table.scan()
        items = response.get('Items', [])

        if len(items) == 0:
            # Read the CSV file from S3
            csv_file = s3.get_object(Bucket=bucket, Key=object_key)
            csv_rows = csv_file['Body'].read().decode('utf-8').splitlines()
            csv_reader = csv.DictReader(csv_rows)
            # logger.info(f"csv_reader: {csv_reader}" )
            
            for row in csv_reader:
                logger.info(f"row: {row}" )
                item = {
                    'bd_login': row['bd_login'], 
                    'sa_login': row['sa_login'],
                    'insert_date':datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
                }
        
                # Save the item to DynamoDB
                response = table.put_item(Item=item)
                # logger.info(f"response: {response}" )
    except Exception as e:
        # Return an error response
        logger.info(f"exception: {e}" )
        