import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, Duration, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { VpcStack } from './vpc-stack';
import { Ec2Stack } from './ec2-stack';
import { RdsStack } from './rds-stack';

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

    const rdsStack = new RdsStack(this, 'RdsStack', {vpc:vpc, dataSecurityGroup:securityGroups[2]})


  }
}
