import { App } from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSStack } from '../lib/ecs-stack';
import { config } from "dotenv";
config();

const app = new App();

const VPC_NAME = "DemoVPC123";
const DB_NAME = "tododb"

const vpcStack = new VPCStack(app, 'VPCStack', {
    vpcName: VPC_NAME
});

const rdsStack = new RDSStack(app, 'RDSStack', {
    vpc: vpcStack.vpc,
    dbName: DB_NAME
});

const ecsStack = new ECSStack(app, "ECSStack", {
    vpc: vpcStack.vpc,
    dbSecretArn: rdsStack.dbSecret.secretArn
});

rdsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);