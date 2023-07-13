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

export class RdsStack extends NestedStack {
  public readonly clusterDB:rds.ServerlessCluster
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;


    const cluster = props.cluster;
    
    const api = props.api
    
    const saTableLambdaFunction = new lambda.Function(this, "saCreateFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "create_sa.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/sa"),
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: cluster.secret?.secretArn || "",
        DB_NAME: "QABotDB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      timeout: Duration.seconds(300),
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
    

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
    
    
    const provider = new Provider(this, 'CustomResourceProvider', {
      onEventHandler: saTableLambdaFunction,
      logRetention: RetentionDays.ONE_WEEK,
    });

    new CustomResource(this, 'customResourceResult', {
      serviceToken: provider.serviceToken,
      properties: {
        ClusterArn: cluster.clusterArn,
        SecretArn: cluster.secret?.secretArn || '',
        DatabaseName: 'QABotDB',
      },
    });
    
  // const sqlStatement = "CREATE TABLE ticket ("+
  //     "ticket_id INT PRIMARY KEY,"+
  //     "question_content VARCHAR(255) NOT NULL,"+
  //     "question_answer VARCHAR(255) DEFAULT NULL,"+
  //     "revised_answer VARCHAR(255) DEFAULT NULL,"+
  //     "tags VARCHAR(255) DEFAULT NULL,"+
  //     "answer_rating INT DEFAULT NULL,"+
  //     "difficulty_level INT DEFAULT NULL,"+
  //     "owner_role VARCHAR(255),"+
  //     "question_owner VARCHAR(255),"+
  //     "session_id VARCHAR(255),"+
  //     "assigned_sa VARCHAR(255) DEFAULT NULL,"+
  //     "ticket_source VARCHAR(255),"+
  //     "failed_flag BOOLEAN DEFAULT NULL,"+
  //     "priority VARCHAR(255) DEFAULT NULL,"+
  //     "reminded BOOLEAN DEFAULT NULL,"+
  //     "ticket_creation_date DATETIME DEFAULT NULL,"+
  //     "ticket_completion_date DATETIME DEFAULT NULL"+
  //   ") DEFAULT CHARACTER SET utf8mb4;"; 
    
  }
}
