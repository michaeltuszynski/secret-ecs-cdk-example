import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSStack } from '../lib/ecs-stack';
import { config } from "dotenv";
config();

const app = new cdk.App();

const AWS_ACCOUNT = '588795091775';
const AWS_REGION = 'us-west-2';
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
    dbSecret: rdsStack.dbSecret.secretArn
});

rdsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);