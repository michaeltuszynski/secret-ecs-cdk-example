import * as cdk from "@aws-cdk/core";
import * as rds from '@aws-cdk/aws-rds';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface RDSStackProps extends cdk.StackProps {
    vpc: ec2.Vpc,
    dbName: string,
}

export class RDSStack extends cdk.Stack {

    readonly dbSecret: rds.DatabaseSecret;
    readonly postgresRDSInstance: rds.DatabaseInstance;

    constructor(scope: cdk.App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        this.dbSecret = new rds.DatabaseSecret(this, 'DbSecret', {
            username: 'postgres'
        });
       
        const databaseUsername = 'postgres';
        
        this.postgresRDSInstance = new rds.DatabaseInstance(this, 'Postgres-rds-instance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_12_4
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T2,
                ec2.InstanceSize.MICRO
            ),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            storageEncrypted: false, 
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: 25,
            storageType: rds.StorageType.GP2,
            deletionProtection: false,
            credentials: rds.Credentials.fromSecret(this.dbSecret,'postgres'),
            databaseName: props.dbName,
            port: 5432,
        });
        
        this.postgresRDSInstance.connections.allowFromAnyIpv4(ec2.Port.tcp(5432));

    }
}