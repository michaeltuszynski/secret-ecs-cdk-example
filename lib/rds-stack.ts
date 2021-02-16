import { App, StackProps, Stack, CfnOutput, SecretValue } from "@aws-cdk/core";
import {
    DatabaseInstance, DatabaseInstanceEngine,
    PostgresEngineVersion, Credentials, StorageType
} from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType, InstanceType } from '@aws-cdk/aws-ec2';
import { StringParameter, ParameterTier } from "@aws-cdk/aws-ssm";

export interface RDSStackProps extends StackProps {
    vpc: Vpc
}

export class RDSStack extends Stack {

    readonly postgresRDSInstance: DatabaseInstance;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const dbUser = this.node.tryGetContext("dbUser");
        const stackDBName = this.node.tryGetContext("dbName");
        const stackDBPort = this.node.tryGetContext("dbPort");
        const dbInstanceType = this.node.tryGetContext("instanceType");
        const dbPass = SecretValue.ssmSecure('DBPass', '1');   //NOTE: need to run cli before building stack to create this secret `aws ssm put-parameter --name "DBPass" --value "mySecurePassword123456" --type "SecureString"`

        this.postgresRDSInstance = new DatabaseInstance(this, 'Postgres-rds-instance', {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_12_4
            }),
            instanceType: new InstanceType(dbInstanceType),
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            storageEncrypted: false,
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: 25,
            storageType: StorageType.GP2,
            deletionProtection: false,
            credentials: Credentials.fromPassword(dbUser, dbPass),
            databaseName: stackDBName,
            port: stackDBPort,
        });

        this.postgresRDSInstance.connections.allowFromAnyIpv4(Port.tcp(stackDBPort));

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
            stringValue: stackDBName,
            tier: ParameterTier.STANDARD
        })

        const dbUsername = new StringParameter(this, 'DBUsername', {
            allowedPattern: '.*',
            description: 'DB Username from CDK Stack Creation',
            parameterName: 'DBUsername',
            stringValue: dbUser,
            tier: ParameterTier.STANDARD
        })


    }
}