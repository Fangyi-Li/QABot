import json
import boto3
header = {
            "Access-Control-Allow-Headers" : "Content-Type, x-api-key",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
            # "Access-Control-Allow-Credentials": True
        }
dynamodb = boto3.client('dynamodb')
def run_query(query):
    response = dynamodb.execute_statement(Statement=query)
    # Extract the items from the response
    items = response['Items']

    return items

def lambda_handler(event, context):
    # print(event['body'])
    query = json.loads(event['body'])['query']

    if not query:
        return {
            'statusCode': 400,
            'headers': header,
            'body': json.dumps({
                'message': 'Missing required query parameter: query'
            })
        }

    result = run_query(query)
    return {
        'statusCode': 200,
        'headers': header,
        'body': json.dumps({
            'query_result': result
        })
    }
