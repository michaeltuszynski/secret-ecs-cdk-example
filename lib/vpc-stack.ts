import { App, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2'

export interface VPCStackProps extends StackProps {
    vpcName: string
}

export class VPCStack extends Stack {
    readonly vpc: Vpc;

    constructor(scope: App, id: string, props: VPCStackProps) {
        super(scope, id, props);

        this.vpc = new Vpc(this, `${props.vpcName}`, {
            cidr: '10.0.0.0/16',
            natGateways: 1
        });
    }

}