import { App, StackProps, Stack, CfnOutput, SecretValue } from "@aws-cdk/core";
import { DatabaseSecret, DatabaseInstance, DatabaseInstanceEngine, 
         PostgresEngineVersion, Credentials, StorageType
       } from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType, InstanceType, InstanceClass, InstanceSize } from '@aws-cdk/aws-ec2';
import { StringParameter, ParameterTier } from "@aws-cdk/aws-ssm";

export interface RDSStackProps extends StackProps {
    vpc: Vpc,
    dbName: string,
}

export class RDSStack extends Stack {

    readonly postgresRDSInstance: DatabaseInstance;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const databaseUsername = 'postgres';
        const port = 5432;
        const dbSecret = SecretValue.ssmSecure('DBPass', '1');   //NOTE: need to run cli before building stack to create this secret  - name must match

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
            credentials: Credentials.fromPassword(databaseUsername, dbSecret),  
            databaseName: props.dbName,
            port: port,
        });
        
        this.postgresRDSInstance.connections.allowFromAnyIpv4(Port.tcp(port));

        new CfnOutput(this, 'POSTGRES_URL', { value: this.postgresRDSInstance.dbInstanceEndpointAddress });

        const dbHost = new StringParameter(this, 'DBHost', {
            allowedPattern: '.*',
            description: 'DB Host from CDK Stack Creation',
            parameterName: 'DBHost',
            stringValue: this.postgresRDSInstance.dbInstanceEndpointAddress,
            tier: ParameterTier.STANDARD
        });

        const dbPort = new StringParameter(this, 'DBPort', {
            allowedPattern: '.*',
            description: 'DB Port from CDK Stack Creation',
            parameterName: 'DBPort',
            stringValue: this.postgresRDSInstance.dbInstanceEndpointPort,
            tier: ParameterTier.STANDARD
        });

        const dbName = new StringParameter(this, 'DBName', {
            allowedPattern: '.*',
            description: 'DB Name from CDK Stack Creation',
            parameterName: 'DBName',
            stringValue: props.dbName,
            tier: ParameterTier.STANDARD
        })

        const dbUsername = new StringParameter(this, 'DBUsername', {
            allowedPattern: '.*',
            description: 'DB Username from CDK Stack Creation',
            parameterName: 'DBUsername',
            stringValue: databaseUsername,
            tier: ParameterTier.STANDARD
        }) 
        

    }
}