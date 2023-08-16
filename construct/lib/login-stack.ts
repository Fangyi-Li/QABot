import { NestedStack, StackProps, Duration, CfnOutput,NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly apiId: string;
  readonly rootResourceId: string;
  readonly vpc:ec2.IVpc;
  readonly securityGroup: ec2.SecurityGroup;
}

export class LoginStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    const _vpc = props.vpc
    const _securityGroup = props.securityGroup
    // const _role = props._role

    const api = RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.apiId,
      rootResourceId: props.rootResourceId,
    });
    
    // Create the secret manager
    const secret = new secretsmanager.Secret(this, 'TechbotLoginSecret', {
      secretName: 'TechBotBackstageLoginSecret', // Name of the secret
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'TechBot',
        }),
        generateStringKey: 'password',
        excludeCharacters: '@/" ', 
      },
    });
    
    const lambdaRole = new iam.Role(this, 'loginRole', {
      roleName: "loginRole",
      assumedBy:new iam.ServicePrincipal("lambda.amazonaws.com")
      // managedPolicies:[iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'), iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")]
    })
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources:[secret.secretArn],
      actions:["secretsmanager:GetSecretValue"],
      effect: iam.Effect.ALLOW,
    }))

    // Create the Lambda functions
    const postFn = new lambda.Function(this, "LoginFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "backstage_login.lambda_handler",
      code: Code.fromAsset("../code/ddb/"),
      role: lambdaRole,
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup],
      environment: {
        SECRET: secret.secretName,
      },
    });
    // Grant permissions to the Lambda function
    secret.grantRead(postFn);

    // Define the API resources and methods
    const session = api.root.addResource("backstage_login");
    session.addMethod("POST", new LambdaIntegration(postFn));
    
  }
}
