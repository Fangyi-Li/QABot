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
              login VARCHAR(225) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              wechat_id VARCHAR(255) DEFAULT NULL,
              team VARCHAR(255) DEFAULT NULL,
              site VARCHAR(255) DEFAULT NULL,
              wechat_user BOOLEAN DEFAULT NULL,
              slack_user BOOLEAN DEFAULT NULL,
              mini_program_user BOOLEAN DEFAULT NULL,
              creation_time DATETIME DEFAULT NULL,
              during_employment BOOLEAN NOT NULL
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
        login = body['login']
        name = body['name']
        wechat_id = body['wechat_id']
        team = body['team']
        site = body['site']
        wechat_user = body['wechat_user']
        slack_user = body['slack_user']
        mini_program_user = body['mini_program_user']
        creation_time = body['creation_time']
        during_employment = body['during_employment']

        
        # Construct the SQL statement for inserting data
        sql = """
            INSERT INTO sa_profile (
                login,
                name,
                wechat_id,
                team,
                site,
                wechat_user,
                slack_user,
                mini_program_user,
                creation_time,
                during_employment
            ) VALUES (
                :login,
                :name,
                :wechat_id,
                :team,
                :site,
                :wechat_user,
                :slack_user,
                :mini_program_user,
                :creation_time,
                :during_employment
            )
        """
        
        # Construct the SQL parameters
        sql_parameters = [
            {'name': 'login', 'value': {'stringValue': login}},
            {'name': 'name', 'value': {'stringValue': name}},
            {'name': 'wechat_id', 'value': {'stringValue': wechat_id}} if wechat_id else  {'name': 'wechat_id', 'value': {'isNull': True}},
            {'name': 'team', 'value': {'stringValue': team}} if team else  {'name': 'team', 'value': {'isNull': True}},
            {'name': 'site', 'value': {'stringValue': site}} if site else  {'name': 'site', 'value': {'isNull': True}},
            {'name': 'wechat_user', 'value': {'booleanValue': wechat_user}} if wechat_user else  {'name': 'wechat_user', 'value': {'isNull': True}},
            {'name': 'slack_user', 'value': {'booleanValue': slack_user}} if slack_user else  {'name': 'slack_user', 'value': {'isNull': True}},
            {'name': 'mini_program_user', 'value': {'booleanValue': mini_program_user}} if mini_program_user else  {'name': 'mini_program_user', 'value': {'isNull': True}},
            {'name': 'creation_time', 'value': {'stringValue': creation_time}},
            {'name': 'during_employment', 'value': {'booleanValue': during_employment}}
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
                'message': 'SA inserted successfully'
            })
        }
    
    except Exception as e:
        # Return an error response
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
