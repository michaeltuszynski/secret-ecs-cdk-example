import * as cdk from "@aws-cdk/core";;
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns';
import { Secret, ISecret } from '@aws-cdk/aws-secretsmanager';

export interface ECSStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  dbSecret: string
}

export class ECSStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const vpc = props.vpc

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const creds = Secret.fromSecretCompleteArn(this, 'pgcreds', props.dbSecret);
  

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('mptaws/secretecs'),
        containerPort: 4000,
        enableLogging: true,
        secrets: {
          POSTGRES_USER: ecs.Secret.fromSecretsManager(creds!, 'username'),
          POSTGRES_PASS: ecs.Secret.fromSecretsManager(creds!, 'password'),
          POSTGRES_HOST: ecs.Secret.fromSecretsManager(creds!, 'host'),
          POSTGRES_PORT: ecs.Secret.fromSecretsManager(creds!, 'port'),
          POSTGRES_NAME: ecs.Secret.fromSecretsManager(creds!, 'dbname')
        }
      },
      desiredCount: 1,
      publicLoadBalancer: true
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.loadBalancerDnsName });
  }
}