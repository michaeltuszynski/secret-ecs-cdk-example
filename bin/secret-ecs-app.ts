import { App } from '@aws-cdk/core';
import { VPCDemoStack } from '../lib/vpc-stack';
import { RDSDemoStack } from '../lib/rds-stack';
import { ECSDemoStack } from '../lib/ecs-fargate-stack';

const app = new App();

const vpcStack = new VPCDemoStack(app, 'VPCStack', {
    maxAzs: 2
});

const rdsStack = new RDSDemoStack(app, 'RDSStack', {
    vpc: vpcStack.vpc,
});

rdsStack.addDependency(vpcStack);

const ecsStack = new ECSDemoStack(app, "ECSStack", {
    vpc: vpcStack.vpc,
    dbSecretArn: rdsStack.dbSecret.secretArn,
});

ecsStack.addDependency(rdsStack);