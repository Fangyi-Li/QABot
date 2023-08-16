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

export class DdbQueryStack extends NestedStack {
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);
    
    const _vpc = props.vpc
    const _securityGroup = props.securityGroup
    
    const fn = new lambda.Function(this, "ddbQueryFunction", {
      runtime:lambda.Runtime.PYTHON_3_7,
      handler: "ddb_query.lambda_handler",
      code: lambda.Code.fromAsset("../code/ddb/"),
      timeout: Duration.minutes(1),
      vpc:_vpc,
      vpcSubnets: {
        subnets: _vpc.privateSubnets,
      },
      securityGroups: [_securityGroup]
    });
    

    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PartiQLSelect'],
      resources: ['arn:aws:dynamodb:*']
    }));
    
     const api = RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.apiId,
      rootResourceId: props.rootResourceId,
    });
    
    api.root.addResource('query').addMethod("POST", new LambdaIntegration(fn), {apiKeyRequired: true});
  }
}
