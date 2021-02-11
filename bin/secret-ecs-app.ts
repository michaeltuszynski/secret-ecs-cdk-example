import { App } from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSEC2Stack } from '../lib/ecs-ec2-stack';
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

const ecsec2Stack = new ECSEC2Stack(app, "ECSEC2Stack", {
    vpc: vpcStack.vpc,
    dbSecretArn: rdsStack.dbSecret.secretArn
});

rdsStack.addDependency(vpcStack);
ecsec2Stack.addDependency(rdsStack);