import { NestedStack, StackProps, Duration, CfnOutput,NestedStackProps, RemovalPolicy, CustomResource } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from "constructs";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly apiId: string;
  readonly rootResourceId: string;
}

export class saMappingStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'QABotS3Bucket', {
      bucketName: 'qabot-asset', 
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY, // This is just an example, use the appropriate removal policy for your use case
    });

    // Create the DynamoDB table
    const table = new dynamodb.Table(this, 'saMappingTable', {
      tableName: 'sa_mapping',
      partitionKey: {
        name: 'bd_login',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    
    const myRole:iam.Role = new iam.Role(this, 'myRole', {
      roleName: "myRole",
      assumedBy:new iam.ServicePrincipal("lambda.amazonaws.com")
      // managedPolicies:[iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'), iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")]
    })
    myRole.addToPolicy(new iam.PolicyStatement({
      resources:['arn:aws:dynamodb:*','arn:aws:s3:::*'],
      actions:["s3:PutObject","s3:DeleteObject", "dynamodb:*"]
    }))
    
    const onEvent = new lambda.Function(this, "CreateMappingFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "create_sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });
  

    const myProvider= new cr.Provider(this, 'MyProvider', {
      onEventHandler: onEvent,       
      // role: myRole, // must be assumable by the `lambda.amazonaws.com` service principal
    });

    const custom = new CustomResource(this, 'Resource1', { serviceToken: myProvider.serviceToken });
    // table.node.addDependency(custom);
    
    const postFn = new lambda.Function(this, "PostMappingFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const putFn = new lambda.Function(this, "PutMappingFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    
    const deleteFn = new lambda.Function(this, "deleteMappingFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(postFn);
    table.grantReadWriteData(putFn);
    table.grantReadWriteData(deleteFn);
    bucket.grantReadWrite(postFn)
    
     const api = RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.apiId,
      rootResourceId: props.rootResourceId,
    });
    // Define the API resources and methods
    const session = api.root.addResource('bd_mapping');
    session.addMethod("POST", new LambdaIntegration(postFn));
    session.addMethod("PUT", new LambdaIntegration(putFn));
    session.addMethod("DELETE", new LambdaIntegration(deleteFn))
    
    // Output the DynamoDB table name and Lambda function ARN for convenience
    new CfnOutput(this, 'DynamoDBTableName', { value: table.tableName });
  }
}
