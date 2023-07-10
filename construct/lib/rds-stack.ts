import { CfnOutput,NestedStack, NestedStackProps, StackProps }  from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from "dotenv";
dotenv.config();
const ssm = require('aws-cdk-lib/aws-ssm');
import * as lambda from 'aws-cdk-lib/aws-lambda';


interface ResourceNestedStackProps extends NestedStackProps {
  readonly vpc: ec2.IVpc;
  readonly dataSecurityGroup: ec2.SecurityGroup
}

export class RdsStack extends NestedStack {
    constructor(scope: Construct, id: string, props: ResourceNestedStackProps) {
        super(scope, id, props);
        
        const vpc = props.vpc;
        
        /* Secrets Manager Endpoint */
        vpc.addInterfaceEndpoint('sm',{
          service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER
        });
         
        /* RDS Data API Endpoint */
        vpc.addInterfaceEndpoint('rds_data',{
          service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA
        });
        
        const cluster = new rds.ServerlessCluster(this, "QABot Cluster", {
          engine: rds.DatabaseClusterEngine.auroraMysql({version: rds.AuroraMysqlEngineVersion.VER_2_07_1}),
          defaultDatabaseName: "QABotDB",
          vpc,
          vpcSubnets: {
            subnetType: SubnetType.PRIVATE_ISOLATED
          },
          enableDataApi: true,
          securityGroups: [props.dataSecurityGroup],
        });
        
        const postFn = new lambda.Function(this, 'TicketPostFunction', {
          runtime: lambda.Runtime.PYTHON_3_7,
          handler: 'post_ticket.lambda_handler',
          code: lambda.Code.fromAsset('../code/rds/ticket'),
          environment: {
            CLUSTER_ARN:cluster.clusterArn,
            SECRET_ARN:cluster.secret?.secretArn || "",
            DB_NAME: 'SABotDB',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
          },
          vpc:vpc,
          vpcSubnets: {
            subnetType:SubnetType.PRIVATE_WITH_EGRESS
          }
        });
        
        cluster.grantDataApiAccess(postFn);
        
        const putFn = new lambda.Function(this, 'TicketPutFunction', {
          runtime: lambda.Runtime.PYTHON_3_7,
          handler: 'put_ticket.lambda_handler',
          code: lambda.Code.fromAsset('../code/rds/ticket'),
          environment: {
            CLUSTER_ARN:cluster.clusterArn,
            SECRET_ARN:cluster.secret?.secretArn || "",
            DB_NAME: 'SABotDB',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
          },
          vpc:vpc,
          vpcSubnets: {
            subnetType:SubnetType.PRIVATE_WITH_EGRESS
          }
        });
        
        cluster.grantDataApiAccess(putFn);
        

        const api = new RestApi(this, 'DatabaseApi', {
          restApiName: 'QAbot Api'
        });
        
        const root = api.root.addResource('sabot');
        const ticket = root.addResource('ticket');
        ticket.addMethod('PUT', new LambdaIntegration(putFn));
        ticket.addMethod('POST', new LambdaIntegration(postFn));
        
        new CfnOutput(this, `API gateway endpoint url`,{value:`${api.url}`});
    }
}