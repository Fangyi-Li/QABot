import json
import boto3
import os

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    chat_session_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'GET':
            return get_message_handler(event, chat_session_table)
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

def get_message_handler(event, chat_session_table):
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
        chat_history = response.get('Item', {}).get('chat_history', [])
        messages = []
        for entry in chat_history:
            sender = entry.get('sender')
            message = entry.get('message')
    
            # Assuming the sender is either "assistant" or "user"
            role = "assistant" if sender == "U05F9D5NAEN" else "user"
    
            if role == "assistant" or entry.get('is_user'):
                messages.append({"role": role, "content": message})
        response_data = {"messages": messages}
        return {
            'statusCode': 200,
            'body': json.dumps(response_data)
        }
    else:
        return {
            'statusCode': 404,
            'body': json.dumps({
                'message': 'Item not found',
                'session_id': session_id
            })
        }