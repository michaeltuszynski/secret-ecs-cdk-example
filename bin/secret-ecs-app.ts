import { App } from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSStack } from '../lib/ecs-stack';

const cdkEnv = { 
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.AWS_ACCOUNT_ID, 
    region: process.env.CDK_DEPLOY_REGION || process.env.AWS_REGION 
}

const app = new App();

const vpcStack = new VPCStack(app, 'VPCStack',{
    env: cdkEnv
});

const rdsStack = new RDSStack(app, 'RDSStack', {
    vpc: vpcStack.vpc,
    env: cdkEnv
});

const ecsStack = new ECSStack(app, "ECSStack", {
    vpc: vpcStack.vpc,
    dbSecretArn: rdsStack.dbSecret.secretArn,
    env: cdkEnv
});

rdsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);
