import datetime
import json
import boto3
import os
import uuid

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    ticket_table = dynamodb.Table('table_name')

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_session_handler(event, ticket_table)
        elif http_method == 'PUT':
            return put_session_handler(event, ticket_table)
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
        
    
def post_session_handler(event, ticket_table):
    body = json.loads(event['body'])
    ticket_id = uuid.uuid1()
    question_title = body['question_title']
    question_content = body['question_content']
    revised_answer = body['revised_answer']
    tags = body['tags']
    answer_rating = body['answer_rating']
    difficulty_level = body['difficulty_level']
    owner_role = body['owner_role']
    question_owner = body['question_owner']
    session_id = body['session_id']
    assigned_sa = body['assigned_sa']
    ticket_source = body['ticket_source']
    failed_flag = body['failed_flag']
    priority = body['priority']
    ticket_creation_date = datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
    ticket_completion_date = datetime.datetime.now().strftime("%m/%d/%y,%H:%M:%S")
    
     table = ticket_table
    operation_result = ""

    response = table.get_item(Key={'session-id': session_id})

    # inserting values into table
    response = table.put_item(
        Item={
            'session-id': session_id,
            'session_owner': session_owner,
            'session_creation_date': session_creation_date,
            'last_update_date': last_update_date
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
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Data inserted successfully',
            'session_id': session_id
        })
    }
    
def post_session(session_id, ticket_table, session_owner, session_creation_date, last_update_date):
    # table name
    table = ticket_table
    operation_result = ""

    response = table.get_item(Key={'session-id': session_id})

    # inserting values into table
    response = table.put_item(
        Item={
            'session-id': session_id,
            'session_owner': session_owner,
            'session_creation_date': session_creation_date,
            'last_update_date': last_update_date
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


def put_session_handler(event, ticket_table):
    body = json.loads(event['body'])
    session_id = body['session-id']
    last_update_date = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    
    put_session(session_id=session_id, ticket_table=ticket_table, last_update_date=last_update_date)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Data updated successfully',
            'session_id': session_id
        })
    }
    
def put_session(session_id, ticket_table, last_update_date):
    table = ticket_table
    operation_result = ""
    
    response = table.get_item(Key={'session-id': session_id})

    if 'Item' not in response:
        return "Item not found"
    
    item = response['Item']
    item['last_update_date'] = last_update_date

    # Update the item with modified last_update_date
    response = table.put_item(Item=item)

    if "ResponseMetadata" in response.keys():
        if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            operation_result = "success"
        else:
            operation_result = "failed"
    else:
        operation_result = "failed"

    return operation_result
    
