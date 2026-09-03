import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'PlanoraVpc', {
      maxAzs: 2,
    });

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'PlanoraSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH'
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5000),
      'Allow Backend Port'
    );

    // FREE TIER ELIGIBLE INSTANCE
    const instance = new ec2.Instance(this, 'PlanoraInstance', {
      vpc,
      securityGroup,
      instanceType: new ec2.InstanceType('t3.micro'),

      machineImage: ec2.MachineImage.latestAmazonLinux2(),
    });

    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
    });
  }
}