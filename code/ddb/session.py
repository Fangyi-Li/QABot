import datetime
import json
import boto3
import os
import uuid
import dateutil.tz
timezone = dateutil.tz.gettz('Asia/Singapore')

def lambda_handler(event, context):
    """
    handle rest api request to
    perform CRUD operation on session table where the history
    conversation is stored.
    """
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    chat_session_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_session_handler(event, chat_session_table)
        elif http_method == 'PUT':
            return put_session_handler(event, chat_session_table)
        elif http_method == 'GET':
            return get_session_handler(event, chat_session_table)  
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
        
    
def post_session_handler(event, chat_session_table):
    body = json.loads(event['body'])
    session_owner = body['session_owner']
    visibility = body['visibility']
    session_id = str(uuid.uuid1())
    session_creation_date = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    chat_history = []  # Initialize an empty chat history array
    new_message = {
        'sender': session_owner,
        'is_user': body['is_user'],
        'message': body['message'],
        'timestamp': body['timestamp']
    }
    chat_history.append(new_message)

    post_session(session_id=session_id, chat_session_table=chat_session_table, 
                   session_owner=session_owner, visibility=visibility,session_creation_date=session_creation_date,
                   chat_history=chat_history)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Data inserted successfully',
            'session_id': session_id
        })
    }
    
def post_session(session_id, chat_session_table, session_owner, visibility, session_creation_date, chat_history):
    # table name
    table = chat_session_table
    operation_result = ""

    response = table.get_item(Key={'session_id': session_id})

    # inserting values into table
    response = table.put_item(
        Item={
            'session_id': session_id,
            'session_owner': session_owner,
            'session_creation_date': session_creation_date,
            'last_update_date': session_creation_date,
            'visibility': visibility,
            'chat_history': chat_history
        }
    )

    if "ResponseMetadata" in response.keys():
        if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            operation_result = "success"
        else:
            operation_result = "failed"
    else:
        operation_result = "failed"

    return operation_result


def put_session_handler(event, chat_session_table):
    body = json.loads(event['body'])
    session_id = body['session_id']
    last_update_date = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    hasNewMessage = False
    new_message = ''
    if 'sender' in body and 'message' in body and 'timestamp' in body:
        hasNewMessage = True
        new_message = {
            'sender': body['sender'],
            'is_user': body['is_user'],
            'message': body['message'],
            'timestamp': body['timestamp']
        }
    
    put_session(body, session_id=session_id, chat_session_table=chat_session_table, last_update_date=last_update_date,
                new_message=new_message, hasNewMessage=hasNewMessage)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Data updated successfully',
            'session_id': session_id
        })
    }
    
def put_session(body,session_id, chat_session_table, last_update_date, new_message, hasNewMessage):

    table = chat_session_table
    operation_result = ""
    
    response = table.get_item(Key={'session_id': session_id})

    if 'Item' not in response:
        return "Item not found"
    
    item = response['Item']
    
    # Append the new message to the existing chat history
    if hasNewMessage:
        chat_history = item.get('chat_history', [])
        chat_history.append(new_message)
        item['chat_history'] = chat_history
    
    item['last_update_date'] = last_update_date
    
    if 'visibility' in body:
        item['visibility'] = body['visibility']

    # Update the item with modified chat history and last_update_date
    response = table.put_item(Item=item)

    if "ResponseMetadata" in response.keys():
        if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            operation_result = "success"
        else:
            operation_result = "failed"
    else:
        operation_result = "failed"

    return operation_result
    
def get_session_handler(event, chat_session_table):
    session_id = event['pathParameters'].get('session_id')
    if not session_id:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Missing required path parameter: session_id'
            })
        }
    
    table = chat_session_table
    
    response = table.get_item(Key={'session_id': session_id})
    
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
                'session_id': session_id
            })
        }
