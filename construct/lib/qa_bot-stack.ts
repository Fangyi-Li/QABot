import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, Duration, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { VpcStack } from './vpc-stack';
import { Ec2Stack } from './ec2-stack';
import { RdsStack } from './rds-stack';
import { saRdsStack } from './sa-rds-stack';

export class QaBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const region = props?.env?.region;
    const account_id = Stack.of(this).account;

    const vpcStack = new VpcStack(this,'vpc-stack',{env:process.env});
    const vpc = vpcStack.vpc;
    const subnets = vpcStack.subnets;
    const securityGroups = vpcStack.securityGroups;

    const ec2stack = new Ec2Stack(this,'Ec2Stack',{vpc:vpc,securityGroup:securityGroups[0]});
    
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
      securityGroups: [securityGroups[2]],
    });
    
    const api = new RestApi(this, "QABotApi", {
      restApiName: "QAbot Api",
    });
    api.root.addMethod('ANY');
    const rdsStack = new RdsStack(this, 'RdsStack', {
      vpc:vpc, 
      cluster:cluster, 
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId
    });

    const saStack = new saRdsStack(this, 'SaRdsStack', {
      vpc:vpc, 
      cluster:cluster, 
      apiId: api.restApiId,
      rootResourceId: api.restApiRootResourceId
    });
    new CfnOutput(this, `API gateway endpoint url`, { value: `${api.url}` });

  }
}
