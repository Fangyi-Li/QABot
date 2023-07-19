import json
import boto3
import os
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

rds_client = boto3.client('rds-data')
database_name = os.getenv('DB_NAME')
db_cluster_arn = os.getenv('CLUSTER_ARN')
db_credentials_secrets_store_arn = os.getenv('SECRET_ARN')

def create_table():
    sql = """
            CREATE TABLE IF NOT EXISTS sa_profile (
              request_id INT AUTO_INCREMENT PRIMARY KEY,
              ticket_id INT NOT NULL,
              assigned_sa VARCHAR(255) NOT NULL,
              status VARCHAR(255) NOT NULL,
              revised_answer VARCHAR(255) DEFAULT NULL,
              request_date DATETIME NOT NULL,
              last_alert_date DATETIME DEFAULT NULL,
              completion_date DATETIME DEFAULT NULL
            ) DEFAULT CHARACTER SET utf8mb4;
        """

    response = rds_client.execute_statement(
        secretArn=db_credentials_secrets_store_arn,
        database=database_name,
        resourceArn=db_cluster_arn,
        sql=sql
    )

    logger.info('Table created successfully')


def lambda_handler(event, context):
    
    try:
        # Extract data from the API Gateway event
        create_table()
        body = json.loads(event['body'])
        ticket_id = body['ticket_id']
        assigned_sa = body['assigned_sa']
        status = body['status']
        revised_answer = body['revised_answer']
        request_date = body['request_date']
        last_alert_date = body['last_alert_date']
        completion_date = body['completion_date']

        
        # Construct the SQL statement for inserting data
        sql = """
            INSERT INTO sa_profile (
                ticket_id,
                assigned_sa,
                status,
                revised_answer,
                request_date,
                last_alert_date,
                completion_date,
            ) VALUES (
                :ticket_id,
                :assigned_sa,
                :status,
                :revised_answer,
                :request_date,
                :last_alert_date,
                :completion_date,
            )
        """
        
        # Construct the SQL parameters
        sql_parameters = [
            {'name': 'ticket_id', 'value': {'longValue': ticket_id}},
            {'name': 'assigned_sa', 'value': {'stringValue': assigned_sa}},
            {'name': 'status', 'value': {'stringValue': status}},
            {'name': 'revised_answer', 'value': {'stringValue': revised_answer}} if revised_answer else  {'name': 'revised_answer', 'value': {'isNull': True}},
            {'name': 'request_date', 'value': {'stringValue': request_date}},
            {'name': 'last_alert_date', 'value': {'stringValue': last_alert_date}} if last_alert_date else  {'name': 'last_alert_date', 'value': {'isNull': True}},
            {'name': 'completion_date', 'value': {'stringValue': completion_date}} if completion_date else  {'name': 'last_alert_date', 'value': {'isNull': True}},
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
                'message': 'Revision Request inserted successfully'
            })
        }
    
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
