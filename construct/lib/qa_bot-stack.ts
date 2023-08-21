import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, Duration, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import { LambdaIntegration, RestApi, MethodLoggingLevel, Cors, ResponseType, ApiKey, Period } from "aws-cdk-lib/aws-apigateway";
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { VpcStack } from './vpc-stack';
import { Ec2Stack } from './ec2-stack';
import { RdsStack } from './rds-stack';
import { DynamoDBStack } from './ddb-stack';
import { saMappingStack } from './sa-mapping-stack';
import { DdbQueryStack } from './ddb-query';
import { LoginStack } from './login-stack';

export class QaBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const region = props?.env?.region;
    const account_id = Stack.of(this).account;
    
    const vpcStack = new VpcStack(this,'vpc-stack',{env:process.env});
    const vpc = vpcStack.vpc;
    const securityGroups = vpcStack.securityGroups;
    // const myRole = vpcStack.myRole

    const ec2stack = new Ec2Stack(this,'Ec2Stack',{vpc:vpc,securityGroup:securityGroups[0]});
    ec2stack.addDependency(vpcStack);
    // /* Secrets Manager Endpoint */
    // vpc.addInterfaceEndpoint("sm", {
    //   service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    // });

    // /* RDS Data API Endpoint */
    // vpc.addInterfaceEndpoint("rds_data", {
    //   service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
    // });

    const api = new RestApi(this, "QABotApi", {
      restApiName: "QAbot Api",
      description: 'This service serves the QABot API.',
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["OPTIONS", "GET", "POST","PUT"],
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
      cloudWatchRole: true,
      deployOptions: {
                stageName: 'prod',
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                tracingEnabled: true,
            }
    });
    // api.root.addMethod('ANY');
    api.addGatewayResponse('cors2',{  
      type:ResponseType.DEFAULT_4XX,
      statusCode: '400',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      }
    });
    api.addGatewayResponse('cors3',{  
      type:ResponseType.DEFAULT_5XX,
      statusCode: '500',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      }
    });
    
    // add api key and store it in secrets manager
    
    const plan = api.addUsagePlan('UsagePlan', {
        name: 'api_key',
        description: 'For TechBot',
        throttle: {
          burstLimit: 50,
          rateLimit: 100,
        },
        quota: {
          limit: 1000000,
          period: Period.DAY
        }
    });

    const normalUserKey = api.addApiKey('ApiKey',{
        apiKeyName: 'techbot-api-key',
    });
    plan.addApiKey(normalUserKey);
    
    plan.addApiStage({
      stage: api.deploymentStage
    });
    
    
    // create dynamodb tables stack
    const session = new DynamoDBStack(this, 'sessionStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "session"
    });
    
    const ticket = new DynamoDBStack(this, 'ticketStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "ticket"
    });
    
    const request = new DynamoDBStack(this, 'requestStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "request"
    });
    
    const sa = new DynamoDBStack(this, 'saStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "sa"
    });
    
    const bd = new DynamoDBStack(this, 'bdStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "bd"
    });
    
    const dgr = new DynamoDBStack(this, 'dgrStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
      name: "dgr"
    });
    
    // const bot = new DynamoDBStack(this, 'botStack', {
    //   apiId: api.restApiId,
    //   rootResourceId: api.restApiRootResourceId,
    //   vpc:vpc,
    //   securityGroup:securityGroups[0],
    //   name: "bot"
    // });
    
    const saMapping = new saMappingStack(this, 'mappingStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0],
      // _role:myRole,
    });
    
    const backstageLogin = new LoginStack(this, 'backstageLoginStack', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0]
    });
    
    const query = new DdbQueryStack(this, 'queryDdb', {
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId,
      vpc:vpc,
      securityGroup:securityGroups[0]
    });
    
    
    // const cluster = new rds.ServerlessCluster(this, "QABot Cluster", {
    //   engine: rds.DatabaseClusterEngine.auroraMysql({
    //     version: rds.AuroraMysqlEngineVersion.VER_2_07_1,
    //   }),
    //   defaultDatabaseName: "QABotDB",
    //   vpc,
    //   vpcSubnets: {
    //     subnetType: SubnetType.PRIVATE_ISOLATED,
    //   },
    //   enableDataApi: true,
    //   securityGroups: [securityGroups[2]],
    // });
    
    // const rdsStack = new RdsStack(this, 'RdsStack', {
    //   vpc:vpc, 
    //   cluster:cluster, 
    //   apiId: api.restApiId,
    //   rootResourceId: api.restApiRootResourceId
    // });

    // const saStack = new saRdsStack(this, 'SaRdsStack', {
    //   vpc:vpc, 
    //   cluster:cluster, 
    //   apiId: api.restApiId,
    //   rootResourceId: api.restApiRootResourceId
    // });
    new CfnOutput(this, `API gateway endpoint url`, { value: `${api.url}` });
    new CfnOutput(this, `API Key`, { value: `${normalUserKey.keyId}` });

  }
}
