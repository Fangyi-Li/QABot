import json
import boto3
import os



rds_client = boto3.client('rds-data')
database_name = os.getenv('DB_NAME')
db_cluster_arn = os.getenv('CLUSTER_ARN')
db_credentials_secrets_store_arn = os.getenv('SECRET_ARN')

def update_ticket(ticket_id, data):
    try:
        # Construct the SQL statement for updating specific features
        sql = "UPDATE ticket SET "
        sql_parameters = []
        updates = []

        if 'question_answer' in data:
            updates.append('question_answer = :question_answer')
            sql_parameters.append({'name': 'question_answer', 'value': {'stringValue': json.dumps(data['question_answer'])}})

        if 'revised_answer' in data:
            updates.append('revised_answer = :revised_answer')
            sql_parameters.append({'name': 'revised_answer', 'value': {'stringValue': json.dumps(data['revised_answer'])}})

        if 'tags' in data:
            updates.append('tags = :tags')
            sql_parameters.append({'name': 'tags', 'value': {'stringValue': json.dumps(data['tags'])}})

        if 'difficulty_level' in data:
            updates.append('difficulty_level = :difficulty_level')
            sql_parameters.append({'name': 'difficulty_level', 'value': {'longValue': data['difficulty_level']}})
        
        if 'answer_rating' in data:
            updates.append('answer_rating = :answer_rating')
            sql_parameters.append({'name': 'answer_rating', 'value': {'longValue': data['answer_rating']}})
            
        if 'assigned_sa' in data:
            updates.append('assigned_sa = :assigned_sa')
            sql_parameters.append({'name': 'assigned_sa', 'value': {'stringValue': data['assigned_sa']}})

        if 'failed_flag' in data:
            updates.append('failed_flag = :failed_flag')
            sql_parameters.append({'name': 'failed_flag', 'value': {'booleanValue': data['failed_flag']}})
            
        if 'priority' in data:
            updates.append('priority = :priority')
            sql_parameters.append({'name': 'priority', 'value': {'stringValue': data['priority']}})

        if 'reminded' in data:
            updates.append('reminded = :reminded')
            sql_parameters.append({'name': 'reminded', 'value': {'booleanValue': data['reminded']}})
            
        if 'ticket_completion_date' in data:
            updates.append('ticket_completion_date = :ticket_completion_date')
            sql_parameters.append({'name': 'ticket_completion_date', 'value': {'stringValue': data['ticket_completion_date']}})

        # Check if any updates are specified
        if not updates:
            return {'statusCode': 400, 'body': json.dumps({'message': 'No updates specified'})}

        # Combine the updates into the SQL statement
        sql += ', '.join(updates)
        sql += " WHERE ticket_id = :ticket_id"
        sql_parameters.append({'name': 'ticket_id', 'value': {'longValue': ticket_id}})

        # Execute the SQL statement
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql=sql,
            parameters=sql_parameters
        )

        return {'statusCode': 200, 'body': json.dumps({'message': 'Ticket updated successfully'})}

    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e), 'type':ticket_id})}


def lambda_handler(event, context):
    ticket_id = event['pathParameters']['ticket_id']

    data = json.loads(event['body'])
    # data = event['body']

    response = update_ticket(int(ticket_id), data)
    return response



