import { App, StackProps, Stack, Duration, RemovalPolicy, CfnOutput } from "@aws-cdk/core";
import {
    DatabaseSecret, Credentials, ServerlessCluster, DatabaseClusterEngine, ParameterGroup, AuroraCapacityUnit
} from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType } from '@aws-cdk/aws-ec2';
import { Secret, SecretRotation, SecretRotationApplication } from '@aws-cdk/aws-secretsmanager';

export interface RDSStackProps extends StackProps {
    vpc: Vpc
}

export class RDSStack extends Stack {

    readonly dbSecret: DatabaseSecret;
    readonly mysqlRDSserverless: ServerlessCluster;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const dbUser = this.node.tryGetContext("dbUser");
        const dbName = this.node.tryGetContext("dbName");
        const dbPort = this.node.tryGetContext("dbPort") || 3306;

        this.dbSecret = new Secret(this, 'dbCredentialsSecret', {
            secretName: "ecsworkshop/test/todo-app/aurora-pg",
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: dbUser,
                }),
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: 'password'
            }
        });

        this.mysqlRDSserverless = new ServerlessCluster(this, 'mysqlRdsServerless', {
            engine: DatabaseClusterEngine.AURORA_MYSQL,
            parameterGroup: ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', 'default.aurora-mysql5.7'),
            vpc: props.vpc,
            enableDataApi: true,
            vpcSubnets: { subnetType: SubnetType.PRIVATE },
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

        this.mysqlRDSserverless.connections.allowFromAnyIpv4(Port.tcp(dbPort));

        new SecretRotation(
            this,
            `ecsworkshop/test/todo-app/aurora-pg`,
            {
                secret: this.dbSecret,
                application: SecretRotationApplication.MYSQL_ROTATION_SINGLE_USER,
                vpc: props.vpc,
                vpcSubnets: { subnetType: SubnetType.PRIVATE },
                target: this.mysqlRDSserverless,
                automaticallyAfter: Duration.days(30),
            }
        );

        new CfnOutput(this, 'SecretName', { value: this.dbSecret.secretName });
    }
}