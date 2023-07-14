import {
  CfnOutput,
  NestedStack,
  NestedStackProps,
  StackProps,
  Duration,
  CustomResource, Stack
} from "aws-cdk-lib";
import * as cr from 'aws-cdk-lib/custom-resources';
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
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';


interface ResourceNestedStackProps extends NestedStackProps {
  readonly vpc: ec2.IVpc;
  readonly dataSecurityGroup: ec2.SecurityGroup;
}

export class RdsStack extends NestedStack {
  public readonly clusterDB:rds.ServerlessCluster
  public readonly api: RestApi
  constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    /* Secrets Manager Endpoint */
    vpc.addInterfaceEndpoint("sm", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    /* RDS Data API Endpoint */
    vpc.addInterfaceEndpoint("rds_data", {
      service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
    });

    const cluster = new rds.ServerlessCluster(this, "QABot Cluster", {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_1,
      }),
      defaultDatabaseName: "QABotDB",
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      enableDataApi: true,
      securityGroups: [props.dataSecurityGroup],
    });
    this.clusterDB = cluster;
 


    // const secret = new secrets.Secret(this, "AuroraSecret", {
    //   secretName: "AuroraSecret",
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: "admin",
    //     }),
    //     generateStringKey: "password",
    //     excludePunctuation: true,
    //     includeSpace: false,
    //   },
    // });
    // cluster.addRotationSingleUser(secret);

    const postFn = new lambda.Function(this, "TicketPostFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "post_ticket.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/ticket"),
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

    cluster.grantDataApiAccess(postFn);

    const putFn = new lambda.Function(this, "TicketPutFunction", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "put_ticket.lambda_handler",
      code: lambda.Code.fromAsset("../code/rds/ticket"),
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

    const api = new RestApi(this, "DatabaseApi", {
      restApiName: "QAbot Api",
    });

    const root = api.root.addResource("qabot");
    const ticket = root.addResource("ticket");
    ticket.addResource('{ticket_id}').addMethod("PUT", new LambdaIntegration(putFn));
    ticket.addMethod("POST", new LambdaIntegration(postFn));
    this.api = api;
    
    // const ticketTableCustomResource = new CustomResource(this, 'TicketTableCustomResource', {
    //   serviceToken: ticketTableLambdaFunction.functionArn,
    //   properties: {
    //     ClusterArn: cluster.clusterArn,
    //     SecretArn: cluster.secret?.secretArn || '',
    //     DatabaseName: 'QABotDB',
    //   },
    // });
    
    
    // const provider = new Provider(this, 'CustomResourceProvider', {
    //   onEventHandler: ticketTableLambdaFunction,
    //   logRetention: RetentionDays.ONE_WEEK,
    // });

    // new cr.AwsCustomResource(this, 'customResourceResult', {
    //   onCreate: {
    //   serviceToken: provider.serviceToken,
    //   properties: {
    //     ClusterArn: cluster.clusterArn,
    //     SecretArn: cluster.secret?.secretArn || '',
    //     DatabaseName: 'QABotDB',
    //   },}
    // });
    //   const sqlStatement = "CREATE TABLE ticket ("+
    //   "ticket_id INT PRIMARY KEY,"+
    //   "question_content VARCHAR(255) NOT NULL,"+
    //   "question_answer VARCHAR(255) DEFAULT NULL,"+
    //   "revised_answer VARCHAR(255) DEFAULT NULL,"+
    //   "tags VARCHAR(255) DEFAULT NULL,"+
    //   "answer_rating INT DEFAULT NULL,"+
    //   "difficulty_level INT DEFAULT NULL,"+
    //   "owner_role VARCHAR(255),"+
    //   "question_owner VARCHAR(255),"+
    //   "session_id VARCHAR(255),"+
    //   "assigned_sa VARCHAR(255) DEFAULT NULL,"+
    //   "ticket_source VARCHAR(255),"+
    //   "failed_flag BOOLEAN DEFAULT NULL,"+
    //   "priority VARCHAR(255) DEFAULT NULL,"+
    //   "reminded BOOLEAN DEFAULT NULL,"+
    //   "ticket_creation_date DATETIME DEFAULT NULL,"+
    //   "ticket_completion_date DATETIME DEFAULT NULL"+
    // ") DEFAULT CHARACTER SET utf8mb4;"; 

    
    // const statement = new PolicyStatement({
    //   actions: ['rds-data:ExecuteStatement'],
    //   effect: Effect.ALLOW,
    //   resources: [cluster.secret?.secretArn || ''],
    // });
    
    // new cr.AwsCustomResource(this, 'customResourceResult', {
    //   onCreate: {
    //     service: 'Lambda',
    //     action: 'invoke',
    //     parameters: {
    //       FunctionName: ticketTableLambda.functionName,
    //       Payload: JSON.stringify({
    //         sql: sqlStatement,
    //       }),
    //     },
    //     physicalResourceId: cr.PhysicalResourceId.of('ticket-table-creation'),
    //   },
    //   policy: cr.AwsCustomResourcePolicy.fromStatements([statement])
    // });
    


    new CfnOutput(this, `API gateway endpoint url`, { value: `${api.url}` });
  }
}
