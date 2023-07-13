import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info('Received event: %s', event)

    cluster_arn = event['ResourceProperties']['ClusterArn']
    secret_arn = event['ResourceProperties']['SecretArn']
    database_name = event['ResourceProperties']['DatabaseName']

    try:
        client = boto3.client('rds-data')

        sql = """
            CREATE TABLE ticket (
              ticket_id INT PRIMARY KEY,
              question_content VARCHAR(255) NOT NULL,
              question_answer VARCHAR(255) DEFAULT NULL,
              revised_answer VARCHAR(255) DEFAULT NULL,
              tags VARCHAR(255) DEFAULT NULL,
              answer_rating INT DEFAULT NULL,
              difficulty_level INT DEFAULT NULL,
              owner_role VARCHAR(255),
              question_owner VARCHAR(255),
              session_id VARCHAR(255),
              assigned_sa VARCHAR(255) DEFAULT NULL,
              ticket_source VARCHAR(255),
              failed_flag BOOLEAN DEFAULT NULL,
              priority VARCHAR(255) DEFAULT NULL,
              reminded BOOLEAN DEFAULT NULL,
              ticket_creation_date DATETIME DEFAULT NULL,
              ticket_completion_date DATETIME DEFAULT NULL
            ) DEFAULT CHARACTER SET utf8mb4;
        """

        response = client.execute_statement(
            secretArn=secret_arn,
            resourceArn=cluster_arn,
            database=database_name,
            sql=sql
        )

        logger.info('Table created successfully')

        return {
            'Status': 'SUCCESS',
            'PhysicalResourceId': context.log_stream_name,
            'Data': {}
        }

    except Exception as e:
        logger.error('Error creating table: %s', str(e))

        return {
            'Status': 'FAILED',
            'PhysicalResourceId': context.log_stream_name,
            'Data': {},
            'Reason': str(e)
        }
