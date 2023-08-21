import { NestedStack, StackProps, Duration, CfnOutput,NestedStackProps, RemovalPolicy, CustomResource } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from "constructs";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly apiId: string;
  readonly rootResourceId: string;
  readonly vpc:ec2.IVpc;
  readonly securityGroup: ec2.SecurityGroup;
  // readonly _role: iam.Role;
}

export class saMappingStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    const _vpc = props.vpc
    const _securityGroup = props.securityGroup
    // const _role = props._role
    
    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'QABotS3Bucket', {
      bucketName: 'techbot-assets', 
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
    
    const myRole = new iam.Role(this, 'myRole', {
      roleName: "myRole",
      assumedBy:new iam.ServicePrincipal("lambda.amazonaws.com")
      // managedPolicies:[iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'), iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")]
    })
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
    myRole.addToPolicy(new iam.PolicyStatement({
      resources:['arn:aws:dynamodb:*','arn:aws:s3:::*'],
      actions:["s3:*", "s3:PostObject","dynamodb:*", "ec2:CreateNetworkInterface"],
      effect: iam.Effect.ALLOW,
    }))
    
    const onEvent = new lambda.Function(this, "CreateMappingFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "create_sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      timeout: Duration.minutes(1),
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });
    
    onEvent.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetBucketNotification', 's3:PutBucketNotification'],
        effect: iam.Effect.ALLOW,
        resources: [ bucket.bucketArn ]
      })
    );
    onEvent.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:*'],
        effect: iam.Effect.ALLOW,
        resources: [ bucket.bucketArn ]
      })
    );
    
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(onEvent), {
        prefix:'sa_mapping.csv'
      }
    )
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
      new s3n.LambdaDestination(onEvent), 
    )
    
    const postFn = new lambda.Function(this, "PostMappingFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });

    const putFn = new lambda.Function(this, "PutMappingFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });
    
    const deleteFn = new lambda.Function(this, "deleteMappingFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });
    const getFn = new lambda.Function(this, "getMappingFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "sa_mapping.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      role: myRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        OBJECT_KEY: 'sa_mapping.csv'
      },
    });
    table.grantReadWriteData(getFn);
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
    session.addResource('{bd_id}').addMethod("GET", new LambdaIntegration(getFn), {apiKeyRequired: true});
    session.addMethod("POST", new LambdaIntegration(postFn), {apiKeyRequired: true});
    session.addMethod("PUT", new LambdaIntegration(putFn), {apiKeyRequired: true});
    session.addMethod("DELETE", new LambdaIntegration(deleteFn), {apiKeyRequired: true});
    
    // Output the DynamoDB table name and Lambda function ARN for convenience
    new CfnOutput(this, 'DynamoDBTableName', { value: table.tableName });
  }
}
