import json
import boto3

rds_client = boto3.client('rds-data')
database_name = 'YOUR_DATABASE_NAME'
db_cluster_arn = 'YOUR_DB_CLUSTER_ARN'
db_credentials_secrets_store_arn = 'YOUR_DB_CREDENTIALS_SECRETS_STORE_ARN'

def lambda_handler(event, context):
    try:
        # Extract data from the API Gateway event
        body = json.loads(event['body'])
        ticket_id = body['ticket_id']
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
                :reminded
                :ticket_creation_date,
                :ticket_completion_date
            )
        """
        
        # Construct the SQL parameters
        sql_parameters = [
            {'name': 'ticket_id', 'value': {'stringValue': ticket_id}},
            {'name': 'question_content', 'value': {'stringValue': question_content}},
            {'name': 'question_answer', 'value': {'stringValue': question_answer}},
            {'name': 'revised_answer', 'value': {'stringValue': revised_answer}},
            {'name': 'tags', 'value': {'stringValue': json.dumps(tags)}},
            {'name': 'answer_rating', 'value': {'longValue': answer_rating}},
            {'name': 'difficulty_level', 'value': {'longValue': difficulty_level}},
            {'name': 'owner_role', 'value': {'stringValue': owner_role}},
            {'name': 'question_owner', 'value': {'stringValue': question_owner}},
            {'name': 'session_id', 'value': {'stringValue': session_id}},
            {'name': 'assigned_sa', 'value': {'stringValue': json.dumps(assigned_sa)}},
            {'name': 'ticket_source', 'value': {'stringValue': ticket_source}},
            {'name': 'failed_flag', 'value': {'booleanValue': failed_flag}},
            {'name': 'reminded', 'value': {'booleanValue': reminded}},
            {'name': 'ticket_creation_date', 'value': {'stringValue': ticket_creation_date}},
            {'name': 'ticket_completion_date', 'value': {'stringValue': ticket_completion_date}}
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
            'body': json.dumps({'message': 'Data inserted successfully'})
        }
    
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
