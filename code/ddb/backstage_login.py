import datetime
import json
import boto3
import os

header = {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            # "Access-Control-Allow-Credentials": True
        }
secret = os.getenv('SECRET')
secrets_manager_client = boto3.client('secretsmanager')

def lambda_handler(event, context):
    http_method = event['httpMethod']
    
    try:
        if http_method == 'POST':
            return post_login_handler(event)
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
        
    
def post_login_handler(event):
    body = json.loads(event['body'])
    required_fields = ['name', 'password']
    
    name = body["name"]
    password = body["password"]
    
    response = secrets_manager_client.get_secret_value(SecretId=secret)
    secret_data = json.loads(response['SecretString'])
    secret_username = secret_data['username']
    secret_password = secret_data['password']
    
    if name == secret_username and password == secret_password:
        return {
            'statusCode': 200,
            'headers': header,
            'body': json.dumps({
                'message': 'Login successfully',
            })
        }
    else:
        return {
            'statusCode': 500,
            'headers': header,
            'body': json.dumps({
                'message': 'Failed to login'
            })
        }
    


