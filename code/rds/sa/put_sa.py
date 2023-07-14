import json
import boto3
import os



rds_client = boto3.client('rds-data')
database_name = os.getenv('DB_NAME')
db_cluster_arn = os.getenv('CLUSTER_ARN')
db_credentials_secrets_store_arn = os.getenv('SECRET_ARN')

def update_sa(data):
    try:
        # Construct the SQL statement for updating specific features
        sql = "UPDATE sa_profile SET "
        sql_parameters = []
        updates = []
        login = data['login']

        if 'wechat_id' in data:
            updates.append('wechat_id = :wechat_id')
            sql_parameters.append({'name': 'wechat_id', 'value': {'stringValue': data['wechat_id']}})

        if 'team' in data:
            updates.append('team = :team')
            sql_parameters.append({'name': 'team', 'value': {'stringValue': data['team']}})

        if 'site' in data:
            updates.append('site = :site')
            sql_parameters.append({'name': 'site', 'value': {'stringValue': data['site']}})

        if 'wechat_user' in data:
            updates.append('wechat_user = :wechat_user')
            sql_parameters.append({'name': 'wechat_user', 'value': {'booleanValue': data['wechat_user']}})
            
        if 'slack_user' in data:
            updates.append('slack_user = :slack_user')
            sql_parameters.append({'name': 'slack_user', 'value': {'booleanValue': data['slack_user']}})

        if 'mini_program_user' in data:
            updates.append('mini_program_user = :mini_program_user')
            sql_parameters.append({'name': 'mini_program_user', 'value': {'booleanValue': data['mini_program_user']}})
            
        if 'creation_time' in data:
            updates.append('creation_time = :creation_time')
            sql_parameters.append({'name': 'creation_time', 'value': {'stringValue': data['creation_time']}})
            
        if 'during_employment' in data:
            updates.append('during_employment = :during_employment')
            sql_parameters.append({'name': 'during_employment', 'value': {'booleanValue': data['during_employment']}})

        # Check if any updates are specified
        if not updates:
            return {'statusCode': 400, 'body': json.dumps({'message': 'No updates specified'})}

        # Combine the updates into the SQL statement
        sql += ', '.join(updates)
        sql += " WHERE login = :login"
        sql_parameters.append({'name': 'login', 'value': {'stringValue': login}})

        # Execute the SQL statement
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql=sql,
            parameters=sql_parameters
        )

        return {'statusCode': 200, 'body': json.dumps({'message': 'SA updated successfully'})}

    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e), 'type':login})}


def lambda_handler(event, context):

    data = json.loads(event['body'])
    # data = event['body']

    response = update_sa(data)
    return response



