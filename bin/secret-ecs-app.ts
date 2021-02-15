import { App } from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSEC2Stack } from '../lib/ecs-ec2-stack';
import axios from 'axios';

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

const ecsec2Stack = new ECSEC2Stack(app, "ECSEC2Stack", {
    vpc: vpcStack.vpc,
    dbSecretArn: rdsStack.dbSecret.secretArn,
    env: cdkEnv
});

rdsStack.addDependency(vpcStack);
ecsec2Stack.addDependency(rdsStack);
