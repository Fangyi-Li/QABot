import {
  CfnOutput,
  NestedStack,
  NestedStackProps,
  StackProps,
  Duration,
  CustomResource
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Provider } from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as dotenv from "dotenv";
dotenv.config();
const ssm = require("aws-cdk-lib/aws-ssm");
import * as lambda from "aws-cdk-lib/aws-lambda";

interface ResourceNestedStackProps extends NestedStackProps {
  readonly vpc: ec2.IVpc;
  readonly cluster: rds.ServerlessCluster;
  readonly apiId: string;
  readonly rootResourceId: string;
  readonly tableName: string;
}

export class RdsStackTemplate extends NestedStack {
  public readonly clusterDB:rds.ServerlessCluster
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;


    const cluster = props.cluster;
    const name = props.tableName;
    
    const api = RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.apiId,
      rootResourceId: props.rootResourceId,
    });
    

    const postFn = new lambda.Function(this, name+"PostFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "post.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/"+name),
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || "",
        DB_NAME: "QABotDB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: Duration.seconds(30)
    });

    cluster.grantDataApiAccess(postFn);
    
    const putFn = new lambda.Function(this, name+"PutFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "put.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/"+name),
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || "",
        DB_NAME: "QABotDB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: Duration.seconds(30)
    });

    cluster.grantDataApiAccess(putFn);

    
    const root = api.root.addResource("sa");
    root.addMethod("PUT", new LambdaIntegration(putFn));
    root.addMethod("POST", new LambdaIntegration(postFn));
    
  }
}
