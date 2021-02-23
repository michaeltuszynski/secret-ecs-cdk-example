import { App, StackProps, Stack, Duration, RemovalPolicy } from "@aws-cdk/core";
import {
    DatabaseSecret, Credentials, ServerlessCluster, DatabaseClusterEngine, ParameterGroup, AuroraCapacityUnit
} from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType } from '@aws-cdk/aws-ec2';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export interface RDSStackProps extends StackProps {
    vpc: Vpc
}

export class RDSStack extends Stack {

    readonly dbSecret: DatabaseSecret;
    readonly postgresRDSserverless: ServerlessCluster;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const dbUser = this.node.tryGetContext("dbUser");
        const dbName = this.node.tryGetContext("dbName");
        const dbPort = this.node.tryGetContext("dbPort");

        this.dbSecret = new Secret(this, 'DBCredentialsSecret', {
            secretName: "serverless-credentials",
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: dbUser,
                }),
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: 'password'
            }
        });

        this.postgresRDSserverless = new ServerlessCluster(this, 'Postgres-rds-serverless', {
            engine: DatabaseClusterEngine.AURORA_POSTGRESQL,
            parameterGroup: ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', 'default.aurora-postgresql10'),
            vpc: props.vpc,
            enableDataApi: true,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            credentials: Credentials.fromSecret(this.dbSecret, dbUser),
            scaling: {
                autoPause: Duration.minutes(10), // default is to pause after 5 minutes of idle time
                minCapacity: AuroraCapacityUnit.ACU_8, // default is 2 Aurora capacity units (ACUs)
                maxCapacity: AuroraCapacityUnit.ACU_32, // default is 16 Aurora capacity units (ACUs)
            },
            defaultDatabaseName: dbName,
            deletionProtection: false,
            removalPolicy: RemovalPolicy.DESTROY
        });

        this.postgresRDSserverless.connections.allowFromAnyIpv4(Port.tcp(dbPort));

    }
}
