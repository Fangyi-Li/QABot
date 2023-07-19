import datetime
import json
import boto3
import os

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    chat_session_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_bd_handler(event, chat_session_table)
        elif http_method == 'PUT':
            return put_bd_handler(event, chat_session_table)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Invalid request method'
                })
            }
    except Exception as e:
        # Return an error response with specific error message
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
        
    
def post_bd_handler(event, chat_session_table):
    body = json.loads(event['body'])
    required_fields = ['name', 'bd_id', 'wechatID', 'team', 'site', 'employmentStatus']
    
    if not all(field in body for field in required_fields):
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required fields'
            })
        }
    
    login = body['bd_id']

    table = chat_session_table

    response = table.get_item(Key={'bd_id': login})

    if 'Item' in response:
        return {
            'statusCode': 409,
            'body': json.dumps({
                'message': 'Item already exists',
                'bd_id': login
            })
        }

    item = {
        'bd_id': login,
        'name': body['name'],
        'wechatID': body['wechatID'],
        'team': body['team'],
        'site': body['site'],
        'employmentStatus': body['employmentStatus']
    }

    response = table.put_item(Item=item)

    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data inserted successfully',
                'bd_id': login
            })
        }
    else:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to insert data'
            })
        }
    


def put_bd_handler(event, chat_session_table):
    body = json.loads(event['body'])
    login = body.get('bd_id')

    if not login:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required field: login'
            })
        }

    table = chat_session_table
    
    response = table.get_item(Key={'bd_id': login})

    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'message': 'Item not found',
                'bd_id': login
            })
        }

    item = response['Item']

    if 'name' in body:
        item['name'] = body['name']
    if 'wechatID' in body:
        item['wechatID'] = body['wechatID']
    if 'team' in body:
        item['team'] = body['team']
    if 'site' in body:
        item['site'] = body['site']
    if 'employmentStatus' in body:
        item['employmentStatus'] = body['employmentStatus']
    
    
    response = table.put_item(Item=item)
    
    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data updated successfully',
                'bd_id': login
            })
        }
    else:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to update data'
            })
        }


