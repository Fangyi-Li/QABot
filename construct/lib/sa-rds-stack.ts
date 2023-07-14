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
  readonly api: RestApi
}

export class saRdsStack extends NestedStack {
  public readonly clusterDB:rds.ServerlessCluster
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;


    const cluster = props.cluster;
    
    const api = props.api
  
    // sa profile
    const postSAFn = new lambda.Function(this, "SAProfilePostFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "post_sa.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/sa"),
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
    });

    cluster.grantDataApiAccess(postSAFn);
    
    const putSAFn = new lambda.Function(this, "SAPutFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "put_sa.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/sa"),
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

    cluster.grantDataApiAccess(putSAFn);

    
    const root = api.root.addResource("sa");
    root.addMethod("PUT", new LambdaIntegration(putSAFn));
    root.addMethod("POST", new LambdaIntegration(postSAFn));
    
  }
}
