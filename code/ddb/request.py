import datetime
import json
import boto3
import os
import uuid

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    ticket_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_handler(event, ticket_table)
        elif http_method == 'PUT':
            return put_handler(event, ticket_table)
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
        
    
def post_handler(event, ticket_table):
    body = json.loads(event['body'])
    ticket_id = body['ticket_id']
    request_id = 'request_'+ticket_id
    required_fields = ['ticket_id', 'assigned_sa', 'status', 'revised_answer',  'reminded']
    
    if not all(field in body for field in required_fields):
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required fields'
            })
        }
    table = ticket_table
    operation_result = ""

    response = table.get_item(Key={'request_id': request_id})
    
    if 'Item' in response:
        return {
            'statusCode': 409,
            'body': json.dumps({
                'message': 'Item already exists',
                'request_id': request_id
            })
        }
    # inserting values into table
    response = table.put_item(
        Item={
            "request_id":request_id,
            "ticket_id":ticket_id,
            "assigned_sa":body['assigned_sa'],
            "status":body['status'],
            "revised_answer":body['revised_answer'],
            "request_date":datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S"),
        }
    )

    return get_response(response, update=False, request_id=request_id)



def put_handler(event, ticket_table):
    table = ticket_table
    operation_result = ""
    body = json.loads(event['body'])
    request_id = body['request_id']
    if not request_id:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required field: request_id'
            })
        }
    response = table.get_item(Key={'request_id': request_id})
    
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'message': 'Item not found',
                'request_id': request_id
            })
        }
    
    item = response['Item']

    
    if 'assigned_sa' in body:
        item['assigned_sa'] = body['assigned_sa']
    if 'revised_answer' in body:
        item['revised_answer'] = body['revised_answer']
        request_completion_date = datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
        item['request_completion_date'] =request_completion_date
    if 'status' in body:
        item['status'] = body['status']
        if (body['status'] == 'Alerted'):
            last_alerted_date = datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
            item['last_alerted_date'] =last_alerted_date

    response = table.put_item(Item=item)

    return get_response(response, update=True)
        
def get_response(response, update=False, request_id=None):
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
                    'request_id': request_id
                })
            }
        else:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Insert failed'})}

    
