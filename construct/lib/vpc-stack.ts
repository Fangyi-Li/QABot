import { CfnOutput, NestedStack, NestedStackProps }  from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType }from 'aws-cdk-lib/aws-ec2';
import * as dotenv from "dotenv";
import { Construct } from 'constructs';
dotenv.config();

interface Ec2StackProps extends NestedStackProps {
    env: typeof process.env;
}

export class VpcStack extends NestedStack {


  vpc: ec2.IVpc;
  subnets: any;
  securityGroups: ec2.SecurityGroup[];
  publicSecurityGroup: ec2.SecurityGroup;
  dataSecurityGroup: ec2.SecurityGroup;
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope: Construct, id:string, props: Ec2StackProps) {
    super(scope, id, props);
    const existing_vpc_id = props.env.existing_vpc_id;


    //create a new vpc
    if (!existing_vpc_id || existing_vpc_id === 'optional')
    {
        this.vpc = new ec2.Vpc(this, 'QABot-Vpc', {
          ipAddresses: ec2.IpAddresses.cidr('10.22.0.0/16'),
            maxAzs: 2,
            subnetConfiguration: [
                {
                  cidrMask: 24,
                  name: 'PublicSubnet1',
                  subnetType: SubnetType.PUBLIC,
                },
                {
                  cidrMask: 24,
                  name: 'PublicSubnet2',
                  subnetType: SubnetType.PUBLIC,
                },
                {
                  cidrMask: 24,
                  name: 'PrivateDataBaseSubnet1',
                  subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                  cidrMask: 24,
                  name: 'PrivateEC2Subnet2',
                  subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
          // Output the VPC ID
        new CfnOutput(this, 'VpcId', {
            value: this.vpc.vpcId,
        });
    }
    else{
      this.vpc = ec2.Vpc.fromLookup(
        this, 'QABot-VPC',
        {
          vpcId:existing_vpc_id,
        }
      )
    }
    this.subnets =this.vpc.privateSubnets;

    // Create security groups
    this.publicSecurityGroup = new ec2.SecurityGroup(this, 'PublicSecurityGroup', {
        vpc:this.vpc,
        allowAllOutbound: true,
    });
  
    this.dataSecurityGroup = new ec2.SecurityGroup(this, 'PrivateSecurityGroup', {
        vpc:this.vpc,
        allowAllOutbound: true,
    });
  
      // Add ingress rules to security groups
    this.publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
    this.dataSecurityGroup.addIngressRule(this.publicSecurityGroup, ec2.Port.tcp(3306), 'Allow MySQL access');

    const securityGroup = new ec2.SecurityGroup(this,'lambda-security-group',
        {vpc:this.vpc,
        description: 'security',});

    securityGroup.addIngressRule(securityGroup, ec2.Port.allTraffic(), 'Allow self traffic');
    this.securityGroups = [securityGroup, this.publicSecurityGroup, this.dataSecurityGroup];
    
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    this.vpc.addInterfaceEndpoint('glue',{
        service:ec2.InterfaceVpcEndpointAwsService.GLUE,
        securityGroups:this.securityGroups,
         subnets:{subnets:this.subnets}
    });
}
}