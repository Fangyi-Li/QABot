import datetime
import json
import boto3
import os
import uuid
from decimal import Decimal
import dateutil.tz
timezone = dateutil.tz.gettz('Asia/Singapore')


header = {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
            # "Access-Control-Allow-Credentials": True
        }
def lambda_handler(event, context):
    """handle rest api request to
    perform CRUD operation on ticket table
    """
    dynamodb = boto3.resource('dynamodb')
    table_name = os.getenv('TABLE_NAME')
    ticket_table = dynamodb.Table(table_name)

    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_handler(event, ticket_table)
        elif http_method == 'PUT':
            return put_handler(event, ticket_table)
        elif http_method == 'GET':
            return get_ticket_handler(event, ticket_table)
        else:
            return {
                'statusCode': 400,
                'headers': header,
                'body': json.dumps({
                    'message': 'Invalid request method'
                })
            }
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'headers': header,
            'body': json.dumps({'error': str(e)})
        }
        
    
def post_handler(event, ticket_table):
    body = json.loads(event['body'])
    ticket_id = str(uuid.uuid1())
    required_fields = ['question_title', 'question_content', 'question_answer', 'revised_answer', 'tags', 'answer_rating','difficulty_level','owner_role','question_owner','session_id','assigned_sa','ticket_source','failed_flag','priority']
    
    if not all(field in body for field in required_fields):
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required fields'
            })
        }
    ticket_creation_date = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    
    table = ticket_table
    operation_result = ""

    response = table.get_item(Key={'ticket_id': ticket_id})
    if 'Item' in response:
        return {
            'statusCode': 409,
            'headers': header,
            'body': json.dumps({
                'message': 'Item already exists',
                'ticket_id': ticket_id
            })
        }

    # inserting values into table
    response = table.put_item(
        Item={
            "ticket_id":ticket_id,
            "question_title":body['question_title'],
            "question_content":body['question_content'],
            "question_answer":body['question_answer'],
            "revised_answer":body['revised_answer'],
            "tags":body['tags'],
            "answer_rating":body['answer_rating'],
            "difficulty_level":body['difficulty_level'],
            "owner_role":body['owner_role'],
            "question_owner":body['question_owner'],
            "session_id":body['session_id'],
            "assigned_sa":body['assigned_sa'],
            "ticket_source":body['ticket_source'],
            "failed_flag":body['failed_flag'],
            "priority":body['priority'],
            "ticket_creation_date":ticket_creation_date
        }
    )

    return get_response(response, update=False, ticket_id=ticket_id)



def put_handler(event, ticket_table):
    table = ticket_table
    operation_result = ""
    body = json.loads(event['body'])
    ticket_id = body['ticket_id']
    response = table.get_item(Key={'ticket_id': ticket_id})
    
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'headers': header,
            'body': json.dumps({
                'message': 'Item not found',
                'ticket_id': ticket_id
            })
        }
    
    item = response['Item']

    ticket_completion_date = datetime.datetime.now(tz=timezone).strftime("%m/%d/%y,%H:%M:%S")
    if 'question_answer' in body:
        item['question_answer'] = body['question_answer']
        item['ticket_completion_date'] =ticket_completion_date
    if 'revised_answer' in body:
        item['revised_answer'] = body['revised_answer']
        item['ticket_completion_date'] =ticket_completion_date
    if 'tags' in body:
        item['tags'] = body['tags']
    if 'difficulty_level' in body:
        item['difficulty_level'] = body['difficulty_level']
    if 'answer_rating' in body:
        item['answer_rating'] = body['answer_rating']
    if 'assigned_sa' in body:
        item['assigned_sa'] = body['assigned_sa']
    if 'failed_flag' in body:
        item['failed_flag'] = body['failed_flag']
    if 'priority' in body:
        item['priority'] = body['priority']

    response = table.put_item(Item=item)

    return get_response(response, update=True)
        
def get_response(response, update=False, ticket_id=None):
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
                'headers': header,
                'body': json.dumps({
                    'message': 'Data updated successfully',
                })
            }
        else:
            return {'statusCode': 400,'headers': header, 'body': json.dumps({'message': 'No updates specified'})}
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
                'headers': header,
                'body': json.dumps({
                    'message': 'Data inserted successfully',
                    'ticket_id': ticket_id
                })
            }
        else:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Insert failed'})}

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

def get_ticket_handler(event, chat_session_table):
    ticket_id = event['pathParameters'].get('ticket_id')
    if not ticket_id:
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required path parameter: ticket_id'
            })
        }
    
    table = chat_session_table
    
    # to get all ticket
    if ticket_id == "all":
        response = table.scan()
        items = response['Items']
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        return {
            'statusCode': 200,
            'headers': header,
            'body': json.dumps(items, cls=DecimalEncoder)
        }
    else:
        # get ticket with specific ticket_id
        response = table.get_item(Key={'ticket_id': ticket_id})
        
        if 'Item' in response:
            item = response['Item']
            return {
                'statusCode': 200,
                'headers': header,
                'body': json.dumps(item, cls=DecimalEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'headers': header,
                'body': json.dumps({
                    'message': 'Item not found',
                    'ticket_id': ticket_id
                })
            }
