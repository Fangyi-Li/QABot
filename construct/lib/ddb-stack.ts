import { NestedStack, StackProps, Duration, CfnOutput,NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly apiId: string;
  readonly rootResourceId: string;
  readonly vpc:ec2.IVpc;
  readonly securityGroup: ec2.SecurityGroup;
  // readonly _role: iam.Role;
  readonly name:string;
}

export class DynamoDBStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    const name = props.name;
    const _vpc = props.vpc
    const _securityGroup = props.securityGroup
    // const _role = props._role

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
    
    const lambdaRole = new iam.Role(this, name+'Role', {
      roleName: name+"Role",
      assumedBy:new iam.ServicePrincipal("lambda.amazonaws.com")
      // managedPolicies:[iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'), iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")]
    })
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources:['arn:aws:dynamodb:*','arn:aws:s3:::*'],
      actions:["dynamodb:*", "ec2:CreateNetworkInterface"],
      effect: iam.Effect.ALLOW,
    }))

    // Create the Lambda functions
    const postFn = new lambda.Function(this, "Post"+name+"Function", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: name+".lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      role: lambdaRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const putFn = new lambda.Function(this, "Put"+name+"Function", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: name+".lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      role: lambdaRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    
    const getFn = new lambda.Function(this, "Get"+name+"Function", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: name+".lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      role: lambdaRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    
    
    // Grant permissions to the Lambda functions to access the DynamoDB table
    table.grantReadWriteData(postFn);
    table.grantReadWriteData(putFn);
    table.grantReadWriteData(getFn);
   

    // Define the API resources and methods
    const session = api.root.addResource(name);
    const query = session.addResource('{'+name+'_id}')
    query.addMethod("GET", new LambdaIntegration(getFn), {apiKeyRequired: true});
    session.addMethod("POST", new LambdaIntegration(postFn), {apiKeyRequired: true});
    session.addMethod("PUT", new LambdaIntegration(putFn), {apiKeyRequired: true});
    
    if (name == "session") {
      const getMessageFn = new lambda.Function(this, "GetMessageFunction", {
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "get_session_message.lambda_handler",
        code: Code.fromAsset("../code/ddb/"),
        role: lambdaRole,
        vpc:_vpc,
        vpcSubnets: {
          subnets: _vpc.privateSubnets,
        },
        securityGroups: [_securityGroup],
        environment: {
          TABLE_NAME: table.tableName,
        },
      });
      table.grantReadWriteData(getMessageFn);
      query.addResource("message").addMethod("GET", new LambdaIntegration(getMessageFn), {apiKeyRequired: true});
    }
  
  }
}
