
import { NestedStack, CfnOutput,RemovalPolicy, NestedStackProps }  from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';

interface Ec2StackProps extends NestedStackProps {
    vpc: ec2.IVpc;
    securityGroup: ec2.SecurityGroup;
  }

export class Ec2Stack extends NestedStack {

    instanceId = '';
    dnsName = '';
    publicIP = '';
    /**
     *
     * @param {Construct} scope
     * @param {string} id
     * @param {StackProps=} props
     */
    constructor(scope:Construct, id:string, props:Ec2StackProps) {
      super(scope, id, props);
    
    const vpc = props.vpc;

    const securityGroup = props.securityGroup;
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH Access')
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS Access')
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8081), 'Allow HTTP 8081 port Access')
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP Access')
    securityGroup.addIngressRule(securityGroup, ec2.Port.allTraffic(), 'Allow Self Access')

    const role = new iam.Role(this, 'ec2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    })

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

    const ami = new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64
    });

    // Create the instance using the Security Group, AMI, and KeyPair defined in the VPC created
    const ec2Instance = new ec2.Instance(this, 'ProxyInstance', {
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        machineImage: ami,
        securityGroup: securityGroup,
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC,},
        role: role
    });

    this.instanceId = ec2Instance.instanceId;
    this.dnsName = ec2Instance.instancePublicDnsName;
    this.publicIP = ec2Instance.instancePublicIp;
        


    }
}