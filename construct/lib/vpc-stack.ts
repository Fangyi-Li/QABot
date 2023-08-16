import { CfnOutput, NestedStack, NestedStackProps }  from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType }from 'aws-cdk-lib/aws-ec2';
import * as dotenv from "dotenv";
import { Construct } from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
dotenv.config();

interface Ec2StackProps extends NestedStackProps {
    env: typeof process.env;
}

export class VpcStack extends NestedStack {


  vpc: ec2.IVpc;
  subnets: any;
  securityGroups: ec2.SecurityGroup[];
  publicSecurityGroup: ec2.SecurityGroup;
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope: Construct, id:string, props: Ec2StackProps) {
    super(scope, id, props);
    const existing_vpc_id = props.env.existing_vpc_id;


    this.vpc = new ec2.Vpc(this, 'QABot-Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.100.0.0/16'),
      maxAzs: 2,
            // subnetConfiguration: [
            //     {
            //       cidrMask: 24,
            //       name: 'PublicSubnet1',
            //       subnetType: SubnetType.PUBLIC,
            //     },
            //     {
            //       cidrMask: 24,
            //       name: 'PublicSubnet2',
            //       subnetType: SubnetType.PUBLIC,
            //     },
            //     {
            //       cidrMask: 24,
            //       name: 'PrivateEC2Subnet1',
            //       subnetType: SubnetType.PRIVATE_ISOLATED,
            //     },
            //     {
            //       cidrMask: 24,
            //       name: 'PrivateEC2Subnet2',
            //       subnetType: SubnetType.PRIVATE_ISOLATED,
            //     },
            // ],
    });
          // Output the VPC ID
    new CfnOutput(this, 'VpcId', {
        value: this.vpc.vpcId,
    });
    
    

    this.subnets =this.vpc.privateSubnets;

    // Create security groups
    this.publicSecurityGroup = new ec2.SecurityGroup(this, 'PublicSecurityGroup', {
        vpc:this.vpc,
        allowAllOutbound: true,
    });
  
      // Add ingress rules to security groups
    this.publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');

    const securityGroup = new ec2.SecurityGroup(this,'lambda-security-group',
        {vpc:this.vpc,
        description: 'lambda security',});

    securityGroup.addIngressRule(securityGroup, ec2.Port.allTraffic(), 'Allow self traffic');
    this.securityGroups = [securityGroup, this.publicSecurityGroup];
    
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
    
    
    // const dynamoDbEndpoint = this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
    //   service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    //   subnets: [
    //     { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
    //   ]
    // });
    // const dynamoDBPrincipal = new iam.ServicePrincipal('dynamodb.amazonaws.com');
    // dynamoDbEndpoint.addToPolicy(
    //   new iam.PolicyStatement({ // Restrict to listing and describing tables
    //     principals:[dynamoDBPrincipal],
    //     actions: ['dynamodb:*'],
    //     effect: iam.Effect.ALLOW,
    //     resources: ['*'],
    //   }));
    
  }
}