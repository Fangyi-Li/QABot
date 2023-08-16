import json
import csv
import boto3
import os
import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table_name = os.getenv('TABLE_NAME')
bucket_name = os.getenv('BUCKET_NAME')
object_key = os.getenv('OBJECT_KEY')

def lambda_handler(event, context):
    http_method= event['httpMethod']
    table = dynamodb.Table(table_name)
    try:
       
        if http_method == 'POST':
            body = json.loads(event['body'])
            return post_handler(body, table)
        elif http_method == 'PUT':
            body = json.loads(event['body'])
            return put_handler(body, table)
        elif http_method == 'DELETE':
            body = json.loads(event['body'])
            return delete_handler(body, table)
        elif http_method == 'GET':
            return get_handler(event, table)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Invalid request method'
                })
            }
        
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def post_handler(body, table):
    bd_login = body['bd_login']
    sa_login = body['sa_login']
    required_fields = ['bd_login', 'sa_login']
    
    if not all(field in body for field in required_fields):
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required fields'
            })
        }
    operation_result = ""

    response = table.get_item(Key={'bd_login': bd_login})
    
    if 'Item' in response:
        return {
            'statusCode': 409,
            'body': json.dumps({
                'message': 'Item already exists, delete it first',
                'bd_login': bd_login
            })
        }
    # inserting values into table
    response = table.put_item(
        Item={
            "bd_login":bd_login,
            "sa_login":sa_login,
            "last_update_date":datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
        }
    )

    return get_response(response, update=False, bd_login=bd_login)



def put_handler(body, table):
    operation_result = ""
    bd_login = body['bd_login']
    sa_login = body['sa_login']
    if not bd_login or not sa_login:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required field: bd_login or sa_login'
            })
        }
    response = table.get_item(Key={'bd_login': bd_login})
    
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'message': 'bd_login not found',
                'bd_login': bd_login
            })
        }
    
    item = response['Item']

    insert_date = datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
    item['last_update_date'] =insert_date
    item['sa_login'] = sa_login

    response = table.put_item(Item=item)

    return get_response(response, update=True)
    
def delete_handler(body, table):
    bd_login = body['bd_login']
    if not bd_login:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required field: bd_login'
            })
        }
    response = table.delete_item(Key={'bd_login': bd_login})
    return {
            'statusCode': 200,
            'body': json.dumps({'message':'BD mapping deleted successfully.'})
        }
    
def get_response(response, update=False, bd_login=None):
    if update:
        if "ResponseMetadata" in response.keys():
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                operation_result = "success"
            else:
                operation_result = "failed"
        else:
            operation_result = "failed"
    
        if operation_result == 'success':
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Data updated successfully',
                })
            }
        else:
            return {'statusCode': 400, 'body': json.dumps({'message': 'No updates specified'})}
    else:
        if "ResponseMetadata" in response.keys():
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                operation_result = "success"
            else:
                operation_result = "failed"
        else:
            operation_result = "failed"
            
        if operation_result == 'success':
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Data inserted successfully',
                    'bd_login': bd_login
                })
            }
        else:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Insert failed'})}
            
def get_handler(event, chat_session_table):
    bd_login = event['pathParameters'].get('bd_id')
    if not bd_login:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required path parameter: bd_id'
            })
        }
    
    table = chat_session_table
    
    response = table.get_item(Key={'bd_login': bd_login})
    
    if 'Item' in response:
        item = response['Item']
        return {
            'statusCode': 200,
            'body': json.dumps(item)
        }
    else:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'message': 'Item not found',
                'bd_login': bd_login
            })
        }