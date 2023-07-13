import json
import boto3
import os

rds_client = boto3.client('rds-data')
database_name = os.getenv('DB_NAME')
db_cluster_arn = os.getenv('CLUSTER_ARN')
db_credentials_secrets_store_arn = os.getenv('SECRET_ARN')


def get_next_ticket_id():
    response = rds_client.execute_statement(
        secretArn=db_credentials_secrets_store_arn,
        database=database_name,
        resourceArn=db_cluster_arn,
        sql="SELECT MAX(ticket_id) AS max_ticket_id FROM ticket"
    )
    print(response)
    null_ticket_id = None
    if 'isNull' in response['records'][0][0]:
        null_ticket_id = response['records'][0][0]['isNull']
    max_ticket_id = None
    if not null_ticket_id:
        max_ticket_id = response['records'][0][0]['longValue']
    next_ticket_id = max_ticket_id + 1 if max_ticket_id else 1
    return next_ticket_id

def lambda_handler(event, context):
    
    try:
        # Extract data from the API Gateway event
        body = json.loads(event['body'])
        ticket_id = get_next_ticket_id()
        question_answer = body['question_answer']
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
        reminded = body['reminded']
        ticket_creation_date = body['ticket_creation_date']
        ticket_completion_date = body['ticket_completion_date']
        
        # Construct the SQL statement for inserting data
        sql = """
            INSERT INTO ticket (
                ticket_id,
                question_content,
                question_answer,
                revised_answer,
                tags,
                answer_rating,
                difficulty_level,
                owner_role,
                question_owner,
                session_id,
                assigned_sa,
                ticket_source,
                failed_flag,
                priority,
                reminded,
                ticket_creation_date,
                ticket_completion_date
            ) VALUES (
                :ticket_id,
                :question_content,
                :question_answer,
                :revised_answer,
                :tags,
                :answer_rating,
                :difficulty_level,
                :owner_role,
                :question_owner,
                :session_id,
                :assigned_sa,
                :ticket_source,
                :failed_flag,
                :priority,
                :reminded,
                :ticket_creation_date,
                :ticket_completion_date
            )
        """
        
        # Construct the SQL parameters
        sql_parameters = [
            {'name': 'ticket_id', 'value': {'longValue': ticket_id}},
            {'name': 'question_content', 'value': {'stringValue': question_content}},
            {'name': 'question_answer', 'value': {'stringValue': question_answer}} if question_answer else  {'name': 'question_answer', 'value': {'isNull': True}},
            {'name': 'revised_answer', 'value': {'stringValue': revised_answer}} if revised_answer else  {'name': 'revised_answer', 'value': {'isNull': True}},
            {'name': 'tags', 'value': {'stringValue': tags}} if tags else  {'name': 'tags', 'value': {'isNull': True}},
            {'name': 'answer_rating', 'value': {'longValue': answer_rating}} if answer_rating else  {'name': 'answer_rating', 'value': {'isNull': True}},
            {'name': 'difficulty_level', 'value': {'longValue': difficulty_level}} if difficulty_level else  {'name': 'difficulty_level', 'value': {'isNull': True}},
            {'name': 'owner_role', 'value': {'stringValue': owner_role}},
            {'name': 'question_owner', 'value': {'stringValue': question_owner}},
            {'name': 'session_id', 'value': {'stringValue': session_id}},
            {'name': 'assigned_sa', 'value': {'stringValue': assigned_sa}} if assigned_sa else  {'name': 'assigned_sa', 'value': {'isNull': True}},
            {'name': 'ticket_source', 'value': {'stringValue': ticket_source}},
            {'name': 'failed_flag', 'value': {'booleanValue': failed_flag}} if failed_flag else  {'name': 'failed_flag', 'value': {'isNull': True}},
            {'name': 'priority', 'value': {'stringValue': priority}} if priority else  {'name': 'priority', 'value': {'isNull': True}},
            {'name': 'reminded', 'value': {'booleanValue': reminded}} if reminded else  {'name': 'reminded', 'value': {'isNull': True}},
            {'name': 'ticket_creation_date', 'value': {'stringValue': ticket_creation_date}},
            {'name': 'ticket_completion_date', 'value': {'stringValue': ticket_completion_date}} if ticket_completion_date else  {'name': 'ticket_completion_date', 'value': {'isNull': True}}
        ]
        
        # Execute the SQL statement
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql=sql,
            parameters=sql_parameters
        )
        
        # Return a successful response
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data inserted successfully',
                'ticket_id':ticket_id
            })
        }
    
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
