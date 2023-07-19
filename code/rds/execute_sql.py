import json
import boto3
import os



rds_client = boto3.client('rds-data')
database_name = os.getenv('DB_NAME')
db_cluster_arn = os.getenv('CLUSTER_ARN')
db_credentials_secrets_store_arn = os.getenv('SECRET_ARN')

def execute_sql(sql, sql_parameters=None):
     # Execute the SQL statement
    response = rds_client.execute_statement(
        secretArn=db_credentials_secrets_store_arn,
        database=database_name,
        resourceArn=db_cluster_arn,
        sql=sql,
        parameters=sql_parameters
    )
    return response
