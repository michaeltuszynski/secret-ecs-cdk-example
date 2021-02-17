import { App, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2'

export class VPCStack extends Stack {
    readonly vpc: Vpc;

    constructor(scope: App, id: string, props: StackProps) {
        super(scope, id, props);

        const vpcName = scope.node.tryGetContext("vpcName");

        this.vpc = new Vpc(this, `${vpcName}`, {
            cidr: '10.0.0.0/16',
            maxAzs: 2
        })
    }
}