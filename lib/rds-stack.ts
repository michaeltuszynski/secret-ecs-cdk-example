import { App, StackProps, Stack, CfnOutput } from "@aws-cdk/core";
import { DatabaseSecret, DatabaseInstance, DatabaseInstanceEngine, 
         PostgresEngineVersion, Credentials, StorageType
       } from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType, InstanceType, InstanceClass, InstanceSize } from '@aws-cdk/aws-ec2';

export interface RDSStackProps extends StackProps {
    vpc: Vpc,
    dbName: string,
}

export class RDSStack extends Stack {

    readonly dbSecret: DatabaseSecret;
    readonly postgresRDSInstance: DatabaseInstance;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const databaseUsername = 'postgres';
        const port = 5432;

        this.dbSecret = new DatabaseSecret(this, 'DbSecret', {
            username: databaseUsername
        });
       
        this.postgresRDSInstance = new DatabaseInstance(this, 'Postgres-rds-instance', {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_12_4
            }),
            instanceType: InstanceType.of(
                InstanceClass.T2,
                InstanceSize.MICRO
            ),
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            storageEncrypted: false, 
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: 25,
            storageType: StorageType.GP2,
            deletionProtection: false,
            credentials: Credentials.fromSecret(this.dbSecret,databaseUsername),
            databaseName: props.dbName,
            port: port,
        });
        
        this.postgresRDSInstance.connections.allowFromAnyIpv4(Port.tcp(port));

        new CfnOutput(this, 'POSTGRES_URL', { value: this.postgresRDSInstance.dbInstanceEndpointAddress });

    }
}