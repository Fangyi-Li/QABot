import { NestedStack, StackProps, Duration, CfnOutput,NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly apiId: string;
  readonly rootResourceId: string;
  readonly name:string
}

export class DynamoDBStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    const name = props.name;

    const api = RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.apiId,
      rootResourceId: props.rootResourceId,
    });
    
    // Create the DynamoDB table
    const table = new Table(this, name+"Table", {
      tableName: name+"Info",
      partitionKey: {
        name: name+"_id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY, // Optional: Set the removal policy as needed
    });

    // Create the Lambda functions
    const postFn = new lambda.Function(this, "Post"+name+"Function", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: name+".lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const putFn = new lambda.Function(this, "Put"+name+"Function", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: name+".lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    
    
    // Grant permissions to the Lambda functions to access the DynamoDB table
    table.grantReadWriteData(postFn);
    table.grantReadWriteData(putFn);
   

    // Define the API resources and methods
    const session = api.root.addResource(name);
    session.addMethod("POST", new LambdaIntegration(postFn));
    session.addMethod("PUT", new LambdaIntegration(putFn));
  
  }
}
