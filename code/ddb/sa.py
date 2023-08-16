import datetime
import json
import boto3
import os
import dateutil.tz
timezone = dateutil.tz.gettz('Asia/Singapore')

header = {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
            # "Access-Control-Allow-Credentials": True
        }
def lambda_handler(event, context):
    """
    handle rest api request to
    perform CRUD operation on sa table
    where sa infomation is stored.
    """
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    chat_session_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_sa_handler(event, chat_session_table)
        elif http_method == 'PUT':
            return put_sa_handler(event, chat_session_table)
        elif http_method == 'GET':
            return get_sa_handler(event, chat_session_table)
        else:
            return {
                'statusCode': 400,
                'headers': header,
                'body': json.dumps({
                    'message': 'Invalid request method'
                })
            }
    except Exception as e:
        # Return an error response with specific error message
        return {
            'statusCode': 500,
            'headers': header,
            'body': json.dumps({'error': str(e)})
        }
        
    
def post_sa_handler(event, chat_session_table):
    body = json.loads(event['body'])
    required_fields = ['name', 'sa_id', 'team', 'site', "access"]
    
    if not all(field in body for field in required_fields):
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required fields'
            })
        }
    
    login = body['sa_id']

    table = chat_session_table

    response = table.get_item(Key={'sa_id': login})

    if 'Item' in response:
        return {
            'statusCode': 409,
            'headers': header,
            'body': json.dumps({
                'message': 'Item already exists',
                'sa_id': login
            })
        }

    item = {
        'sa_id': login,
        'name': body['name'],
        'team': body['team'],
        'site': body['site'],
        'access': body['access']
    }
    item['last_update_date'] = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    if 'wechatID' in body:
        item['wechatID'] = body['wechatID']

    response = table.put_item(Item=item)

    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        return {
            'statusCode': 200,
            'headers': header,
            'body': json.dumps({
                'message': 'Data inserted successfully',
                'sa_id': login
            })
        }
    else:
        return {
            'statusCode': 500,
            'headers': header,
            'body': json.dumps({
                'message': 'Failed to insert data'
            })
        }
    


def put_sa_handler(event, chat_session_table):
    body = json.loads(event['body'])
    login = body.get('sa_id')

    if not login:
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required field: login'
            })
        }

    table = chat_session_table
    
    response = table.get_item(Key={'sa_id': login})

    if 'Item' not in response:
        return {
            'statusCode': 404,
            'headers': header,
            'body': json.dumps({
                'message': 'Item not found',
                'sa_id': login
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
    if 'access' in body:
        item['access'] = body['access']
    item['last_update_date'] = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    
    response = table.put_item(Item=item)
    
    if response['ResponseMetadata']['HTTPStatusCode'] == 200:
        return {
            'statusCode': 200,
            'headers': header,
            'body': json.dumps({
                'message': 'Data updated successfully',
                'sa_id': login
            })
        }
    else:
        return {
            'statusCode': 500,
            'headers': header,
            'body': json.dumps({
                'message': 'Failed to update data'
            })
        }

def get_sa_handler(event, chat_session_table):
    sa_id = event['pathParameters'].get('sa_id')
    if not sa_id:
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required path parameter: sa_id'
            })
        }
    
    table = chat_session_table
    if sa_id == "all":
        response = table.scan()
        items = response['Items']
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        return {
            'statusCode': 200,
            'headers': header,
            'body': json.dumps(items)
        }
    else:
        response = table.get_item(Key={'sa_id': sa_id})
        
        if 'Item' in response:
            item = response['Item']
            return {
                'statusCode': 200,
                'headers': header,
                'body': json.dumps(item)
            }
        else:
            return {
                'statusCode': 404,
                'headers': header,
                'body': json.dumps({
                    'message': 'Item not found',
                    'sa_id': sa_id
                })
            }



