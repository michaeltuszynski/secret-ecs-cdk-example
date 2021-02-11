import { App, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Vpc, InstanceType }from "@aws-cdk/aws-ec2";
import { Compatibility, TaskDefinition, Cluster, ContainerImage, Secret as ECSSecret }from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedEc2Service } from '@aws-cdk/aws-ecs-patterns';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export interface ECSStackProps extends StackProps {
  vpc: Vpc,
  dbSecretArn: string
}

export class ECSEC2Stack extends Stack {
  constructor(scope: App, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const containerPort = 4000;
    const containerImage = 'mptaws/secretecs';
    const creds = Secret.fromSecretCompleteArn(this, 'pgcreds', props.dbSecretArn);
    const vpc = props.vpc

    const cluster = new Cluster(this, 'Cluster', { vpc });
  
    const taskDefinition = new TaskDefinition(this, 'Task', {
      compatibility: Compatibility.EC2,
      memoryMiB: '512',
      cpu: '256',
    });

    taskDefinition.addContainer('demoApp', {
        image: ContainerImage.fromRegistry(containerImage),
        secrets: {
          POSTGRES_USER: ECSSecret.fromSecretsManager(creds!, 'username'),
          POSTGRES_PASS: ECSSecret.fromSecretsManager(creds!, 'password'),
          POSTGRES_HOST: ECSSecret.fromSecretsManager(creds!, 'host'),
          POSTGRES_PORT: ECSSecret.fromSecretsManager(creds!, 'port'),
          POSTGRES_NAME: ECSSecret.fromSecretsManager(creds!, 'dbname')
        },
        memoryLimitMiB:256,
        cpu: 256,
      })
      .addPortMappings({ containerPort: containerPort });

    cluster.addCapacity('demoapp-scaling-group', {
      instanceType: new InstanceType('t2.micro'),
      desiredCapacity: 1,
      maxCapacity: 4,
      minCapacity: 1
    });

    const ecsEc2Service = new ApplicationLoadBalancedEc2Service(
      this,
      'demoapp-service',
      {
        cluster,
        cpu: 256,
        desiredCount: 1,
        minHealthyPercent: 50,
        maxHealthyPercent: 300,
        serviceName: 'demoapp-service',
        taskDefinition: taskDefinition,
        publicLoadBalancer: true,
      },
    );
    new CfnOutput(this, 'LoadBalancerDNS', { value: ecsEc2Service.loadBalancer.loadBalancerDnsName});
  }
}